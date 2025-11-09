/**
 * Spotify API client with token refresh and rate limiting
 */
import type {
  SpotifyAuthTokens,
  SpotifyUser,
  SpotifyTrack,
  SpotifyAudioFeatures,
  SpotifyArtist,
  SpotifyPlaylist,
} from '../src/types';
import { getUserKV, setUserKV } from './storage';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com';

// Rate limiting: ~180 requests/min, we'll be conservative at 150/min
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 150;

let requestCount = 0;
let windowStart = Date.now();

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check and enforce rate limits
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  
  // Reset window if needed
  if (now - windowStart > RATE_LIMIT_WINDOW) {
    requestCount = 0;
    windowStart = now;
  }
  
  // If we're at the limit, wait
  if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
    const waitTime = RATE_LIMIT_WINDOW - (now - windowStart);
    console.log(`Rate limit reached, waiting ${waitTime}ms`);
    await sleep(waitTime);
    requestCount = 0;
    windowStart = Date.now();
  }
  
  requestCount++;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<SpotifyAuthTokens> {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<SpotifyAuthTokens> {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get valid access token for user (refresh if needed)
 */
async function getValidAccessToken(spotifyId: string): Promise<string> {
  const user = await getUserKV(spotifyId);
  if (!user) {
    throw new Error('User not found');
  }

  // For simplicity, always refresh (in production, cache with expiry)
  const tokens = await refreshAccessToken(user.refreshToken);
  
  // Update refresh token if it changed
  if (tokens.refresh_token && tokens.refresh_token !== user.refreshToken) {
    user.refreshToken = tokens.refresh_token;
    await setUserKV(spotifyId, user);
  }

  return tokens.access_token;
}

/**
 * Make a Spotify API request with retry and rate limiting
 */
async function spotifyRequest<T>(
  endpoint: string,
  spotifyId: string,
  options: RequestInit = {}
): Promise<T> {
  await enforceRateLimit();

  const accessToken = await getValidAccessToken(spotifyId);
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${SPOTIFY_API_BASE}${endpoint}`;

  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(
        response.headers.get('Retry-After') || '1',
        10
      );
      console.log(`Rate limited by Spotify, waiting ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      retries++;
      continue;
    }

    if (!response.ok) {
      throw new Error(
        `Spotify API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  throw new Error('Max retries exceeded');
}

// ============================================================================
// User Endpoints
// ============================================================================

export async function getCurrentUser(spotifyId: string): Promise<SpotifyUser> {
  return spotifyRequest<SpotifyUser>('/me', spotifyId);
}

// ============================================================================
// Track Endpoints
// ============================================================================

/**
 * Get multiple tracks (batched, max 50 per call)
 */
export async function getTracks(
  trackIds: string[],
  spotifyId: string
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  
  for (let i = 0; i < trackIds.length; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    const response = await spotifyRequest<{ tracks: SpotifyTrack[] }>(
      `/tracks?ids=${batch.join(',')}`,
      spotifyId
    );
    tracks.push(...response.tracks);
  }
  
  return tracks;
}

/**
 * Get audio features (batched, max 100 per call)
 */
export async function getAudioFeatures(
  trackIds: string[],
  spotifyId: string
): Promise<SpotifyAudioFeatures[]> {
  const features: SpotifyAudioFeatures[] = [];
  
  for (let i = 0; i < trackIds.length; i += 100) {
    const batch = trackIds.slice(i, i + 100);
    const response = await spotifyRequest<{
      audio_features: SpotifyAudioFeatures[];
    }>(`/audio-features?ids=${batch.join(',')}`, spotifyId);
    features.push(...response.audio_features.filter(Boolean));
  }
  
  return features;
}

/**
 * Get user's top tracks
 */
export async function getTopTracks(
  spotifyId: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 50
): Promise<SpotifyTrack[]> {
  const response = await spotifyRequest<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    spotifyId
  );
  return response.items;
}

/**
 * Get user's recently played tracks
 */
export async function getRecentlyPlayed(
  spotifyId: string,
  limit = 50
): Promise<SpotifyTrack[]> {
  const response = await spotifyRequest<{
    items: Array<{ track: SpotifyTrack }>;
  }>(`/me/player/recently-played?limit=${limit}`, spotifyId);
  return response.items.map((item) => item.track);
}

// ============================================================================
// Artist Endpoints
// ============================================================================

/**
 * Get multiple artists (batched, max 50 per call)
 */
export async function getArtists(
  artistIds: string[],
  spotifyId: string
): Promise<SpotifyArtist[]> {
  const artists: SpotifyArtist[] = [];
  
  for (let i = 0; i < artistIds.length; i += 50) {
    const batch = artistIds.slice(i, i + 50);
    const response = await spotifyRequest<{ artists: SpotifyArtist[] }>(
      `/artists?ids=${batch.join(',')}`,
      spotifyId
    );
    artists.push(...response.artists);
  }
  
  return artists;
}

/**
 * Get user's top artists
 */
export async function getTopArtists(
  spotifyId: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term',
  limit = 50
): Promise<SpotifyArtist[]> {
  const response = await spotifyRequest<{ items: SpotifyArtist[] }>(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    spotifyId
  );
  return response.items;
}

// ============================================================================
// Playlist Endpoints
// ============================================================================

/**
 * Get user's playlists
 */
export async function getUserPlaylists(
  spotifyId: string
): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = [];
  let url = '/me/playlists?limit=50';
  
  while (url) {
    const response = await spotifyRequest<{
      items: SpotifyPlaylist[];
      next: string | null;
    }>(url, spotifyId);
    
    playlists.push(...response.items);
    url = response.next || '';
  }
  
  return playlists;
}

/**
 * Get playlist tracks
 */
export async function getPlaylistTracks(
  playlistId: string,
  spotifyId: string
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let url = `/playlists/${playlistId}/tracks?limit=100`;
  
  while (url) {
    const response = await spotifyRequest<{
      items: Array<{ track: SpotifyTrack }>;
      next: string | null;
    }>(url, spotifyId);
    
    tracks.push(...response.items.map((item) => item.track));
    url = response.next || '';
  }
  
  return tracks;
}

/**
 * Create a new playlist
 */
export async function createPlaylist(
  spotifyId: string,
  name: string,
  description: string,
  isPublic = false
): Promise<SpotifyPlaylist> {
  return spotifyRequest<SpotifyPlaylist>(
    `/users/${spotifyId}/playlists`,
    spotifyId,
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        public: isPublic,
      }),
    }
  );
}

/**
 * Replace playlist tracks
 */
export async function replacePlaylistTracks(
  playlistId: string,
  trackUris: string[],
  spotifyId: string
): Promise<void> {
  // Spotify allows max 100 tracks per request
  const firstBatch = trackUris.slice(0, 100);
  
  // Replace with first batch
  await spotifyRequest(
    `/playlists/${playlistId}/tracks`,
    spotifyId,
    {
      method: 'PUT',
      body: JSON.stringify({ uris: firstBatch }),
    }
  );
  
  // Add remaining tracks
  for (let i = 100; i < trackUris.length; i += 100) {
    const batch = trackUris.slice(i, i + 100);
    await spotifyRequest(
      `/playlists/${playlistId}/tracks`,
      spotifyId,
      {
        method: 'POST',
        body: JSON.stringify({ uris: batch }),
      }
    );
  }
}

/**
 * Upload playlist cover image
 */
export async function uploadPlaylistCover(
  playlistId: string,
  imageBase64: string,
  spotifyId: string
): Promise<void> {
  await spotifyRequest(
    `/playlists/${playlistId}/images`,
    spotifyId,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: imageBase64,
    }
  );
}

// ============================================================================
// Recommendations Endpoint
// ============================================================================

export interface RecommendationParams {
  seed_tracks?: string[];
  seed_artists?: string[];
  seed_genres?: string[];
  limit?: number;
  target_acousticness?: number;
  target_danceability?: number;
  target_energy?: number;
  target_instrumentalness?: number;
  target_liveness?: number;
  target_loudness?: number;
  target_speechiness?: number;
  target_tempo?: number;
  target_valence?: number;
}

/**
 * Get recommendations
 */
export async function getRecommendations(
  params: RecommendationParams,
  spotifyId: string
): Promise<SpotifyTrack[]> {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, value.toString());
      }
    }
  });
  
  const response = await spotifyRequest<{ tracks: SpotifyTrack[] }>(
    `/recommendations?${queryParams.toString()}`,
    spotifyId
  );
  
  return response.tracks;
}

// ============================================================================
// Search Endpoint
// ============================================================================

/**
 * Search for tracks
 */
export async function searchTracks(
  query: string,
  spotifyId: string,
  limit = 20
): Promise<SpotifyTrack[]> {
  const response = await spotifyRequest<{
    tracks: { items: SpotifyTrack[] };
  }>(
    `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
    spotifyId
  );
  return response.tracks.items;
}

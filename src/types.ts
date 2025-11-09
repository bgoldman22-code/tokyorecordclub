/**
 * Shared types for Tokyo Record Club
 */

// ============================================================================
// Spotify API Types
// ============================================================================

export interface SpotifyAuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
  product: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: Array<{ id: string; name: string }>;
  artistId?: string; // Primary artist ID for convenience
  album: {
    id: string;
    name: string;
    release_date: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  releaseDate?: string; // Alias for album.release_date
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: Array<{ url: string }>;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: Array<{ url: string }>;
  tracks: {
    total: number;
    items: Array<{
      track: SpotifyTrack;
    }>;
  };
  owner: {
    id: string;
    display_name: string;
  };
}

// ============================================================================
// Application Types
// ============================================================================

export interface UserData {
  spotifyId: string;
  displayName: string;
  email: string;
  refreshToken: string;
  createdAt: number;
  lastRunAt?: number;
  settings: UserSettings;
}

export interface UserSettings {
  cadence: 'weekly' | 'biweekly' | 'monthly';
  continuity: number; // 0-1, percentage of tracks to keep on refresh
  blocklist: string[]; // track IDs to never recommend
  weeklyEnabled: boolean;
}

export interface SeedSelection {
  type: 'history' | 'playlists' | 'tracks';
  // For history type
  historyPeriod?: 'recent' | 'short_term' | 'medium_term' | 'long_term';
  // For playlists type
  playlistIds?: string[];
  // For tracks type
  trackIds?: string[];
}

export interface OnboardingAnswers {
  texture: string[];
  texture_custom: string;
  atmosphere: string[];
  atmosphere_custom: string;
  tempo: string[];
  tempo_custom: string;
  instrumentation: string[];
  instrumentation_custom: string;
  avoid: string[];
  avoid_custom: string;
}

export interface EmotionalGeometry {
  darkness_warmth: number; // -1 to 1 (dark to warm)
  intimate_expansive: number; // -1 to 1 (intimate to expansive)
  acoustic_electronic: number; // -1 to 1 (acoustic to electronic)
}

export interface ConversationTranscript {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export interface WorldDefinition {
  id?: string; // Job ID or unique identifier
  userId: string;
  createdAt: number;
  worldName: string;
  name?: string; // Alias for worldName
  description: string;
  
  // Taste vectors
  tasteCentroid: number[]; // PCA-reduced Spotify features
  semanticCentroid: number[]; // OpenAI text embedding centroid
  
  // Spotify feature ranges
  audioFeatureRanges: {
    valence: [number, number];
    energy: [number, number];
    acousticness: [number, number];
    tempo: [number, number];
    instrumentalness: [number, number];
    danceability: [number, number];
  };
  featureRanges?: {
    valence: [number, number];
    energy: [number, number];
    acousticness: [number, number];
    tempo: [number, number];
    instrumentalness: [number, number];
    danceability: [number, number];
  }; // Alias
  
  // Metadata
  topGenres: string[];
  topArtists: string[];
  seedTracks: string[];
  seedTrackIds?: string[]; // Alias for seedTracks
  
  // User inputs
  emotionalGeometry: EmotionalGeometry;
  keywords: string[];
  excludeKeywords: string[];
  conversationTranscript: ConversationTranscript;
  
  // Intersections
  intersections: IntersectionDefinition[];
  
  // Playlist mappings
  playlists: {
    [intersectionName: string]: {
      id: string; // Spotify playlist ID
      url: string;
    };
  };
}

export interface IntersectionDefinition {
  name: string;
  description: string;
  bias: {
    valence?: number;
    energy?: number;
    acousticness?: number;
    tempo?: number;
    instrumentalness?: number;
  };
  filter?: (track: EnrichedTrack) => boolean;
}

export interface EnrichedTrack extends SpotifyTrack {
  audioFeatures: SpotifyAudioFeatures;
  artistGenres: string[];
  genres?: string[]; // Alias for artistGenres
  primaryGenre: string;
  releaseYear: number;
  artist?: string; // Primary artist name for convenience
  semanticEmbedding?: number[];
  scores?: {
    semantic: number;
    spotify: number;
    novelty: number;
    diversity: number;
    final: number;
  };
}

export interface GenerationManifest {
  userId: string;
  timestamp: number;
  worldName: string;
  playlists: Array<{
    intersectionName: string;
    playlistId: string;
    playlistUrl: string;
    tracks: EnrichedTrack[];
  }>;
  candidates: {
    total: number;
    filtered: number;
    selected: number;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface BuildWorldRequest {
  seedSelection: SeedSelection;
  conversationTranscript: ConversationTranscript;
}

export interface BuildWorldResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface WorldStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  world?: WorldDefinition;
  error?: string;
}

export interface GeneratePlaylistsRequest {
  regenerateIntersection?: string; // If provided, only regenerate this one
}

export interface GeneratePlaylistsResponse {
  success: boolean;
  playlists: Array<{
    name: string;
    spotifyUrl: string;
    trackCount: number;
  }>;
}

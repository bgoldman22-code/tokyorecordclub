/**
 * Fetch seeds endpoint - Get user's listening history, playlists, or search tracks
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireAuth, errorResponse, successResponse } from './auth-helpers';
import {
  getTopTracks,
  getRecentlyPlayed,
  getUserPlaylists,
  getPlaylistTracks,
  searchTracks,
} from './spotify';
import type { SeedSelection } from '../src/types';

export const handler: Handler = async (event: HandlerEvent) => {
  // Require authentication
  const auth = await requireAuth(event);
  if ('statusCode' in auth) {
    return auth;
  }

  const { spotifyId } = auth;

  // Parse request body
  if (!event.body) {
    return errorResponse('Missing request body', 400);
  }

  try {
    const seedSelection: SeedSelection = JSON.parse(event.body);

    let tracks: any[] = [];

    // Handle different seed types
    switch (seedSelection.type) {
      case 'history':
        {
          const period = seedSelection.historyPeriod || 'medium_term';

          if (period === 'recent') {
            tracks = await getRecentlyPlayed(spotifyId, 50);
          } else {
            tracks = await getTopTracks(spotifyId, period, 50);
          }
        }
        break;

      case 'playlists':
        {
          if (!seedSelection.playlistIds || seedSelection.playlistIds.length === 0) {
            return errorResponse('No playlist IDs provided', 400);
          }

          // Fetch tracks from all selected playlists
          const allTracks = await Promise.all(
            seedSelection.playlistIds.map((playlistId) =>
              getPlaylistTracks(playlistId, spotifyId)
            )
          );

          // Flatten and deduplicate
          const trackMap = new Map();
          for (const playlistTracks of allTracks) {
            for (const track of playlistTracks) {
              if (track && track.id) {
                trackMap.set(track.id, track);
              }
            }
          }
          tracks = Array.from(trackMap.values());
        }
        break;

      case 'tracks':
        {
          if (!seedSelection.trackIds || seedSelection.trackIds.length === 0) {
            return errorResponse('No track IDs provided', 400);
          }

          // Track IDs are already provided
          tracks = seedSelection.trackIds.map((id) => ({ id }));
        }
        break;

      default:
        return errorResponse('Invalid seed type', 400);
    }

    // Return track IDs and basic info
    return successResponse({
      trackIds: tracks.map((t) => t.id).filter(Boolean),
      trackCount: tracks.length,
      type: seedSelection.type,
    });
  } catch (error) {
    console.error('Error fetching seeds:', error);
    return errorResponse('Failed to fetch seeds');
  }
};

/**
 * Get user playlists endpoint (for playlist selector)
 */
export const playlistsHandler: Handler = async (event: HandlerEvent) => {
  const auth = await requireAuth(event);
  if ('statusCode' in auth) {
    return auth;
  }

  const { spotifyId } = auth;

  try {
    const playlists = await getUserPlaylists(spotifyId);

    // Return simplified playlist data
    return successResponse({
      playlists: playlists.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        trackCount: p.tracks.total,
        image: p.images[0]?.url || null,
        owner: p.owner.display_name,
      })),
    });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return errorResponse('Failed to fetch playlists');
  }
};

/**
 * Search tracks endpoint (for individual track selection)
 */
export const searchHandler: Handler = async (event: HandlerEvent) => {
  const auth = await requireAuth(event);
  if ('statusCode' in auth) {
    return auth;
  }

  const { spotifyId } = auth;
  const { q } = event.queryStringParameters || {};

  if (!q) {
    return errorResponse('Missing search query', 400);
  }

  try {
    const tracks = await searchTracks(q, spotifyId, 20);

    return successResponse({
      tracks: tracks.map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artists[0]?.name || 'Unknown',
        album: t.album.name,
        image: t.album.images[0]?.url || null,
        preview_url: t.preview_url,
      })),
    });
  } catch (error) {
    console.error('Error searching tracks:', error);
    return errorResponse('Failed to search tracks');
  }
};

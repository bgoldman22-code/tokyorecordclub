/**
 * Search tracks endpoint (for individual track selection)
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireAuth, errorResponse, successResponse } from './auth-helpers';
import { searchTracks } from './spotify';

export const handler: Handler = async (event: HandlerEvent) => {
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

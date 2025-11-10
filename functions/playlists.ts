/**
 * Get user playlists endpoint (for playlist selector)
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireAuth, errorResponse, successResponse } from './auth-helpers';
import { getUserPlaylists } from './spotify';

export const handler: Handler = async (event: HandlerEvent) => {
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

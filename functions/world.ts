/**
 * Get world endpoint - Return user's current world definition
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireAuth, errorResponse, successResponse } from './auth-helpers';
import { getWorldBlob } from './storage';

export const handler: Handler = async (event: HandlerEvent) => {
  const auth = await requireAuth(event);
  if ('statusCode' in auth) {
    return auth;
  }

  const { spotifyId } = auth;

  try {
    const world = await getWorldBlob(spotifyId);

    if (!world) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'No world found' }),
      };
    }

    return successResponse(world);
  } catch (error) {
    console.error('Error fetching world:', error);
    return errorResponse('Failed to fetch world');
  }
};

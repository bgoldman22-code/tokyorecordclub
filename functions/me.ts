/**
 * Get current user endpoint
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireAuth, errorResponse, successResponse } from './auth-helpers';

export const handler: Handler = async (event: HandlerEvent) => {
  // Require authentication
  const auth = await requireAuth(event);
  if ('statusCode' in auth) {
    return auth; // Return 401 error
  }

  const { user, spotifyId } = auth;

  try {
    return successResponse({
      spotifyId,
      displayName: user.displayName,
      email: user.email,
      createdAt: user.createdAt,
      lastRunAt: user.lastRunAt,
      settings: user.settings,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return errorResponse('Failed to fetch user data');
  }
};

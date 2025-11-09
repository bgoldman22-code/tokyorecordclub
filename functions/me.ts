/**
 * Get current user endpoint
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { requireAuth } from './auth-helpers';

export const handler: Handler = async (event: HandlerEvent) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Require authentication
  const auth = await requireAuth(event);
  if ('statusCode' in auth) {
    return {
      ...auth,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    };
  }

  const { user, spotifyId } = auth;

  try {
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        spotifyId,
        displayName: user.displayName,
        email: user.email,
        createdAt: user.createdAt,
        lastRunAt: user.lastRunAt,
        settings: user.settings,
      }),
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Failed to fetch user data' }),
    };
  }
};

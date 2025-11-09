/**
 * Authentication middleware and helpers
 */
import type { HandlerEvent } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { getUserKV } from './storage';
import type { UserData } from '../src/types';

interface SessionPayload {
  spotifyId: string;
  exp: number;
}

/**
 * Extract and verify session from request
 */
export async function getSession(
  event: HandlerEvent
): Promise<{ user: UserData; spotifyId: string } | null> {
  try {
    const cookies = parse(event.headers.cookie || '');
    const sessionToken = cookies.session;

    if (!sessionToken) {
      return null;
    }

    // Verify JWT
    const decoded = jwt.verify(
      sessionToken,
      process.env.SESSION_SECRET!
    ) as SessionPayload;

    // Get user from KV
    const user = await getUserKV(decoded.spotifyId);
    if (!user) {
      return null;
    }

    return {
      user,
      spotifyId: decoded.spotifyId,
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}

/**
 * Require authentication - returns 401 if not authenticated
 */
export async function requireAuth(event: HandlerEvent) {
  const session = await getSession(event);

  if (!session) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  return session;
}

/**
 * Alias for getSession - for backward compatibility
 */
export async function getUserFromRequest(event: HandlerEvent) {
  return getSession(event);
}

/**
 * Create error response
 */
export function errorResponse(message: string, statusCode = 500) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error: message }),
  };
}

/**
 * Create success response
 */
export function successResponse(data: any, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  };
}

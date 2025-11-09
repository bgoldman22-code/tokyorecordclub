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
): Promise<{ user: UserData; spotifyId: string; accessToken?: string } | null> {
  try {
    const cookieHeader = event.headers.cookie || '';
    console.log('Cookie header:', cookieHeader ? 'present' : 'missing');
    
    const cookies = parse(cookieHeader);
    const sessionToken = cookies.session;

    if (!sessionToken) {
      console.log('No session token found in cookies');
      return null;
    }

    console.log('Session token found, verifying...');

    // Verify JWT
    const decoded = jwt.verify(
      sessionToken,
      process.env.SESSION_SECRET!
    ) as SessionPayload;

    console.log('JWT verified for user:', decoded.spotifyId);

    // Get user from KV
    const user = await getUserKV(decoded.spotifyId);
    if (!user) {
      console.log('User not found in KV:', decoded.spotifyId);
      return null;
    }

    console.log('User found in KV:', decoded.spotifyId);

    return {
      user,
      spotifyId: decoded.spotifyId,
      accessToken: user.refreshToken, // Can be used to get fresh access token
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

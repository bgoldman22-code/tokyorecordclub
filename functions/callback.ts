/**
 * Spotify OAuth Callback - Exchange code for tokens
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { exchangeCodeForTokens } from './spotify';
import { setUserKV } from './storage';
import type { UserData } from '../src/types';

export const handler: Handler = async (event: HandlerEvent, context) => {
  const code = event.queryStringParameters?.code;
  const error = event.queryStringParameters?.error;
  // const state = event.queryStringParameters?.state; // Can use for CSRF later

  // Handle authorization errors
  if (error) {
    return {
      statusCode: 302,
      headers: {
        Location: `/?error=${encodeURIComponent(error)}`,
        'Cache-Control': 'no-cache',
      } as { [key: string]: string },
      body: '',
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing authorization code' }),
    };
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user profile
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const spotifyUser = await userResponse.json();

    // Create user data
    const userData: UserData = {
      spotifyId: spotifyUser.id,
      displayName: spotifyUser.display_name || spotifyUser.id,
      email: spotifyUser.email,
      refreshToken: tokens.refresh_token!,
      createdAt: Date.now(),
      settings: {
        cadence: 'weekly',
        continuity: 0.3,
        blocklist: [],
        weeklyEnabled: true,
      },
    };

    // Store user in KV
    await setUserKV(spotifyUser.id, userData, context);

    // Create session JWT
    const sessionToken = jwt.sign(
      {
        spotifyId: spotifyUser.id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
      },
      process.env.SESSION_SECRET!
    );

    // Set secure HTTP-only cookie
    const cookie = serialize('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return {
      statusCode: 302,
      headers: {
        Location: '/seeds',
        'Set-Cookie': cookie,
        'Cache-Control': 'no-cache',
      },
      body: '',
    };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

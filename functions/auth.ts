/**
 * Spotify OAuth - Start authorization flow
 */
import type { Handler } from '@netlify/functions';

const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
  'ugc-image-upload',
].join(' ');

export const handler: Handler = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Spotify configuration' }),
    };
  }

  // Generate random state for CSRF protection
  const state = Math.random().toString(36).substring(7);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', SPOTIFY_SCOPES);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('show_dialog', 'false');

  return {
    statusCode: 302,
    headers: {
      Location: authUrl.toString(),
      'Cache-Control': 'no-cache',
    },
    body: '',
  };
};

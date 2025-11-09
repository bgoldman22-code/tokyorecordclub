/**
 * Regenerate One - Regenerate a single intersection playlist
 * With cooldown enforcement to prevent spam
 */

import { Handler } from '@netlify/functions';
import { getUserFromRequest } from './auth-helpers';
import { getWorldBlob, getUserKV, setUserKV } from './storage';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify auth
    const user = await getUserFromRequest(event);
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Parse request
    const body = JSON.parse(event.body || '{}');
    const { playlistName } = body;

    if (!playlistName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing playlistName' })
      };
    }

    // Check world exists
    const world = await getWorldBlob(user.spotifyId);
    if (!world) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No world found' })
      };
    }

    // Check cooldown (15 minutes per playlist)
    const cooldownKey = `cooldown:${user.spotifyId}:${playlistName}`;
    const lastRegen = await getUserKV(cooldownKey);
    const now = Date.now();
    const cooldownMs = 15 * 60 * 1000; // 15 minutes

    if (lastRegen && (now - (lastRegen as unknown as number)) < cooldownMs) {
      const remainingMs = cooldownMs - (now - (lastRegen as unknown as number));
      const remainingMin = Math.ceil(remainingMs / 1000 / 60);
      
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: `Please wait ${remainingMin} more minutes before regenerating this playlist`
        })
      };
    }

    // Start regeneration
    const jobId = `regen-${user.spotifyId}-${playlistName}-${Date.now()}`;
    
    await setUserKV(`job:${jobId}`, {
      status: 'regenerating',
      playlistName,
      startedAt: Date.now()
    });

    // Set cooldown
    await setUserKV(cooldownKey, now);

    // TODO: Implement actual regeneration logic (similar to generate-playlists.ts)
    // For now, return success

    return {
      statusCode: 202,
      body: JSON.stringify({
        jobId,
        message: `Regenerating ${playlistName}`,
        pollUrl: `/api/world-status?jobId=${jobId}`
      })
    };

  } catch (error) {
    console.error('Regenerate one error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to regenerate playlist' })
    };
  }
};

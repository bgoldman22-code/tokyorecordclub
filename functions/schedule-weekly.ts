/**
 * Scheduled Weekly Refresh - Runs every Monday at 3pm UTC
 * Refreshes all active users' playlists with continuity logic
 * 
 * Configured in netlify.toml:
 * [functions."schedule-weekly"]
 * schedule = "0 15 * * 1"
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { getAllActiveUsers, getWorldBlob, getUserKV, setUserKV } from './storage';
import { getRecentlyPlayed, refreshAccessToken } from './spotify';

interface ScheduledEvent extends HandlerEvent {
  isScheduled?: boolean;
}

export const handler: Handler = async (event: ScheduledEvent) => {
  // Verify this is a scheduled invocation
  if (!event.isScheduled && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'This function can only be triggered by Netlify scheduled functions or POST for testing'
    };
  }

  console.log('[Scheduled Weekly] Starting weekly refresh job');

  try {
    // Get all active users
    const users = await getAllActiveUsers();
    console.log(`[Scheduled Weekly] Found ${users.length} active users`);

    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of users) {
      try {
        await refreshUserWorld(user);
        successCount++;
      } catch (error) {
        console.error(`[Scheduled Weekly] Error for user ${user.spotifyId}:`, error);
        errorCount++;
      }
    }

    console.log(`[Scheduled Weekly] Complete. Success: ${successCount}, Errors: ${errorCount}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Weekly refresh complete',
        processed: users.length,
        success: successCount,
        errors: errorCount
      })
    };

  } catch (error) {
    console.error('[Scheduled Weekly] Fatal error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Weekly refresh failed' })
    };
  }
};

/**
 * Refresh a single user's world
 */
async function refreshUserWorld(user: any): Promise<void> {
  console.log(`[Scheduled Weekly] Refreshing user ${user.spotifyId}`);

  // Get user settings
  const userData = await getUserKV(`user:${user.spotifyId}`);
  if (!userData) {
    console.log(`[Scheduled Weekly] No user data for ${user.spotifyId}, skipping`);
    return;
  }

  // Check if user has opted out of weekly refreshes
  const settings = (userData as any).settings;
  if (settings?.cadence === 'manual') {
    console.log(`[Scheduled Weekly] User ${user.spotifyId} has manual cadence, skipping`);
    return;
  }

  // Refresh access token if needed
  let accessToken = user.accessToken;
  if (user.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(user.refreshToken);
      accessToken = refreshed.access_token;
      
      // Update stored token
      await setUserKV(`user:${user.spotifyId}`, {
        ...userData,
        accessToken,
        tokenRefreshedAt: Date.now()
      } as any);
    } catch (error) {
      console.error(`[Scheduled Weekly] Failed to refresh token for ${user.spotifyId}:`, error);
      return;
    }
  }

  // Load world
  const world = await getWorldBlob(user.spotifyId);
  if (!world) {
    console.log(`[Scheduled Weekly] No world for ${user.spotifyId}, skipping`);
    return;
  }

  // Get recent listening history (last 50 tracks)
  try {
    const recents = await getRecentlyPlayed(accessToken, 50);
    console.log(`[Scheduled Weekly] User ${user.spotifyId}: ${recents.length} recent tracks`);

    // TODO: Implement world refresh with decay
    // - Combine old seeds (80% weight) with new recents (20% weight)
    // - Rebuild world definition
    // - Regenerate playlists with continuity (keep 30% of tracks)

    // For now, just log
    console.log(`[Scheduled Weekly] Would refresh world for ${user.spotifyId}`);

    // Update last refresh time
    await setUserKV(`user:${user.spotifyId}`, {
      ...userData,
      lastWeeklyRefresh: Date.now()
    } as any);

  } catch (error) {
    console.error(`[Scheduled Weekly] Failed to fetch recents for ${user.spotifyId}:`, error);
    throw error;
  }
}

/**
 * Test handler (for manual testing via POST)
 */
export async function testHandler() {
  return handler({
    isScheduled: true,
    httpMethod: 'POST',
    headers: {},
    body: null,
    isBase64Encoded: false
  } as ScheduledEvent);
}

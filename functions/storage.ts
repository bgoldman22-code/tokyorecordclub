/**
 * Storage helpers for Netlify KV and Blob
 */
import { getStore } from '@netlify/blobs';
import type { UserData, WorldDefinition, GenerationManifest } from '../src/types';

const KV_STORE_NAME = 'tokyo-record-club';

/**
 * Helper to get a configured store
 */
function getConfiguredStore(name: string) {
  // In Netlify production, these environment variables are automatically available
  // SITE_ID is a reserved Netlify variable
  // For Blobs to work, the site needs to have Blobs enabled (automatic on most plans)
  try {
    return getStore(name);
  } catch (error) {
    console.error(`Failed to get store "${name}":`, error);
    throw new Error(`Netlify Blobs not available. Ensure your site has Blobs enabled.`);
  }
}

// ============================================================================
// KV Helpers (Fast lookups, <1GB)
// ============================================================================

/**
 * Get user data from KV
 */
export async function getUserKV(spotifyId: string): Promise<UserData | null> {
  try {
    const store = getConfiguredStore(KV_STORE_NAME);
    const data = await store.get(`user:${spotifyId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user from KV:', error);
    return null;
  }
}

/**
 * Set user data in KV
 */
export async function setUserKV(key: string, data: any): Promise<void> {
  try {
    const store = getConfiguredStore(KV_STORE_NAME);
    await store.set(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error setting data in KV:', error);
    throw error;
  }
}

/**
 * Get all active users (for scheduled job)
 */
export async function getAllActiveUsers(): Promise<UserData[]> {
  try {
    const store = getConfiguredStore(KV_STORE_NAME);
    const keys = await store.list({ prefix: 'user:' });
    
    const users: UserData[] = [];
    for (const key of keys.blobs) {
      const data = await store.get(key.key);
      if (data) {
        const user = JSON.parse(data) as UserData;
        if (user.settings.weeklyEnabled) {
          users.push(user);
        }
      }
    }
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

/**
 * Get last regeneration timestamp for an intersection
 */
export async function getLastRegenTime(
  spotifyId: string,
  intersectionName: string
): Promise<number | null> {
  try {
    const store = getConfiguredStore(KV_STORE_NAME);
    const data = await store.get(`user:${spotifyId}:lastRegen:${intersectionName}`);
    return data ? parseInt(data, 10) : null;
  } catch (error) {
    console.error('Error getting last regen time:', error);
    return null;
  }
}

/**
 * Set last regeneration timestamp
 */
export async function setLastRegenTime(
  spotifyId: string,
  intersectionName: string,
  timestamp: number
): Promise<void> {
  try {
    const store = getConfiguredStore(KV_STORE_NAME);
    await store.set(
      `user:${spotifyId}:lastRegen:${intersectionName}`,
      timestamp.toString()
    );
  } catch (error) {
    console.error('Error setting last regen time:', error);
    throw error;
  }
}

// ============================================================================
// Blob Helpers (Larger data, <1GB)
// ============================================================================

/**
 * Put world definition in Blob
 */
export async function putWorldBlob(
  userId: string,
  world: WorldDefinition
): Promise<void> {
  try {
    const store = getConfiguredStore('worlds');
    await store.set(`users/${userId}/world.json`, JSON.stringify(world), {
      metadata: { userId, createdAt: world.createdAt.toString() },
    });
  } catch (error) {
    console.error('Error putting world blob:', error);
    throw error;
  }
}

/**
 * Get world definition from Blob
 */
export async function getWorldBlob(
  userId: string
): Promise<WorldDefinition | null> {
  try {
    const store = getConfiguredStore('worlds');
    const data = await store.get(`users/${userId}/world.json`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting world blob:', error);
    return null;
  }
}

/**
 * Put generation manifest in Blob
 */
export async function putManifestBlob(
  userId: string,
  manifest: GenerationManifest
): Promise<void> {
  try {
    const store = getConfiguredStore('manifests');
    await store.set(
      `users/${userId}/runs/${manifest.timestamp}.json`,
      JSON.stringify(manifest),
      {
        metadata: {
          userId,
          timestamp: manifest.timestamp.toString(),
          worldName: manifest.worldName,
        },
      }
    );
  } catch (error) {
    console.error('Error putting manifest blob:', error);
    throw error;
  }
}

/**
 * Cache Spotify track data (24hr TTL)
 */
export async function cacheTrackData(
  trackId: string,
  data: any
): Promise<void> {
  try {
    const store = getConfiguredStore('cache');
    await store.set(`tracks/${trackId}.json`, JSON.stringify(data), {
      metadata: { cachedAt: Date.now().toString(), ttl: '86400' },
    });
  } catch (error) {
    console.error('Error caching track data:', error);
    // Non-critical, don't throw
  }
}

/**
 * Get cached track data
 */
export async function getCachedTrackData(trackId: string): Promise<any | null> {
  try {
    const store = getConfiguredStore('cache');
    const blob = await store.getWithMetadata(`tracks/${trackId}.json`);
    
    if (!blob || !blob.data) return null;
    
    // Check TTL
    const cachedAt = parseInt((blob.metadata?.cachedAt as string) || '0', 10);
    const ttl = parseInt((blob.metadata?.ttl as string) || '86400', 10);
    const now = Date.now();
    
    if (now - cachedAt > ttl * 1000) {
      // Expired
      return null;
    }
    
    return JSON.parse(blob.data);
  } catch (error) {
    console.error('Error getting cached track data:', error);
    return null;
  }
}

/**
 * Cache audio embeddings (forever - never change)
 */
export async function cacheAudioEmbedding(
  trackId: string,
  embedding: number[]
): Promise<void> {
  try {
    const store = getConfiguredStore('embeddings');
    await store.set(`audio/${trackId}.json`, JSON.stringify(embedding), {
      metadata: { trackId, type: 'audio' },
    });
  } catch (error) {
    console.error('Error caching audio embedding:', error);
  }
}

/**
 * Get cached audio embedding
 */
export async function getCachedAudioEmbedding(
  trackId: string
): Promise<number[] | null> {
  try {
    const store = getConfiguredStore('embeddings');
    const data = await store.get(`audio/${trackId}.json`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached audio embedding:', error);
    return null;
  }
}

/**
 * Cache text embeddings (forever - never change)
 */
export async function cacheTextEmbedding(
  trackId: string,
  embedding: number[]
): Promise<void> {
  try {
    const store = getConfiguredStore('embeddings');
    await store.set(`text/${trackId}.json`, JSON.stringify(embedding), {
      metadata: { trackId, type: 'text' },
    });
  } catch (error) {
    console.error('Error caching text embedding:', error);
  }
}

/**
 * Get cached text embedding
 */
export async function getCachedTextEmbedding(
  trackId: string
): Promise<number[] | null> {
  try {
    const store = getConfiguredStore('embeddings');
    const data = await store.get(`text/${trackId}.json`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached text embedding:', error);
    return null;
  }
}

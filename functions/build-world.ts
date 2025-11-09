/**
 * Build World - Async world building function
 * 
 * Takes user seeds + onboarding answers → builds a complete "world" definition
 * Hybrid approach: Spotify features + OpenAI embeddings + GPT-4 world extraction
 */

import { Handler } from '@netlify/functions';
import { getUserFromRequest } from './auth-helpers';
import { getTracks, getAudioFeatures, getArtists } from './spotify';
import { getUserKV, setUserKV, putWorldBlob, cacheTrackData, getCachedTrackData } from './storage';
import { generateEmbeddings, extractWorldDefinition } from './openai-client';
import { 
  pca, 
  computeCentroid, 
  audioFeaturesToVector, 
  computeFeatureRanges, 
  inferStyle 
} from './math-utils';
import { formatAnswersForGPT } from './onboarding-questions';
import type { 
  SpotifyTrack, 
  SpotifyAudioFeatures, 
  WorldDefinition, 
  EnrichedTrack,
  OnboardingAnswers 
} from '../src/types';

interface BuildWorldRequest {
  seedTrackIds: string[];
  onboardingAnswers: OnboardingAnswers;
}

/**
 * Main world building handler
 */
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
    const body = JSON.parse(event.body || '{}') as BuildWorldRequest;
    const { seedTrackIds, onboardingAnswers } = body;

    if (!seedTrackIds?.length || !onboardingAnswers) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing seedTrackIds or onboardingAnswers' })
      };
    }

    // Start async world building
    const jobId = `world-${user.spotifyId}-${Date.now()}`;
    
    // Store job status in KV
    await setUserKV(`job:${jobId}`, {
      status: 'building',
      startedAt: Date.now(),
      progress: 0
    });

    // Build world asynchronously (don't await - return immediately)
    buildWorldAsync(user.spotifyId, user.accessToken, seedTrackIds, onboardingAnswers, jobId)
      .catch(error => {
        console.error('World building failed:', error);
        setUserKV(`job:${jobId}`, {
          status: 'failed',
          error: error.message,
          failedAt: Date.now()
        });
      });

    return {
      statusCode: 202, // Accepted
      body: JSON.stringify({ 
        jobId,
        message: 'World building started',
        pollUrl: `/api/world-status?jobId=${jobId}`
      })
    };

  } catch (error) {
    console.error('Build world error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to start world building' })
    };
  }
};

/**
 * Async world building workflow
 */
async function buildWorldAsync(
  userId: string,
  accessToken: string,
  seedTrackIds: string[],
  answers: OnboardingAnswers,
  jobId: string
): Promise<void> {
  
  console.log(`[${jobId}] Starting world build for user ${userId} with ${seedTrackIds.length} seeds`);

  // Step 1: Fetch seed tracks (with caching)
  await updateProgress(jobId, 10, 'Fetching seed tracks...');
  const seedTracks = await fetchSeedTracks(accessToken, seedTrackIds);

  // Step 2: Get audio features (with caching)
  await updateProgress(jobId, 25, 'Analyzing audio features...');
  const audioFeatures = await fetchAudioFeatures(accessToken, seedTrackIds);

  // Step 3: Get artist data for genres
  await updateProgress(jobId, 35, 'Fetching artist genres...');
  const artistIds = [...new Set(seedTracks.map(t => t.artistId))];
  const artists = await getArtists(accessToken, artistIds);
  const artistGenres = new Map(artists.map(a => [a.id, a.genres]));

  // Step 4: Enrich tracks with metadata
  await updateProgress(jobId, 45, 'Enriching track data...');
  const enrichedTracks: EnrichedTrack[] = seedTracks.map((track, i) => ({
    ...track,
    audioFeatures: audioFeatures[i],
    genres: artistGenres.get(track.artistId) || [],
    releaseYear: new Date(track.releaseDate).getFullYear()
  }));

  // Step 5: Compute taste centroid with PCA
  await updateProgress(jobId, 55, 'Computing taste vector...');
  const featureVectors = audioFeatures.map(f => audioFeaturesToVector(f));
  const tasteCentroid = computeCentroid(featureVectors);
  const pcaComponents = pca(featureVectors, 8); // Reduce to 8 dimensions
  const featureRanges = computeFeatureRanges(audioFeatures);

  // Step 6: Generate text embeddings for semantic understanding
  await updateProgress(jobId, 65, 'Generating semantic embeddings...');
  const descriptions = enrichedTracks.map(track => 
    `${track.artist} - ${track.name}. Album: ${track.album}. ` +
    `Genres: ${track.genres.join(', ')}. Year: ${track.releaseYear}. ` +
    `Style: ${inferStyle(track.audioFeatures)}`
  );
  
  const embeddings = await generateEmbeddings(descriptions);
  const semanticCentroid = computeCentroid(embeddings);

  // Step 7: Extract world definition with GPT-4
  await updateProgress(jobId, 80, 'Extracting world definition...');
  const conversationTranscript = formatAnswersForGPT(answers);
  const topGenres = extractTopGenres(enrichedTracks, 10);
  const avgFeatures = computeAverageFeatures(audioFeatures);

  const worldDef = await extractWorldDefinition({
    conversationTranscript,
    tasteCentroid: avgFeatures,
    topGenres,
    keywords: answers.customKeywords || []
  });

  // Step 8: Build final world object
  await updateProgress(jobId, 90, 'Finalizing world...');
  const world: WorldDefinition = {
    id: `world-${userId}-${Date.now()}`,
    userId,
    name: worldDef.world_name,
    description: worldDef.description,
    createdAt: Date.now(),
    
    // Seed tracks
    seedTracks: enrichedTracks,
    seedTrackIds,
    
    // Feature space
    tasteCentroid,
    pcaComponents,
    featureRanges,
    
    // Semantic space
    semanticCentroid,
    trackEmbeddings: embeddings,
    
    // Emotional geometry (from GPT-4)
    emotionalGeometry: worldDef.emotional_geometry,
    keywords: worldDef.keywords,
    excludeKeywords: worldDef.exclude_keywords,
    
    // Genre/era constraints
    topGenres,
    eraDistribution: computeEraDistribution(enrichedTracks),
    
    // Intersection definitions
    intersections: worldDef.intersections.map(intersection => ({
      name: intersection.name,
      description: intersection.bias,
      bias: parseIntersectionBias(intersection.bias, avgFeatures)
    })),
    
    // Onboarding context (for future refinement)
    onboardingAnswers: answers
  };

  // Step 9: Save to Blob storage
  await updateProgress(jobId, 95, 'Saving world...');
  await putWorldBlob(userId, world);

  // Step 10: Update user record in KV
  await setUserKV(`user:${userId}`, {
    hasWorld: true,
    worldId: world.id,
    worldCreatedAt: world.createdAt,
    lastUpdated: Date.now()
  });

  // Mark job complete
  await updateProgress(jobId, 100, 'Complete!');
  await setUserKV(`job:${jobId}`, {
    status: 'complete',
    worldId: world.id,
    completedAt: Date.now()
  });

  console.log(`[${jobId}] World building complete: ${world.name}`);
}

/**
 * Fetch seed tracks with caching
 */
async function fetchSeedTracks(
  accessToken: string,
  trackIds: string[]
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  const uncachedIds: string[] = [];

  // Check cache first
  for (const id of trackIds) {
    const cached = await getCachedTrackData(id);
    if (cached) {
      tracks.push(cached);
    } else {
      uncachedIds.push(id);
    }
  }

  // Fetch uncached tracks
  if (uncachedIds.length > 0) {
    const fetched = await getTracks(accessToken, uncachedIds);
    tracks.push(...fetched);

    // Cache them
    for (const track of fetched) {
      await cacheTrackData(track.id, track);
    }
  }

  return tracks;
}

/**
 * Fetch audio features with caching
 */
async function fetchAudioFeatures(
  accessToken: string,
  trackIds: string[]
): Promise<SpotifyAudioFeatures[]> {
  // Audio features are cached as part of track data
  return await getAudioFeatures(accessToken, trackIds);
}

/**
 * Extract top N genres from tracks
 */
function extractTopGenres(tracks: EnrichedTrack[], limit: number): string[] {
  const genreCounts = new Map<string, number>();

  for (const track of tracks) {
    for (const genre of track.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    }
  }

  return Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre]) => genre);
}

/**
 * Compute average audio features
 */
function computeAverageFeatures(features: SpotifyAudioFeatures[]): SpotifyAudioFeatures {
  const avg = {
    acousticness: 0,
    danceability: 0,
    energy: 0,
    instrumentalness: 0,
    liveness: 0,
    loudness: 0,
    speechiness: 0,
    valence: 0,
    tempo: 0
  };

  for (const f of features) {
    avg.acousticness += f.acousticness;
    avg.danceability += f.danceability;
    avg.energy += f.energy;
    avg.instrumentalness += f.instrumentalness;
    avg.liveness += f.liveness;
    avg.loudness += f.loudness;
    avg.speechiness += f.speechiness;
    avg.valence += f.valence;
    avg.tempo += f.tempo;
  }

  const count = features.length;
  return {
    acousticness: avg.acousticness / count,
    danceability: avg.danceability / count,
    energy: avg.energy / count,
    instrumentalness: avg.instrumentalness / count,
    liveness: avg.liveness / count,
    loudness: avg.loudness / count,
    speechiness: avg.speechiness / count,
    valence: avg.valence / count,
    tempo: avg.tempo / count
  };
}

/**
 * Compute era distribution (decades)
 */
function computeEraDistribution(tracks: EnrichedTrack[]): Record<string, number> {
  const eraCounts: Record<string, number> = {};

  for (const track of tracks) {
    const decade = Math.floor(track.releaseYear / 10) * 10;
    const era = `${decade}s`;
    eraCounts[era] = (eraCounts[era] || 0) + 1;
  }

  return eraCounts;
}

/**
 * Parse intersection bias from GPT-4 description
 * (Simple heuristic - can be enhanced with GPT-4 if needed)
 */
function parseIntersectionBias(
  description: string,
  baseline: SpotifyAudioFeatures
): Partial<SpotifyAudioFeatures> {
  const bias: Partial<SpotifyAudioFeatures> = {};
  const lower = description.toLowerCase();

  // Valence
  if (lower.includes('darker') || lower.includes('melanchol')) {
    bias.valence = baseline.valence - 0.15;
  } else if (lower.includes('brighter') || lower.includes('uplifting')) {
    bias.valence = baseline.valence + 0.15;
  }

  // Energy
  if (lower.includes('slower') || lower.includes('calm')) {
    bias.energy = baseline.energy - 0.15;
  } else if (lower.includes('energetic') || lower.includes('driving')) {
    bias.energy = baseline.energy + 0.15;
  }

  // Tempo
  if (lower.includes('slower')) {
    bias.tempo = baseline.tempo - 10;
  } else if (lower.includes('faster')) {
    bias.tempo = baseline.tempo + 10;
  }

  // Acousticness
  if (lower.includes('organic') || lower.includes('acoustic')) {
    bias.acousticness = baseline.acousticness + 0.15;
  } else if (lower.includes('electronic')) {
    bias.acousticness = baseline.acousticness - 0.15;
  }

  return bias;
}

/**
 * Update job progress in KV
 */
async function updateProgress(jobId: string, progress: number, status: string): Promise<void> {
  await setUserKV(`job:${jobId}`, {
    status: 'building',
    progress,
    currentStep: status,
    updatedAt: Date.now()
  });
}

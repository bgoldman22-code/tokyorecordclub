/**
 * Generate Playlists - Main recommendation engine
 * 
 * Takes a world definition → harvests candidates → scores → buckets → creates playlists
 * Hybrid approach: Spotify Recommendations + OpenAI embeddings + local scoring
 */

import { Handler } from '@netlify/functions';
import { getUserFromRequest } from './auth-helpers';
import { getWorldBlob, setUserKV } from './storage';
import { 
  getRecommendations, 
  getAudioFeatures, 
  getArtists,
  createPlaylist,
  replacePlaylistTracks,
  uploadPlaylistCover
} from './spotify';
import { generateEmbeddings } from './openai-client';
import { 
  cosineSimilarity, 
  euclideanDistance, 
  audioFeaturesToVector,
  inferStyle 
} from './math-utils';
import type { 
  WorldDefinition, 
  SpotifyTrack, 
  SpotifyAudioFeatures
} from '../src/types';

interface CandidateTrack extends SpotifyTrack {
  audioFeatures: SpotifyAudioFeatures;
  genres: string[];
  score: number;
  semanticScore: number;
  spotifyScore: number;
  noveltyBonus: number;
  diversityBonus: number;
}

/**
 * Main playlist generation handler
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Verify auth
    const session = await getUserFromRequest(event);
    if (!session || !session.accessToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - missing access token' })
      };
    }

    // Load world definition
    const world = await getWorldBlob(session.spotifyId);
    if (!world) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No world found. Build a world first.' })
      };
    }

    const jobId = `playlists-${session.spotifyId}-${Date.now()}`;
    
    await setUserKV(`job:${jobId}`, {
      status: 'generating',
      startedAt: Date.now(),
      progress: 0
    });

    // Generate playlists asynchronously
    generatePlaylistsAsync(session.spotifyId, world, jobId)
      .catch(error => {
        console.error('Playlist generation failed:', error);
        setUserKV(`job:${jobId}`, {
          status: 'failed',
          error: error.message,
          failedAt: Date.now()
        });
      });

    return {
      statusCode: 202,
      body: JSON.stringify({
        jobId,
        message: 'Playlist generation started',
        pollUrl: `/api/world-status?jobId=${jobId}`
      })
    };

  } catch (error) {
    console.error('Generate playlists error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to start playlist generation' })
    };
  }
};

/**
 * Async playlist generation workflow
 */
async function generatePlaylistsAsync(
  userId: string,
  world: WorldDefinition,
  jobId: string
): Promise<void> {
  
  console.log(`[${jobId}] Starting playlist generation for ${world.name}`);

  // Step 1: Harvest candidates from Spotify
  await updateProgress(jobId, 10, 'Harvesting candidates...');
  const candidates = await harvestCandidates(userId, world);
  console.log(`[${jobId}] Harvested ${candidates.length} candidates`);

  // Step 2: Filter blocklist (tracks user has already)
  await updateProgress(jobId, 20, 'Filtering blocklist...');
  const filtered = await filterBlocklist(candidates, world);
  console.log(`[${jobId}] After filtering: ${filtered.length} candidates`);

  // Step 3: Batch fetch audio features
  await updateProgress(jobId, 30, 'Analyzing audio features...');
  const withFeatures = await enrichWithAudioFeatures(userId, filtered);

  // Step 4: Coarse filter with Spotify features
  await updateProgress(jobId, 40, 'Applying audio constraints...');
  const coarseFiltered = applyCoarseFilters(withFeatures, world);
  console.log(`[${jobId}] After coarse filter: ${coarseFiltered.length} candidates`);

  // Step 5: Enrich with genres
  await updateProgress(jobId, 50, 'Fetching artist genres...');
  const enriched = await enrichWithGenres(userId, coarseFiltered);

  // Step 6: Generate text embeddings for semantic scoring
  await updateProgress(jobId, 60, 'Computing semantic scores...');
  const scored = await scoreWithEmbeddings(enriched, world);

  // Step 7: Apply novelty and diversity bonuses
  await updateProgress(jobId, 70, 'Applying bonuses...');
  const finalScored = applyBonuses(scored, world);

  // Step 8: Sort by final score
  finalScored.sort((a, b) => b.score - a.score);
  console.log(`[${jobId}] Top score: ${finalScored[0]?.score.toFixed(3)}`);

  // Step 9: Bucket into intersections
  await updateProgress(jobId, 80, 'Creating intersection playlists...');
  const playlists = bucketIntoIntersections(finalScored, world);

  // Step 10: Create Spotify playlists
  await updateProgress(jobId, 90, 'Creating Spotify playlists...');
  await createSpotifyPlaylists(userId, world, playlists);

  // Step 11: Mark complete
  await updateProgress(jobId, 100, 'Complete!');
  await setUserKV(`job:${jobId}`, {
    status: 'complete',
    playlistCount: playlists.length,
    completedAt: Date.now()
  });

  console.log(`[${jobId}] Playlist generation complete`);
}

/**
 * Harvest candidates from Spotify Recommendations API
 */
async function harvestCandidates(
  spotifyId: string,
  world: WorldDefinition
): Promise<SpotifyTrack[]> {
  
  const candidates: SpotifyTrack[] = [];
  const seenIds = new Set<string>();

  // Strategy: Make 5-10 calls with different seed combinations
  const seedTrackIds = world.seedTrackIds || [];
  if (seedTrackIds.length === 0) {
    console.warn('No seed tracks in world definition');
    return [];
  }
  
  const limitedSeeds = seedTrackIds.slice(0, 50); // Use top 50 seeds

  // Call 1: Use first 5 seed tracks
  const call1 = await getRecommendations({
    seed_tracks: limitedSeeds.slice(0, 5),
    limit: 100
  }, spotifyId);
  addUnique(candidates, call1, seenIds);

  // Call 2: Use next 5 seed tracks with target parameters
  const avgFeatures = computeAverageFeatures(world);
  const call2 = await getRecommendations({
    seed_tracks: limitedSeeds.slice(5, 10),
    target_acousticness: avgFeatures.acousticness || 0.5,
    target_valence: avgFeatures.valence || 0.5,
    target_energy: avgFeatures.energy || 0.5,
    limit: 100
  }, spotifyId);
  addUnique(candidates, call2, seenIds);

  // Call 3: Use middle seeds with tempo/instrumentalness
  const call3 = await getRecommendations({
    seed_tracks: limitedSeeds.slice(10, 15),
    target_tempo: avgFeatures.tempo || 120,
    target_instrumentalness: avgFeatures.instrumentalness || 0.1,
    limit: 100
  }, spotifyId);
  addUnique(candidates, call3, seenIds);

  // Call 4: Biased toward low valence (darker)
  const call4 = await getRecommendations({
    seed_tracks: limitedSeeds.slice(15, 20),
    target_valence: Math.max(0, (avgFeatures.valence || 0.5) - 0.2),
    target_energy: Math.max(0, (avgFeatures.energy || 0.5) - 0.1),
    limit: 100
  }, spotifyId);
  addUnique(candidates, call4, seenIds);

  // Call 5: Biased toward high acousticness (organic)
  const call5 = await getRecommendations({
    seed_tracks: limitedSeeds.slice(20, 25),
    target_acousticness: Math.min(1, (avgFeatures.acousticness || 0.5) + 0.2),
    limit: 100
  }, spotifyId);
  addUnique(candidates, call5, seenIds);

  // Optional: More calls for diversity
  if (limitedSeeds.length > 30) {
    const call6 = await getRecommendations({
      seed_tracks: limitedSeeds.slice(25, 30),
      target_danceability: avgFeatures.danceability || 0.5,
      limit: 100
    }, spotifyId);
    addUnique(candidates, call6, seenIds);
  }

  return candidates;
}

/**
 * Add unique tracks to candidate list
 */
function addUnique(
  candidates: SpotifyTrack[],
  newTracks: SpotifyTrack[],
  seenIds: Set<string>
): void {
  for (const track of newTracks) {
    if (!seenIds.has(track.id)) {
      candidates.push(track);
      seenIds.add(track.id);
    }
  }
}

/**
 * Filter out tracks user already has
 */
async function filterBlocklist(
  candidates: SpotifyTrack[],
  world: WorldDefinition
): Promise<SpotifyTrack[]> {
  
  const blocklist = new Set(world.seedTrackIds);
  
  return candidates.filter(track => !blocklist.has(track.id));
}

/**
 * Enrich tracks with audio features
 */
async function enrichWithAudioFeatures(
  spotifyId: string,
  tracks: SpotifyTrack[]
): Promise<Array<SpotifyTrack & { audioFeatures: SpotifyAudioFeatures }>> {
  
  const trackIds = tracks.map(t => t.id);
  const features = await getAudioFeatures(trackIds, spotifyId);

  return tracks.map((track, i) => ({
    ...track,
    audioFeatures: features[i]
  }));
}

/**
 * Apply coarse filters based on world feature ranges
 */
function applyCoarseFilters(
  tracks: Array<SpotifyTrack & { audioFeatures: SpotifyAudioFeatures }>,
  world: WorldDefinition
): Array<SpotifyTrack & { audioFeatures: SpotifyAudioFeatures }> {
  
  const ranges = world.featureRanges;
  if (!ranges) {
    console.warn('No feature ranges in world definition, skipping coarse filter');
    return tracks;
  }

  return tracks.filter(track => {
    const f = track.audioFeatures;
    
    // Stay within reasonable bounds of world's range
    const valencePadding = 0.2;
    const energyPadding = 0.2;
    const tempoPadding = 20;

    return (
      f.valence >= ranges.valence[0] - valencePadding &&
      f.valence <= ranges.valence[1] + valencePadding &&
      f.energy >= ranges.energy[0] - energyPadding &&
      f.energy <= ranges.energy[1] + energyPadding &&
      f.tempo >= ranges.tempo[0] - tempoPadding &&
      f.tempo <= ranges.tempo[1] + tempoPadding &&
      f.acousticness >= ranges.acousticness[0] - 0.2
    );
  });
}

/**
 * Enrich with artist genres
 */
async function enrichWithGenres(
  spotifyId: string,
  tracks: Array<SpotifyTrack & { audioFeatures: SpotifyAudioFeatures }>
): Promise<CandidateTrack[]> {
  
  // Extract unique artist IDs
  const artistIds = [...new Set(
    tracks.flatMap(t => t.artists.map(a => a.id))
  )];

  // Fetch artist data in batches
  const artists = await getArtists(artistIds, spotifyId);
  const artistGenres = new Map(artists.map(a => [a.id, a.genres]));

  // Enrich tracks
  return tracks.map(track => {
    const genres = track.artists.flatMap(a => artistGenres.get(a.id) || []);
    
    return {
      ...track,
      genres: [...new Set(genres)], // Dedupe
      score: 0,
      semanticScore: 0,
      spotifyScore: 0,
      noveltyBonus: 0,
      diversityBonus: 0
    };
  });
}

/**
 * Score tracks with text embeddings
 */
async function scoreWithEmbeddings(
  tracks: CandidateTrack[],
  world: WorldDefinition
): Promise<CandidateTrack[]> {
  
  // Create descriptions
  const descriptions = tracks.map(track =>
    `${track.artists[0].name} - ${track.name}. ` +
    `Genres: ${track.genres.join(', ')}. ` +
    `Style: ${inferStyle(track.audioFeatures)}`
  );

  // Generate embeddings
  const embeddings = await generateEmbeddings(descriptions);

  // Score by similarity to world's semantic centroid
  return tracks.map((track, i) => {
    const semanticScore = cosineSimilarity(
      embeddings[i],
      world.semanticCentroid
    );

    // Score by Spotify feature distance
    const trackVector = audioFeaturesToVector(track.audioFeatures);
    const spotifyScore = 1 - euclideanDistance(trackVector, world.tasteCentroid);

    return {
      ...track,
      semanticScore,
      spotifyScore
    };
  });
}

/**
 * Apply novelty and diversity bonuses
 */
function applyBonuses(
  tracks: CandidateTrack[],
  world: WorldDefinition
): CandidateTrack[] {
  
  // Count genre frequencies in candidates
  const genreCounts = new Map<string, number>();
  for (const track of tracks) {
    for (const genre of track.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    }
  }

  // Use top artists from world as seed artists
  const seedArtists = new Set(world.topArtists);

  return tracks.map(track => {
    // Novelty: boost if artist is new
    const isNewArtist = !track.artists.some(a => seedArtists.has(a.id));
    const noveltyBonus = isNewArtist ? 0.15 : 0;

    // Diversity: boost if genre is rare in candidates
    const avgGenreCount = track.genres.length > 0
      ? track.genres.reduce((sum, g) => sum + (genreCounts.get(g) || 0), 0) / track.genres.length
      : 1000;
    const diversityBonus = avgGenreCount < 10 ? 0.1 : avgGenreCount < 30 ? 0.05 : 0;

    // Combined score
    const score = (
      0.4 * track.semanticScore +
      0.3 * track.spotifyScore +
      0.2 * noveltyBonus +
      0.1 * diversityBonus
    );

    return {
      ...track,
      noveltyBonus,
      diversityBonus,
      score
    };
  });
}

/**
 * Bucket tracks into intersection playlists
 */
function bucketIntoIntersections(
  tracks: CandidateTrack[],
  world: WorldDefinition
): Array<{
  name: string;
  description: string;
  tracks: CandidateTrack[];
}> {
  
  const playlists = world.intersections.map(intersection => {
    // Apply intersection-specific bias to scores
    const biasedTracks = tracks.map(track => {
      let biasedScore = track.score;

      // Apply feature biases
      if (intersection.bias.valence !== undefined) {
        const valenceDiff = Math.abs(track.audioFeatures.valence - intersection.bias.valence);
        biasedScore += (1 - valenceDiff) * 0.1;
      }

      if (intersection.bias.energy !== undefined) {
        const energyDiff = Math.abs(track.audioFeatures.energy - intersection.bias.energy);
        biasedScore += (1 - energyDiff) * 0.1;
      }

      if (intersection.bias.tempo !== undefined) {
        const tempoDiff = Math.abs(track.audioFeatures.tempo - intersection.bias.tempo) / 100;
        biasedScore += Math.max(0, 1 - tempoDiff) * 0.1;
      }

      return { ...track, biasedScore };
    });

    // Sort by biased score
    biasedTracks.sort((a, b) => b.biasedScore - a.biasedScore);

    // Take top 80 and enforce diversity
    const diverse = enforceDiversity(biasedTracks.slice(0, 80));

    // Keep top 50
    const selected = diverse.slice(0, 50);

    return {
      name: intersection.name,
      description: intersection.description,
      tracks: selected
    };
  });

  return playlists;
}

/**
 * Enforce diversity constraints
 */
function enforceDiversity(tracks: CandidateTrack[]): CandidateTrack[] {
  const selected: CandidateTrack[] = [];
  const usedArtists = new Set<string>();
  const usedAlbums = new Set<string>();
  const genreCounts = new Map<string, number>();

  for (const track of tracks) {
    // Max 1 per artist
    const artistIds = track.artists.map(a => a.id);
    if (artistIds.some(id => usedArtists.has(id))) continue;

    // Max 1 per album
    if (usedAlbums.has(track.album.id)) continue;

    // Max 8 per primary genre
    const primaryGenre = track.genres[0] || 'unknown';
    if ((genreCounts.get(primaryGenre) || 0) >= 8) continue;

    // Add to selected
    selected.push(track);
    artistIds.forEach(id => usedArtists.add(id));
    usedAlbums.add(track.album.id);
    genreCounts.set(primaryGenre, (genreCounts.get(primaryGenre) || 0) + 1);

    if (selected.length >= 50) break;
  }

  return selected;
}

/**
 * Create Spotify playlists
 */
async function createSpotifyPlaylists(
  spotifyId: string,
  world: WorldDefinition,
  playlists: Array<{ name: string; description: string; tracks: CandidateTrack[] }>
): Promise<void> {
  
  for (const playlist of playlists) {
    try {
      // Create playlist
      const created = await createPlaylist(
        spotifyId,
        `${world.name}: ${playlist.name}`,
        playlist.description,
        false
      );

      // Add tracks
      const trackUris = playlist.tracks.map(t => t.uri);
      await replacePlaylistTracks(created.id, trackUris, spotifyId);

      // Generate simple cover art (SVG → PNG)
      const coverArt = generateSimpleCoverArt(playlist.name);
      await uploadPlaylistCover(created.id, coverArt, spotifyId);

      console.log(`Created playlist: ${created.name} (${playlist.tracks.length} tracks)`);
    } catch (error) {
      console.error(`Failed to create playlist ${playlist.name}:`, error);
    }
  }
}

/**
 * Generate simple SVG cover art
 */
function generateSimpleCoverArt(playlistName: string): string {
  // Simple gradient with text
  const colors = [
    ['#1a1a1a', '#4a4a4a'],
    ['#2d1b2e', '#5a3a5a'],
    ['#1b2d2e', '#3a5a5a'],
    ['#2d2d1b', '#5a5a3a']
  ];
  
  const [color1, color2] = colors[Math.floor(Math.random() * colors.length)];

  return `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#grad)"/>
    <text x="150" y="160" text-anchor="middle" fill="white" font-size="20" font-weight="bold" font-family="Arial, sans-serif">
      ${playlistName}
    </text>
  </svg>`;
}

/**
 * Compute average features from world centroid
 */
function computeAverageFeatures(world: WorldDefinition): Partial<SpotifyAudioFeatures> {
  // Use the taste centroid (already computed)
  const centroid = world.tasteCentroid;
  
  return {
    acousticness: centroid[0],
    danceability: centroid[1],
    energy: centroid[2],
    instrumentalness: centroid[3],
    liveness: centroid[4],
    loudness: centroid[5],
    speechiness: centroid[6],
    valence: centroid[7],
    tempo: centroid[8]
  };
}

/**
 * Update job progress
 */
async function updateProgress(jobId: string, progress: number, status: string): Promise<void> {
  await setUserKV(`job:${jobId}`, {
    status: 'generating',
    progress,
    currentStep: status,
    updatedAt: Date.now()
  });
}

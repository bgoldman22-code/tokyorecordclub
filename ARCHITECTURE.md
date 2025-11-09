# Tokyo Record Club - Architecture & Cost Model

## Core Philosophy

**Build a sophisticated music recommendation engine that's FREE or near-free to operate** by leveraging:
- Spotify's free APIs (rate-limited but powerful)
- OpenAI's API only where it adds unique value (pennies per user)
- Netlify's generous free tier (100GB bandwidth, 125k function invocations/month)
- Smart caching and batching to minimize API calls

---

## User Flow

### 1. Landing & Auth
```
User visits → "Sign in with Spotify" → OAuth flow → Dashboard
```
**Cost**: $0 (Spotify OAuth is free)

### 2. Seed Selection (NEW - Your Flow)
User chooses ONE of three starting points:

**Option A: Listening History**
- Recent (last 50 tracks)
- 6 months (top tracks, medium term)
- 12 months (top tracks, long term)  
- All time (top tracks, long term)

**Option B: Existing Playlist(s)**
- Search/select from user's playlists
- Can pick 1-5 playlists
- We extract all tracks

**Option C: Individual Songs**
- Search Spotify catalog
- Pick 3-10 specific tracks
- Good for "start from scratch" mode

**Cost**: $0 (all Spotify API calls, cached in KV)

### 3. Guided Onboarding (GPT-4 Enrichment)

Instead of rigid sliders, we ask **5 questions with smart options + freeform input**:

```
Q1: "What textures or production qualities draw you in?"
Options: 
  ☑ Warm & Analog (tape hiss, dusty, vinyl warmth)
  ☑ Spacious & Reverberant (cathedral space, echo)
  ☐ Clean & Crisp (hi-fi, polished)
  ☑ Handmade & Organic (human imperfection, breathing)
  + [Type your own: "like candlelight in a wooden room"]

Q2: "What kind of emotional space do these songs create?"
Options:
  ☑ Melancholic & Contemplative
  ☑ Spiritual & Transcendent
  ☐ Dark & Mysterious
  ☑ Calm & Serene
  
Q3: "How should the music move?"
Options:
  ☑ Slow & Patient (unhurried, meditative)
  ☑ Mid-Tempo Groove (steady, head-nod)
  
Q4: "What sonic palette appeals to you?"
Options:
  ☑ Acoustic & Organic (guitars, strings, wood)
  ☑ Hybrid & Blended (electronic + acoustic)
  
Q5: "What should we avoid?"
Options:
  ☑ Too Polished (over-produced, radio-ready)
  ☑ Too Aggressive (harsh, abrasive)
```

**Benefits:**
- Faster (no typing unless they want to)
- Better data quality (structured options)
- Cheaper (shorter text = fewer tokens)
- Still captures nuance via custom entries

**GPT-4 extracts structured world definition:**
```json
{
  "texture": "warm-grainy-analog",
  "space": "reverberant-intimate",
  "tempo_preference": "slow-blooming",
  "emotional_geometry": {
    "darkness_warmth": -0.3,  // slight warm lean
    "intimate_expansive": 0.2, // balanced with slight expansion
    "acoustic_electronic": -0.5 // acoustic preference
  },
  "keywords": ["dusty", "handmade", "spiritual", "candlelight"],
  "exclude_keywords": ["polished", "aggressive", "bright"],
  "world_name_seed": "Velvet Dirt Cathedral"
}
```

**Cost**: ~$0.01 per user onboarding (1-2 GPT-4 calls with structured outputs)

### 4. World Building (Hybrid Engine)

**Step 4a: Fetch Spotify Data (Free)**
```typescript
// Get audio features for all seed tracks
const features = await spotify.getAudioFeatures(seedTrackIds);
// Returns: valence, energy, acousticness, tempo, danceability, etc.

// Get artist genres
const artists = await spotify.getArtists(artistIds);
// Returns: ["indie folk", "chamber pop", "neo-psychedelic"]
```

**Step 4b: Compute Taste Vector (Local Math - Free)**
```typescript
// PCA on Spotify features → 8-12 dimensional taste space
const tasteCentroid = computeCentroid(features);
const components = pca(features, dimensions: 8);
```

**Step 4c: Enrich with Text Embeddings (OpenAI - Cheap)**
```typescript
// Create rich descriptions from metadata
const descriptions = tracks.map(t => 
  `${t.artist} - ${t.name}. ${t.album}. 
   Genres: ${t.genres.join(', ')}. 
   Era: ${t.releaseYear}. 
   Style: ${inferStyle(t.audioFeatures)}`
);

// Embed in semantic space
const embeddings = await openai.embeddings.create({
  model: "text-embedding-3-small", // $0.02 per 1M tokens
  input: descriptions.slice(0, 100) // batch limit
});

// Compute semantic centroid
const semanticCentroid = average(embeddings);
```

**Step 4d: Generate World Name & Prose (GPT-4 - Cheap)**
```typescript
const worldDescription = await openai.chat.completions.create({
  model: "gpt-4o-mini", // $0.15 per 1M input tokens
  messages: [{
    role: "system",
    content: WORLD_NAMING_PROMPT
  }, {
    role: "user", 
    content: JSON.stringify({
      conversationTranscript,
      tasteCentroid,
      topGenres,
      keywords
    })
  }],
  response_format: { type: "json_object" }
});

// Returns:
{
  "world_name": "Velvet Dirt Cathedral",
  "description": "Your center of gravity sits in warm-grainy territory 
                  with reverberant-intimate space and slow-blooming texture...",
  "intersections": [
    {
      "name": "Ruined Cathedral",
      "bias": "darker, more textural, slower"
    },
    {
      "name": "Late Summer Drift", 
      "bias": "warmer, slightly brighter, patient groove"
    },
    // ... 3-5 total
  ]
}
```

**Save to Blob Storage (Free under 1GB/month)**
```typescript
await putBlob(`users/${userId}/world.json`, worldData);
```

**Cost per user**: ~$0.015
- Spotify calls: $0
- Text embeddings (100 tracks): ~$0.005
- GPT-4o-mini world generation: ~$0.01

### 5. Candidate Harvesting (Spotify - Free)

**Use Spotify Recommendations API strategically:**

```typescript
// Spotify gives 100 recommendations per call, 5 seed tracks max
// We make multiple calls with different seed combinations

const candidates = [];

// Call 1: Use taste centroid's nearest tracks as seeds
const seeds1 = topSeedTracks.slice(0, 5);
const recs1 = await spotify.getRecommendations({
  seed_tracks: seeds1,
  target_acousticness: worldData.acousticness,
  target_valence: worldData.valence,
  target_energy: worldData.energy,
  limit: 100
});
candidates.push(...recs1);

// Call 2: Use top artists as seeds
const seeds2 = topArtists.slice(0, 5);
const recs2 = await spotify.getRecommendations({
  seed_artists: seeds2,
  target_tempo: worldData.tempo,
  target_instrumentalness: worldData.instrumentalness,
  limit: 100
});
candidates.push(...recs2);

// Call 3-5: Vary the target parameters for diversity
// ...

// Total: ~500-1000 candidates from 5-10 API calls
```

**Filter blocklist immediately:**
```typescript
// Remove songs user already has/played heavily
candidates = candidates.filter(t => 
  !blocklist.has(t.id) && 
  !seedTrackIds.has(t.id)
);
```

**Cost**: $0 (Spotify rate limit: ~180 calls/min)

### 6. Semantic Scoring & Ranking (Hybrid - Mostly Free)

**Step 6a: Batch fetch audio features (Free)**
```typescript
// Spotify allows 100 tracks per call
const candidateFeatures = await spotify.getAudioFeatures(
  candidateIds, 
  batchSize: 100
);
```

**Step 6b: Coarse filter with Spotify features (Free, local)**
```typescript
// Quick numeric filtering
candidates = candidates.filter(t => {
  const f = t.audioFeatures;
  return (
    f.valence <= worldData.valence_max &&
    f.energy >= worldData.energy_min &&
    f.tempo >= worldData.tempo_min &&
    f.tempo <= worldData.tempo_max &&
    f.acousticness >= worldData.acousticness_min
  );
});
// Reduces 1000 → ~300-400 candidates
```

**Step 6c: Semantic scoring with text embeddings (Cheap)**
```typescript
// Only embed the filtered candidates (~300 tracks)
const candidateDescriptions = candidates.map(t => 
  `${t.artist} - ${t.name}. ${t.genres}. ${inferStyle(t.audioFeatures)}`
);

const candidateEmbeddings = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: candidateDescriptions
});

// Score by cosine similarity to world semantic centroid
const scored = candidates.map((track, i) => ({
  ...track,
  semanticScore: cosineSimilarity(
    candidateEmbeddings[i],
    worldData.semanticCentroid
  ),
  spotifyScore: euclideanDistance(
    track.audioFeatures,
    worldData.tasteCentroid
  )
}));
```

**Step 6d: Combined scoring with novelty bonus (Free, local)**
```typescript
const finalScored = scored.map(track => {
  // Weighted combination
  const alignmentScore = (
    0.4 * track.semanticScore +      // OpenAI embedding match
    0.3 * track.spotifyScore +       // Spotify feature match
    0.2 * noveltyBonus(track) +      // New artist/genre
    0.1 * diversityBonus(track)      // Rare in candidate set
  );
  
  return { ...track, score: alignmentScore };
});

// Sort descending
finalScored.sort((a, b) => b.score - a.score);
```

**Cost per generation**: ~$0.01
- Text embeddings for 300 candidates: ~$0.01
- Everything else: local computation

### 7. Intersection Bucketing (Free, local)

```typescript
// Take top 250 tracks and split into 3-5 themed playlists

const intersections = [
  {
    name: "Ruined Cathedral",
    filter: t => t.valence < 0.4 && t.energy < 0.5,
    bias: { valence: -0.2, tempo: -10 }
  },
  {
    name: "Late Summer Drift",
    filter: t => t.valence > 0.4 && t.acousticness > 0.5,
    bias: { valence: +0.1, acousticness: +0.2 }
  },
  // ... etc
];

const playlists = intersections.map(intersection => {
  // Apply intersection-specific bias to scores
  const biasedScores = finalScored.map(t => ({
    ...t,
    intersectionScore: t.score + 
      (intersection.bias.valence * t.audioFeatures.valence) +
      (intersection.bias.tempo * t.audioFeatures.tempo / 100)
  }));
  
  // Filter and take top 50
  const filtered = biasedScores.filter(intersection.filter);
  const selected = enforceDiversity(filtered.slice(0, 80)).slice(0, 50);
  
  return {
    name: intersection.name,
    tracks: selected
  };
});
```

**Diversity enforcement (Free, local)**:
```typescript
function enforceDiversity(tracks) {
  const selected = [];
  const usedArtists = new Set();
  const usedAlbums = new Set();
  const genreCounts = {};
  
  for (const track of tracks) {
    // Max 1 per artist
    if (usedArtists.has(track.artistId)) continue;
    
    // Max 1 per album  
    if (usedAlbums.has(track.albumId)) continue;
    
    // Max 8 per genre cluster
    const genre = track.primaryGenre;
    if ((genreCounts[genre] || 0) >= 8) continue;
    
    selected.push(track);
    usedArtists.add(track.artistId);
    usedAlbums.add(track.albumId);
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    
    if (selected.length >= 50) break;
  }
  
  return selected;
}
```

### 8. Playlist Creation (Free)

```typescript
// Create/update playlists in user's Spotify
for (const playlist of playlists) {
  // Check if playlist exists
  let playlistId = worldData.playlists?.[playlist.name]?.id;
  
  if (!playlistId) {
    // Create new
    const created = await spotify.createPlaylist(userId, {
      name: `${worldData.world_name}: ${playlist.name}`,
      description: playlist.description,
      public: false
    });
    playlistId = created.id;
  }
  
  // Replace tracks (or append with continuity %)
  await spotify.replacePlaylistTracks(
    playlistId, 
    playlist.tracks.map(t => t.uri)
  );
  
  // Generate + upload cover art
  const coverImage = await generateCoverArt(playlist.name);
  await spotify.uploadPlaylistCover(playlistId, coverImage);
}
```

**Cost**: $0 (all Spotify API)

### 9. Cover Art Generation (Optional - Free or Cheap)

**Option A: SVG → PNG (Free, local)**
```typescript
// Generate simple gradient/text SVG
const svg = `
  <svg width="300" height="300">
    <defs>
      <linearGradient id="grad">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
    </defs>
    <rect fill="url(#grad)" width="300" height="300" />
    <text x="150" y="150" text-anchor="middle" 
          fill="white" font-size="24" font-weight="bold">
      ${playlistName}
    </text>
  </svg>
`;

// Convert to PNG (using canvas or sharp)
const png = await svgToPng(svg);
```

**Option B: DALL-E (Optional - $0.04 per image)**
```typescript
// Only if user wants fancy covers
const image = await openai.images.generate({
  model: "dall-e-3",
  prompt: `Abstract album art for "${playlistName}": ${styleKeywords}`,
  size: "1024x1024"
});
```

**Recommendation**: Use SVG (free) by default, offer DALL-E as premium upgrade

---

## Weekly Refresh (Scheduled Function)

```typescript
// Runs every Monday 3pm UTC
export async function scheduledWeekly() {
  const users = await getAllActiveUsers(); // from KV
  
  for (const user of users) {
    try {
      // Refresh their recents (last 50 tracks)
      const recents = await spotify.getRecentlyPlayed(user.id);
      
      // Rebuild world with decay (80% old + 20% new)
      const updatedWorld = await rebuildWorld(user, recents, decayFactor: 0.8);
      
      // Regenerate playlists with continuity
      // Keep 30% of existing tracks, add 70% new
      await regeneratePlaylists(user, updatedWorld, continuity: 0.3);
      
      // Update KV
      await setUserKV(user.id, { lastRunAt: Date.now() });
      
    } catch (error) {
      console.error(`Failed for user ${user.id}:`, error);
      // Continue to next user
    }
  }
}
```

**Cost per user per week**: ~$0.02
- Text embeddings: ~$0.01
- GPT-4o-mini (optional prose refresh): ~$0.01

---

## Total Cost Breakdown

### Per User Onboarding (One-Time)
| Item | Cost |
|------|------|
| Spotify API calls | $0.00 |
| GPT-4 conversation (2-3 exchanges) | $0.01 |
| Text embeddings (100 seed tracks) | $0.005 |
| World generation (GPT-4o-mini) | $0.01 |
| **Total** | **~$0.025** |

### Per User Per Week (Recurring)
| Item | Cost |
|------|------|
| Spotify API calls | $0.00 |
| Text embeddings (300 candidates) | $0.01 |
| Optional prose refresh | $0.01 |
| Cover art (SVG, free) | $0.00 |
| Cover art (DALL-E, optional) | $0.16 (4 playlists) |
| **Total (free covers)** | **~$0.02** |
| **Total (DALL-E covers)** | **~$0.18** |

### Monthly Cost for 1,000 Active Users
| Scenario | Cost |
|----------|------|
| 100 new users/month | $2.50 |
| 1,000 weekly refreshes (SVG covers) | $20.00 |
| Netlify Functions (within free tier) | $0.00 |
| Netlify KV (under 1GB) | $0.00 |
| Netlify Blob (under 1GB) | $0.00 |
| **Total** | **~$22.50/month** |

**With DALL-E covers**: ~$180/month (add $160 for covers)

---

## Storage Strategy (Free Tier Limits)

### Netlify KV (Fast lookups, free under 1GB)
```typescript
// Store lightweight user data
kv.set(`user:${spotifyId}`, {
  createdAt: timestamp,
  refreshToken: encrypted,
  displayName: string,
  lastRunAt: timestamp,
  settings: { cadence, continuity, blocklist }
});

// Store generation timestamps
kv.set(`user:${spotifyId}:lastRegen:${playlistName}`, timestamp);

// Store app-wide counters
kv.set('stats:generations', count);
```

### Netlify Blob (Larger JSON, free under 1GB)
```typescript
// Store world definitions (~50KB each)
await putBlob(`users/${userId}/world.json`, worldData);

// Store generation manifests (~100KB each)
await putBlob(`users/${userId}/runs/${timestamp}.json`, {
  playlists: [...],
  candidates: [...],
  scores: [...]
});

// Cache Spotify data (24hr TTL)
await putBlob(`cache/tracks/${trackId}.json`, trackData, {
  metadata: { ttl: 86400 }
});
```

**Storage estimate for 1,000 users**:
- KV: ~5KB/user = 5MB
- Blob: ~150KB/user = 150MB
- **Total**: ~155MB (well under 1GB free tier)

---

## Rate Limit Management

### Spotify (Free API)
- **Limit**: ~180 requests/minute per app
- **Strategy**: 
  - Batch operations (100 tracks per call)
  - Cache audio features for 24hrs
  - Exponential backoff on 429 errors
  - Queue requests if needed

### OpenAI (Paid API, generous limits)
- **Limit**: 10,000 requests/min (Tier 1)
- **Strategy**:
  - Batch embeddings (max 2048 inputs per call)
  - Cache embeddings forever (tracks don't change)
  - Use GPT-4o-mini instead of GPT-4 where possible

---

## Scaling Path

### Phase 1: Free Tier (0-1,000 users)
- Everything on Netlify free tier
- ~$20-50/month for OpenAI
- **Total**: ~$50/month

### Phase 2: Growth (1,000-10,000 users)  
- Move to Netlify Pro ($19/month)
- OpenAI costs: ~$200-500/month
- Consider caching layer (Redis/Upstash free tier)
- **Total**: ~$250-550/month

### Phase 3: Scale (10,000+ users)
- Consider self-hosting embeddings (free)
- Use Anthropic Claude for conversations (cheaper)
- Pre-compute embeddings for popular tracks (one-time cost)
- **Total**: ~$1,000-2,000/month

---

## Key Cost Optimizations

1. **Cache Everything**
   - Spotify track features → never change
   - OpenAI embeddings → never change
   - Store in Blob, check before API call

2. **Smart Batching**
   - Embed 100+ tracks per OpenAI call
   - Fetch 100 audio features per Spotify call

3. **Use Cheaper Models**
   - GPT-4o-mini for world generation ($0.15/1M vs $2.50/1M)
   - text-embedding-3-small ($0.02/1M vs $0.13/1M)

4. **Defer Expensive Operations**
   - DALL-E covers → optional upgrade
   - Audio embeddings → Phase 2 feature

5. **User-Controlled Frequency**
   - Weekly default, but let users go biweekly/monthly
   - Reduces recurring costs by 50-75%

---

## Why This Is Feasible

✅ **Spotify is free** - Our primary data source costs nothing  
✅ **OpenAI is cheap** - ~$0.02/user/week is sustainable  
✅ **Netlify is generous** - 125k function calls/month free  
✅ **Math is free** - PCA, scoring, diversity all local  
✅ **Caching works** - Track features never change  

The **secret**: We use expensive APIs (OpenAI) only for the 10% where they're uniquely valuable (semantic understanding, conversation), and free APIs (Spotify) + local math for the 90% heavy lifting (features, scoring, filtering).

**This can realistically run at $0.02-0.05 per user per week**, making it sustainable even at scale.

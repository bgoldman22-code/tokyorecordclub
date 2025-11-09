# Tokyo Record Club 🎵

> Discover new music through deep analysis of your Spotify taste

Tokyo Record Club is a sophisticated music recommendation engine that goes beyond "more of the same." We analyze your listening history, ask thoughtful questions about your taste, and generate 3-5 themed weekly playlists that sit at different intersections of your musical world.

**Not another algorithm-driven playlist.** This is **curated discovery** powered by semantic analysis, emotional geometry extraction, and taste vector mathematics.

---

## ✨ Features

- 🎯 **Smart Seed Selection**: Start from listening history, playlists, or individual tracks
- 💬 **Guided Onboarding**: Answer 5 questions with smart options + custom input
- 🧠 **Hybrid Recommendation Engine**: 
  - Spotify audio features (tempo, energy, valence)
  - OpenAI text embeddings (semantic matching)
  - Custom scoring algorithm (novelty + diversity)
- 🎨 **Intersection Playlists**: 3-5 themed playlists per "world" (50 tracks each)
- 🔄 **Weekly Refresh**: Auto-regenerate with continuity (keeps some favorites)
- 🎭 **Your Musical World**: Poetic names like "Velvet Dirt Cathedral" or "Neon Dusk Chapel"

---

## 🏗️ Architecture

### Stack
- **Frontend**: React + Vite + TypeScript + TailwindCSS + Framer Motion
- **Backend**: Netlify Functions (serverless TypeScript)
- **Storage**: Netlify KV (fast lookups) + Blob (large JSON)
- **APIs**: 
  - Spotify Web API (free - music data & playlist creation)
  - OpenAI API (cheap - semantic embeddings & world naming)

### Cost Model
- **Per User Onboarding**: ~$0.025 (one-time)
- **Per User Per Week**: ~$0.02 (recurring)
- **1,000 Active Users**: ~$22.50/month

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full technical details.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Spotify Developer Account
- OpenAI API Key
- Netlify Account

### 1. Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create App"
3. Fill in:
   - **App Name**: Tokyo Record Club (Dev)
   - **App Description**: Music recommendation engine
   - **Redirect URI**: `http://localhost:8888/.netlify/functions/callback`
4. Save your **Client ID** and **Client Secret**
5. In Settings, add these scopes:
   ```
   user-read-email
   user-top-read
   user-read-recently-played
   playlist-read-private
   playlist-modify-public
   playlist-modify-private
   ugc-image-upload
   ```

### 2. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account / log in
3. Go to API Keys section
4. Create new secret key
5. Save it securely

### 3. Clone & Install

```bash
# Clone the repo
git clone <your-repo-url>
cd tokyo-record-club

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
```

### 4. Configure Environment

Edit `.env`:

```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8888/.netlify/functions/callback
SESSION_SECRET=generate_random_256bit_string_here
OPENAI_API_KEY=your_openai_api_key
```

**Generate a secure SESSION_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Run Locally

```bash
# Start dev server (Vite + Netlify Functions)
pnpm dev

# Open http://localhost:8888
```

---

## 📦 Deployment

### Deploy to Netlify

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. **Connect to Netlify**:
   - Go to [Netlify](https://app.netlify.com/)
   - Click "Add new site" → "Import from Git"
   - Select your GitHub repo
   - Build settings:
     - **Build command**: `pnpm build`
     - **Publish directory**: `dist`
   - Deploy!

3. **Set Environment Variables**:
   - In Netlify dashboard → Site settings → Environment variables
   - Add all variables from `.env`
   - Update `SPOTIFY_REDIRECT_URI` to:
     ```
     https://your-site.netlify.app/.netlify/functions/callback
     ```

4. **Update Spotify App**:
   - Go back to Spotify Dashboard
   - Add production redirect URI:
     ```
     https://your-site.netlify.app/.netlify/functions/callback
     ```

---

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test --coverage

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

## 📖 How It Works

### 1. **Seed Selection**
User picks one of three starting points:
- **Listening History**: Recent, 6mo, 12mo, or all-time top tracks
- **Playlists**: Select 1-5 of their Spotify playlists
- **Individual Songs**: Search and pick 3-10 specific tracks

### 2. **Guided Onboarding**
5 questions with smart options (or custom text):
1. Texture & production quality (warm analog? spacious reverb?)
2. Emotional atmosphere (melancholic? spiritual?)
3. Tempo & movement (slow patient? driving?)
4. Instrumentation (acoustic? electronic? hybrid?)
5. What to avoid (too polished? too aggressive?)

### 3. **World Building**
- Fetch Spotify audio features for all seed tracks
- Compute taste centroid using PCA (8-12 dimensions → 3D)
- Generate text embeddings for semantic matching (OpenAI)
- GPT-4o-mini extracts emotional geometry and generates world name
- Save world definition to Blob storage

### 4. **Candidate Harvesting**
- Use Spotify Recommendations API (5-10 calls, ~500-1000 tracks)
- Vary seed combinations and target parameters for diversity
- Filter blocklist (songs user already has/knows)

### 5. **Semantic Scoring**
- Batch fetch audio features (100 tracks per call)
- Coarse filter using Spotify features (1000 → ~300 candidates)
- Generate text embeddings for remaining tracks (OpenAI)
- Score by:
  - 40% semantic similarity (text embedding distance)
  - 30% audio feature alignment (Spotify features)
  - 20% novelty (new artists, rare genres)
  - 10% diversity bonus

### 6. **Intersection Bucketing**
- Take top 250 tracks
- Split into 3-5 themed playlists (50 tracks each)
- Each intersection has bias (darker? warmer? more acoustic?)
- Enforce diversity: max 1 track per artist, max 1 per album

### 7. **Playlist Creation**
- Create/update playlists in user's Spotify
- Generate SVG cover art (or optional DALL-E)
- Upload covers and descriptions

### 8. **Weekly Refresh**
- Scheduled function runs every Monday
- Rebuild world with 80% old + 20% new recents (decay)
- Regenerate with 30% continuity (keeps some tracks)

---

## 🎨 Example Worlds

**Velvet Dirt Cathedral**
> Your center of gravity sits in warm-grainy territory with reverberant-intimate space and slow-blooming texture. The music leans acoustic and spiritual, occasionally breaking toward rhythmic propulsion to keep discovery alive.

Intersections:
- **Ruined Cathedral** (darker, slower, more textural)
- **Late Summer Drift** (warmer, patient groove)
- **Clear Winter Interior** (sparse, minimal)

**Neon Dusk Chapel**
> Your taste lives at the intersection of electronic warmth and melancholic space. Synth-heavy but never cold, with patient tempos and gentle builds.

Intersections:
- **Amber Glow** (warm analog synths, nostalgic)
- **Midnight Glass** (darker, more mysterious)
- **Dawn Haze** (dreamy, shoegaze-adjacent)

---

## 🔐 Data Privacy

- **What we store**:
  - Spotify user ID, email, display name
  - Refresh token (encrypted)
  - Selected seed tracks/playlists
  - Questionnaire answers
  - Taste vectors (numeric, anonymized)
  - Generated playlist IDs

- **What we DON'T store**:
  - Full listening history (only IDs needed for vectors)
  - Personal information beyond Spotify profile

- **Your data, your control**:
  - Export button: download all your data as JSON
  - Delete button: permanently remove all data
  - Revoke access anytime via Spotify settings

---

## 🛠️ Development

### Project Structure

```
tokyo-record-club/
├── netlify.toml                 # Netlify config
├── package.json
├── vite.config.ts
├── /functions                   # Netlify Functions (backend)
│   ├── auth.ts                  # Spotify OAuth start
│   ├── callback.ts              # OAuth callback handler
│   ├── spotify.ts               # Spotify API client
│   ├── storage.ts               # KV + Blob helpers
│   ├── onboarding-questions.ts  # Question definitions
│   ├── me.ts                    # Get current user
│   ├── fetch-seeds.ts           # Fetch user's seeds
│   ├── build-world.ts           # World builder (async)
│   ├── world-status.ts          # Poll world build status
│   ├── generate-playlists.ts    # Playlist generator
│   ├── regenerate-one.ts        # Regenerate single intersection
│   ├── schedule-weekly.ts       # Scheduled refresh job
│   └── openai-client.ts         # OpenAI wrapper
├── /src                         # React frontend
│   ├── /components
│   │   ├── /ui                  # shadcn components
│   │   ├── SeedSelector.tsx     # Seed selection UI
│   │   ├── OnboardingFlow.tsx   # Question flow
│   │   ├── WorldVisual.tsx      # 2D taste plot
│   │   └── PlaylistCard.tsx     # Intersection card
│   ├── /pages
│   │   ├── Landing.tsx          # Sign in page
│   │   ├── SeedSelection.tsx    # Choose seeds
│   │   ├── Onboarding.tsx       # Answer questions
│   │   ├── WorldPreview.tsx     # View world + start gen
│   │   ├── Results.tsx          # View playlists
│   │   └── Settings.tsx         # User preferences
│   ├── /lib
│   │   ├── utils.ts             # Utility functions
│   │   └── api.ts               # Frontend API client
│   ├── /styles
│   │   └── globals.css          # Tailwind + custom styles
│   ├── types.ts                 # Shared TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── /tests
│   ├── scoring.test.ts          # Scoring algorithm tests
│   └── diversity.test.ts        # Diversity enforcement tests
└── README.md
```

### Key Technologies

- **Frontend**: 
  - React 18 + TypeScript
  - Vite (fast dev server)
  - TailwindCSS + shadcn/ui (design system)
  - Framer Motion (animations)
  - Recharts (taste visualization)

- **Backend**:
  - Netlify Functions (serverless)
  - Node.js 18 + TypeScript
  - Spotify Web API
  - OpenAI API (GPT-4o-mini + text-embedding-3-small)

- **Math/ML**:
  - ml-matrix (PCA computation)
  - Custom vector math (cosine similarity, euclidean distance)

### Adding Features

**Want to add audio embeddings? (Phase 2)**

1. Add Replicate or HuggingFace API key
2. Create `functions/audio-embeddings.ts`
3. Use CLAP or Jukebox model
4. Update scoring weights:
   ```typescript
   const score = (
     0.3 * audioEmbedding +     // NEW
     0.3 * textEmbedding +
     0.2 * spotifyFeatures +
     0.2 * novelty
   );
   ```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for upgrade path details.

---

## 📊 Analytics

Basic privacy-safe telemetry (stored in KV):
- Total users
- Total worlds generated
- Total playlists created
- Weekly active users

Optional: Add PostHog for user flow analysis (set `POSTHOG_KEY` in env).

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

---

## 🙏 Acknowledgments

- Inspired by the "Velvet Dirt Cathedral" recommendation philosophy
- Built with love for deep music discovery
- Powered by Spotify, OpenAI, and Netlify

---

## 📧 Support

Questions? Issues? Feedback?

- 🐛 **Bug Reports**: [GitHub Issues](your-repo-issues)
- 💬 **Questions**: [Discussions](your-repo-discussions)
- 📧 **Email**: your-email@example.com

---

**Made with 🎵 by [Your Name]**

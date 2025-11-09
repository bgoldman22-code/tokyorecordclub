# 🚀 Tokyo Record Club - Deployment Guide

Complete step-by-step guide to deploy your music recommendation engine.

---

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Netlify account (free tier is fine)
- Spotify Developer account
- OpenAI API account

---

## Step 1: Set Up Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Click "Create app"
3. Fill in details:
   - **App name**: Tokyo Record Club
   - **App description**: Music recommendation engine
   - **Redirect URI**: `https://your-app-name.netlify.app/api/callback` (replace with your Netlify URL)
   - **Which API/SDKs are you planning to use?**: Web API
   - **Scopes**: 
     - user-read-recently-played
     - user-top-read
     - playlist-read-private
     - playlist-modify-private
     - ugc-image-upload
4. Click "Save"
5. Copy your **Client ID** and **Client Secret** (you'll need these later)

---

## Step 2: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it "Tokyo Record Club"
4. Copy the key (you'll need this later)

---

## Step 3: Install Dependencies

```bash
cd /tmp/cathedral-fm
pnpm install
```

This will install all the dependencies defined in `package.json`.

---

## Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Spotify OAuth
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://your-app-name.netlify.app/api/callback

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your_random_secret_key_min_32_chars_long
```

To generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 5: Test Locally (Optional but Recommended)

```bash
# Install Netlify CLI
pnpm install -g netlify-cli

# Start local dev server
netlify dev
```

This will:
- Start Vite dev server (frontend)
- Start Netlify Functions (backend)
- Run everything at `http://localhost:8888`

**Note**: You'll need to update your Spotify redirect URI to include `http://localhost:8888/api/callback` for local testing.

---

## Step 6: Deploy to Netlify

### Option A: GitHub → Netlify (Recommended)

1. **Create GitHub repo**:
   ```bash
   cd /tmp/cathedral-fm
   git init
   git add .
   git commit -m "Initial commit: Tokyo Record Club"
   git branch -M main
   git remote add origin https://github.com/yourusername/tokyo-record-club.git
   git push -u origin main
   ```

2. **Connect to Netlify**:
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub
   - Select your repo
   - Build settings (should auto-detect):
     - **Build command**: `pnpm build`
     - **Publish directory**: `dist`
     - **Functions directory**: `functions`
   - Click "Deploy site"

3. **Add environment variables in Netlify**:
   - Go to Site settings → Environment variables
   - Add each variable from your `.env` file:
     - `SPOTIFY_CLIENT_ID`
     - `SPOTIFY_CLIENT_SECRET`
     - `SPOTIFY_REDIRECT_URI` (use your Netlify URL)
     - `OPENAI_API_KEY`
     - `JWT_SECRET`

4. **Update Spotify redirect URI**:
   - Copy your Netlify URL (e.g., `https://tokyo-record-club.netlify.app`)
   - Go back to Spotify Developer Dashboard
   - Update redirect URI to: `https://your-app.netlify.app/api/callback`
   - Save changes

5. **Trigger redeploy**:
   - In Netlify dashboard, go to Deploys
   - Click "Trigger deploy" → "Clear cache and deploy site"

### Option B: Direct Deploy with Netlify CLI

```bash
# Login to Netlify
netlify login

# Initialize site
netlify init

# Set environment variables
netlify env:set SPOTIFY_CLIENT_ID "your_value"
netlify env:set SPOTIFY_CLIENT_SECRET "your_value"
netlify env:set SPOTIFY_REDIRECT_URI "https://your-app.netlify.app/api/callback"
netlify env:set OPENAI_API_KEY "your_value"
netlify env:set JWT_SECRET "your_value"

# Deploy to production
netlify deploy --prod
```

---

## Step 7: Verify Deployment

1. **Visit your site**: `https://your-app-name.netlify.app`

2. **Test the auth flow**:
   - Click "Sign in with Spotify"
   - Should redirect to Spotify login
   - After authorizing, should redirect back to `/seeds`

3. **Test the full flow**:
   - Choose seed type (history/playlists/tracks)
   - Complete onboarding questions
   - Wait for world to build (~30-60 seconds)
   - View generated playlists

---

## Step 8: Set Up Custom Domain (Optional)

1. In Netlify dashboard, go to Domain settings
2. Click "Add custom domain"
3. Enter your domain (e.g., `tokyorecordclub.com`)
4. Follow DNS instructions to point your domain to Netlify
5. Wait for DNS propagation (5-60 minutes)
6. **Update Spotify redirect URI** to use your custom domain

---

## Troubleshooting

### Issue: "Redirect URI mismatch" error
**Solution**: Make sure the redirect URI in Spotify Dashboard exactly matches your Netlify URL + `/api/callback`

### Issue: "Unauthorized" or "Invalid token"
**Solution**: Check that:
- JWT_SECRET is set in Netlify environment variables
- Cookies are enabled in your browser
- You're accessing via HTTPS (not HTTP)

### Issue: "Failed to fetch" errors
**Solution**: 
- Check browser console for CORS errors
- Verify all environment variables are set in Netlify
- Make sure functions are deployed (check Netlify Functions tab)

### Issue: "Rate limit exceeded" from Spotify
**Solution**: 
- Wait a few minutes and try again
- Reduce number of seed tracks
- Our code already handles rate limiting with retries

### Issue: OpenAI API errors
**Solution**:
- Verify API key is correct and has credits
- Check OpenAI dashboard for usage limits
- Make sure you're on at least Tier 1 (requires $5 credit top-up)

---

## Monitoring & Maintenance

### Check Function Logs
```bash
# View live logs
netlify logs --live

# Or in Netlify dashboard:
# Functions → [function name] → Function logs
```

### Monitor Costs
- **Spotify API**: Free (rate-limited)
- **OpenAI**: Check usage at https://platform.openai.com/usage
- **Netlify**: Check usage at https://app.netlify.com/[your-site]/usage

### Scheduled Function
The weekly refresh runs every Monday at 3pm UTC. To verify:
1. Go to Netlify dashboard → Functions
2. Find `schedule-weekly`
3. Check "Recent deploys" to see if it's running

---

## Scaling Considerations

### For 100-1,000 Users
- **Current setup works perfectly**
- Stay on Netlify free tier
- OpenAI costs: ~$80-800/month

### For 1,000-10,000 Users
- Upgrade to Netlify Pro ($19/month)
- Consider Redis for caching (Upstash free tier)
- OpenAI costs: ~$800-8,000/month
- Consider adding a waitlist/pricing tier

### For 10,000+ Users
- Consider self-hosting embeddings
- Use Anthropic Claude (cheaper than OpenAI)
- Pre-compute embeddings for popular tracks
- Implement freemium model (manual regen = free, auto-refresh = paid)

---

## Next Steps

1. ✅ Deploy the app
2. ✅ Test with your own Spotify account
3. ✅ Share with friends for beta testing
4. ⬜ Add analytics (Plausible, Fathom, or PostHog)
5. ⬜ Set up error tracking (Sentry)
6. ⬜ Create a feedback form
7. ⬜ Launch on Product Hunt / Twitter

---

## Support

If you run into issues:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Review logs in Netlify dashboard
3. Check browser console for errors
4. Review ARCHITECTURE.md for implementation details

---

## 🎉 Congratulations!

You've deployed **Tokyo Record Club** - a production-ready music recommendation engine!

Enjoy discovering new music! 🎵

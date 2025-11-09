# 🚀 Tokyo Record Club - Quick Deploy Checklist

Your site is configured and ready to deploy!

**Netlify Site ID**: `6653f3a4-f6a7-4839-bb70-f62b4a930128`
**GitHub Repo**: https://github.com/bgoldman22-code/tokyorecordclub

---

## ✅ Deployment Steps

### Step 1: Connect GitHub to Netlify (5 minutes)

1. Go to https://app.netlify.com/sites/6653f3a4-f6a7-4839-bb70-f62b4a930128
2. Go to **Site configuration** → **Build & deploy** → **Link repository**
3. Choose **GitHub** → Select `bgoldman22-code/tokyorecordclub`
4. Build settings should auto-detect:
   - **Base directory**: (leave empty)
   - **Build command**: `pnpm build`
   - **Publish directory**: `dist`
   - **Functions directory**: `functions`

### Step 2: Get Spotify Credentials (5 minutes)

1. Go to https://developer.spotify.com/dashboard
2. Click **"Create app"**
3. Fill in:
   - **App name**: Tokyo Record Club
   - **App description**: AI-powered music recommendation engine
   - **Redirect URI**: `https://[YOUR-NETLIFY-URL].netlify.app/api/callback`
     - Get your Netlify URL from the Netlify dashboard
   - **API**: Web API
4. Click **"Save"**
5. Click **"Settings"** → Copy your **Client ID** and **Client Secret**

### Step 3: Get OpenAI API Key (2 minutes)

1. Go to https://platform.openai.com/api-keys
2. Click **"Create new secret key"**
3. Name it "Tokyo Record Club"
4. Copy the key (starts with `sk-...`)
5. Make sure you have at least $5 credit (for embeddings)

### Step 4: Generate JWT Secret (30 seconds)

Run this in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64 character hex string)

### Step 5: Add Environment Variables to Netlify (3 minutes)

1. In Netlify dashboard: **Site configuration** → **Environment variables**
2. Click **"Add a variable"** and add each of these:

| Variable | Value | Example |
|----------|-------|---------|
| `SPOTIFY_CLIENT_ID` | Your Spotify Client ID | `abc123def456...` |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify Client Secret | `xyz789uvw012...` |
| `SPOTIFY_REDIRECT_URI` | Your Netlify URL + `/api/callback` | `https://tokyo-record-club.netlify.app/api/callback` |
| `OPENAI_API_KEY` | Your OpenAI key | `sk-proj-...` |
| `JWT_SECRET` | Generated hex string | `a1b2c3d4e5f6...` (64 chars) |

### Step 6: Deploy! (1 minute)

1. Go to **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait 2-3 minutes for build to complete
4. Your site will be live! 🎉

### Step 7: Update Spotify Redirect URI (1 minute)

1. Once deployed, copy your actual Netlify URL
2. Go back to Spotify Dashboard → Your app → Settings
3. Update the **Redirect URI** to match your real URL:
   - `https://your-actual-netlify-url.netlify.app/api/callback`
4. Click **"Save"**

### Step 8: Test It! (5 minutes)

1. Visit your Netlify URL
2. Click **"Sign in with Spotify"**
3. Authorize the app
4. Choose seeds (try "6 Months" listening history)
5. Answer the 5 onboarding questions
6. Wait for world to build (~30-60 seconds)
7. View your playlists!

---

## 🔧 Troubleshooting

### "Redirect URI mismatch"
- Make sure Spotify redirect URI **exactly** matches: `https://your-netlify-url.netlify.app/api/callback`
- No trailing slash!

### "Build failed"
- Check build logs in Netlify
- Make sure all environment variables are set
- Try triggering a fresh deploy

### "Function error"
- Check function logs: **Functions** tab → Click function → **Function logs**
- Verify all env vars are present
- Check OpenAI has credits

### "Can't fetch playlists"
- Make sure you granted all Spotify permissions during auth
- Try signing out and back in

---

## 📊 After Launch

### Monitor Costs
- **Netlify**: Free tier (check usage tab)
- **OpenAI**: https://platform.openai.com/usage
  - Expect ~$0.025 per user onboarding
  - ~$0.02 per user per week for refreshes

### Check Function Logs
```bash
# Install Netlify CLI
pnpm add -g netlify-cli

# View live logs
netlify logs --live

# Or check in dashboard:
# Functions → [function name] → Function logs
```

### Scheduled Job Status
- The weekly refresh runs **every Monday at 3pm UTC**
- Check: **Functions** → `schedule-weekly` → Recent deploys

---

## 🎉 You're Ready!

Your Tokyo Record Club is configured and ready to deploy. Follow the steps above and you'll be live in ~20 minutes!

**Need help?** Check:
- `DEPLOY.md` for detailed instructions
- `ARCHITECTURE.md` for technical details
- Function logs in Netlify dashboard for debugging

---

## 🔗 Quick Links

- **Your Netlify Site**: https://app.netlify.com/sites/6653f3a4-f6a7-4839-bb70-f62b4a930128
- **GitHub Repo**: https://github.com/bgoldman22-code/tokyorecordclub
- **Spotify Dashboard**: https://developer.spotify.com/dashboard
- **OpenAI API Keys**: https://platform.openai.com/api-keys

Good luck! 🚀🎵

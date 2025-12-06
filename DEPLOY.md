# Deploying to Vercel

This guide will help you deploy your NFL Player Tracking Dashboard to Vercel for easy web access.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (free tier is fine)
2. [Vercel CLI](https://vercel.com/docs/cli) installed (optional but recommended)
3. Your API keys ready

## Method 1: Deploy via Vercel Dashboard (Easiest)

### Step 1: Push to GitHub

Make sure your code is pushed to a GitHub repository.

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

In the Vercel project settings, add your environment variables:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

```
NFL_API_KEY=your_sportsdata_io_api_key
YOUTUBE_API_KEY=your_youtube_api_key (optional)
NEWS_API_KEY=your_news_api_key (optional)
```

3. Make sure to set them for **Production**, **Preview**, and **Development** environments

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Your app will be live at `https://your-project-name.vercel.app`

### Step 5: Set Up Vercel KV (Required for Persistent Storage)

**IMPORTANT:** Your watchlist needs Vercel KV to persist data permanently.

1. In your Vercel project, go to the **"Storage"** tab
2. Click **"Create Database"**
3. Select **"KV"** (Key-Value Store)
4. Name it `nfl-tracker-kv` (or any name you prefer)
5. Choose a region close to you
6. Click **"Create"**
7. Click **"Connect to Project"**
8. Select your NFL Tracker project
9. Check all environments (Production, Preview, Development)
10. Click **"Connect"**
11. **Redeploy your app** from the Deployments tab

**For detailed KV setup instructions, see [VERCEL-KV-SETUP.md](VERCEL-KV-SETUP.md)**

## Method 2: Deploy via Vercel CLI (Recommended for Developers)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy

From your project directory:

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N** (for first deployment)
- What's your project's name? Enter a name or press Enter
- In which directory is your code located? **./**
- Want to override the settings? **N**

### Step 4: Add Environment Variables

```bash
vercel env add NFL_API_KEY
```

Paste your API key when prompted. Repeat for other variables:

```bash
vercel env add YOUTUBE_API_KEY
vercel env add NEWS_API_KEY
```

### Step 5: Deploy to Production

```bash
vercel --prod
```

## After Deployment

### Accessing Your Dashboard

Your dashboard will be available at:
```
https://your-project-name.vercel.app
```

### Using the Dashboard

1. **Add Players**: Type a player name and click "Add Player"
2. **Update Data**: Click "Update All" to fetch latest data for all players
3. **Remove Players**: Click the "×" button on any player card
4. **View Details**: Each player card shows:
   - Injury status
   - News sentiment analysis
   - Social media mentions
   - Last update time

## Environment Variables Explained

| Variable | Required | Description |
|----------|----------|-------------|
| `NFL_API_KEY` | ✅ Yes | Your SportsData.io API key for injury data |
| `YOUTUBE_API_KEY` | ⚠️ Optional | YouTube Data API for video mentions |
| `NEWS_API_KEY` | ⚠️ Optional | News API for sentiment analysis |

## Custom Domain (Optional)

To use a custom domain:

1. Go to your project on Vercel
2. Click **"Settings"** → **"Domains"**
3. Add your domain and follow DNS configuration instructions

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Make sure all dependencies are in `package.json`
- Run `npm install` locally first to test

**Error: "API timeout"**
- Vercel serverless functions have a 10s timeout on free tier
- Consider upgrading to Pro for 60s timeout
- Or reduce the number of simultaneous API calls

### Runtime Errors

**Error: "Cannot find module"**
- Check that all imports use correct paths
- Vercel is case-sensitive, unlike local development

**Watchlist not persisting**
- On Vercel, the filesystem is read-only except for `/tmp`
- Consider using Vercel KV or a database for production (see below)

## Upgrading to Database Storage (Advanced)

For production use with multiple users, consider migrating from JSON file storage to a database:

### Option 1: Vercel KV (Redis)

```bash
npm install @vercel/kv
```

### Option 2: Vercel Postgres

```bash
npm install @vercel/postgres
```

### Option 3: External Database

- MongoDB Atlas
- Supabase
- PlanetScale

Update `watchlist-manager.js` to use database instead of JSON file.

## Monitoring

View your deployment logs:

```bash
vercel logs
```

Or check the Vercel Dashboard → Your Project → Deployments → View Logs

## Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Your changes"
git push
```

Vercel will automatically deploy updates when you push to your main branch!

## Cost

- **Free Tier**: 100GB bandwidth, hobby projects
- **Pro Tier** ($20/month): Custom domains, faster builds, analytics
- Most users can run this on the free tier

## Support

For Vercel-specific issues, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

For app-specific issues, check the main README.md

## Quick Commands Reference

```bash
# Local development
npm run dev                    # Start dev server at http://localhost:3000

# Deployment
vercel                        # Deploy to preview
vercel --prod                 # Deploy to production

# Environment variables
vercel env ls                 # List all environment variables
vercel env add VARIABLE_NAME  # Add new variable
vercel env rm VARIABLE_NAME   # Remove variable

# Logs and debugging
vercel logs                   # View recent logs
vercel inspect URL            # Inspect specific deployment
```

Happy deploying! 🚀

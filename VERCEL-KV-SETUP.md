# Vercel KV Setup Guide

This app now uses **Vercel KV (Redis)** for persistent storage of your player watchlist. This means your watchlist will persist permanently across all deployments and serverless function calls.

## What is Vercel KV?

Vercel KV is a serverless Redis database that:
- ✅ Persists data permanently
- ✅ Works across all serverless functions
- ✅ Is super fast (Redis-based)
- ✅ Has a generous free tier (256MB storage)
- ✅ Requires no configuration files

## Setup Steps

### Step 1: Enable Vercel KV in Your Project

1. Go to your Vercel project dashboard
2. Click on the **"Storage"** tab
3. Click **"Create Database"**
4. Select **"KV"** (Key-Value Store)
5. Choose a database name (e.g., `nfl-tracker-kv`)
6. Select a region close to your users
7. Click **"Create"**

### Step 2: Connect to Your Project

1. After creating the database, click **"Connect to Project"**
2. Select your NFL Tracker project
3. Choose the environment(s):
   - ✅ **Production** (required)
   - ✅ **Preview** (recommended)
   - ✅ **Development** (optional, for local testing)
4. Click **"Connect"**

Vercel will automatically add these environment variables to your project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`

### Step 3: Redeploy Your Application

After connecting KV, you need to redeploy:

**Option A: Automatic (if using Git integration)**
- Just push your code to GitHub
- Vercel will auto-deploy with KV enabled

**Option B: Manual redeploy**
1. Go to **"Deployments"** tab
2. Click the three dots on the latest deployment
3. Click **"Redeploy"**
4. Check **"Use existing Build Cache"**
5. Click **"Redeploy"**

### Step 4: Test Your Watchlist

1. Visit your deployed app
2. Add a player to your watchlist
3. Refresh the page
4. The player should still be there! ✅

## Local Development with KV

To test KV locally:

### Option 1: Use Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Link to your project
vercel link

# Pull environment variables (including KV)
vercel env pull .env.local

# Run dev server
npm run dev
```

### Option 2: Manual Environment Variables

1. Go to your Vercel project → **Storage** → **KV**
2. Click **"Connection String"**
3. Copy the environment variables
4. Create `.env.local` in your project:

```env
KV_REST_API_URL=your_url_here
KV_REST_API_TOKEN=your_token_here
KV_REST_API_READ_ONLY_TOKEN=your_read_only_token_here
KV_URL=your_kv_url_here
```

5. Run `npm run dev`

## How It Works

### Data Storage

All watchlist data is stored in Vercel KV under the key:
```
nfl-tracker:watchlist
```

The data structure:
```json
{
  "players": [
    {
      "name": "Patrick Mahomes",
      "team": null,
      "position": null,
      "addedAt": "2024-12-06T10:30:00.000Z",
      "lastChecked": "2024-12-06T10:35:00.000Z",
      "cachedData": {
        "injury": { ... },
        "news": { ... },
        "podcasts": [ ... ],
        "youtube": [ ... ],
        "reddit": [ ... ]
      }
    }
  ],
  "lastUpdated": "2024-12-06T10:35:00.000Z"
}
```

### KV vs File Storage

| Feature | File Storage (Old) | Vercel KV (New) |
|---------|-------------------|-----------------|
| **Persistence** | ❌ Lost on redeploy | ✅ Permanent |
| **Shared State** | ❌ Each function isolated | ✅ Shared across all functions |
| **Performance** | ⚠️ Slower (file I/O) | ✅ Very fast (Redis) |
| **Scalability** | ❌ Limited | ✅ Unlimited |
| **Free Tier** | N/A | ✅ 256MB, 30,000 commands/day |

## Vercel KV Pricing

### Free Tier (Hobby)
- **Storage**: 256 MB
- **Commands**: 30,000 per day
- **Price**: Free forever

This is more than enough for the NFL tracker!

**Estimated usage:**
- Each player: ~10-50 KB
- 50 players: ~2.5 MB
- Commands: ~100-500 per day (depending on usage)

### Pro Tier (if you need more)
- **Storage**: 512 MB
- **Commands**: 100,000 per day
- **Price**: $1/month

## Monitoring Your KV Database

1. Go to Vercel Dashboard → **Storage**
2. Click your KV database
3. View:
   - Current storage usage
   - Commands per day
   - Connection metrics

## Viewing Your Data

To see what's in your KV database:

1. Go to Vercel Dashboard → **Storage** → Your KV database
2. Click **"Data Browser"**
3. Search for key: `nfl-tracker:watchlist`
4. You'll see all your stored data

## Backup & Export

### Manual Backup

You can export your watchlist data:

1. Open browser console on your deployed app
2. Run:
```javascript
fetch('/api/watchlist')
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
```
3. Copy the output

### Automatic Backup (Optional)

Create a backup API route to download your data as JSON.

## Troubleshooting

### "Cannot connect to KV" Error

**Solution:**
1. Check that KV is connected to your project
2. Verify environment variables are set
3. Redeploy your application

### "KV is undefined" Error

**Solution:**
1. Make sure `@vercel/kv` is in `package.json`
2. Run `npm install`
3. Commit and push changes
4. Redeploy

### Watchlist Not Persisting

**Solution:**
1. Verify KV is properly connected
2. Check deployment logs for errors
3. Make sure you're using the KV version of the API routes

### Local Development Not Working

**Solution:**
1. Run `vercel env pull .env.local`
2. Make sure `.env.local` has all KV variables
3. Restart your dev server

## Migration from File Storage

The app automatically uses KV when deployed to Vercel. No migration needed!

Your existing watchlist will start fresh when you first use KV. To migrate existing data:

1. Export from file storage (if you have data locally)
2. Use the web interface to add players back
3. Or manually import via the Data Browser

## Questions?

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Redis Documentation](https://redis.io/docs/)

---

**Note:** The CLI tools (`dashboard.js`, `html-dashboard.js`) still use file storage. Only the web app uses Vercel KV.

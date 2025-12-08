# PostgreSQL Database Setup Guide

This app uses **PostgreSQL** for storing your player watchlist. You can use **any** PostgreSQL provider - you're not locked into Vercel!

## Why PostgreSQL?

✅ **Portable** - Works with any PostgreSQL database (Supabase, Neon, Railway, etc.)
✅ **Standard SQL** - Industry standard, widely supported
✅ **Free tiers** - Most providers offer generous free plans
✅ **No vendor lock-in** - Migrate between providers easily
✅ **Reliable** - Battle-tested, production-ready

---

## Best PostgreSQL Providers (Recommended)

### 1. **Supabase** (Recommended - Best Free Tier)

**Free Tier:**
- 500 MB database
- Unlimited API requests
- 50,000 monthly active users
- Auto-scaling

**Setup:**

1. Go to [supabase.com](https://supabase.com/)
2. Sign up (free)
3. Click **"New Project"**
4. Fill in:
   - Name: `nfl-tracker`
   - Database Password: (create a strong password)
   - Region: Choose closest to you
5. Click **"Create new project"**
6. Wait 2 minutes for database to provision
7. Go to **Settings** → **Database**
8. Copy the **Connection String** (choose "URI" format)
9. Replace `[YOUR-PASSWORD]` in the connection string with your actual password
10. Add to Vercel environment variables (see below)

**Connection String Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

---

### 2. **Neon** (Serverless PostgreSQL)

**Free Tier:**
- 512 MB storage
- 1 project
- Serverless (scales to zero when not in use)

**Setup:**

1. Go to [neon.tech](https://neon.tech/)
2. Sign up (free)
3. Click **"Create Project"**
4. Name: `nfl-tracker`
5. Region: Choose closest to you
6. Click **"Create Project"**
7. Copy the **Connection String**
8. Add to Vercel environment variables (see below)

**Connection String Format:**
```
postgresql://username:password@ep-xxxx.region.aws.neon.tech/neondb
```

---

### 3. **Railway** (Easy Setup)

**Free Tier:**
- $5 free credits per month
- Multiple databases
- Easy one-click deploy

**Setup:**

1. Go to [railway.app](https://railway.app/)
2. Sign up (free)
3. Click **"New Project"**
4. Click **"Provision PostgreSQL"**
5. Wait for it to provision
6. Click on the PostgreSQL service
7. Go to **"Connect"** tab
8. Copy **"Postgres Connection URL"**
9. Add to Vercel environment variables (see below)

---

### 4. **ElephantSQL** (Simple & Reliable)

**Free Tier:**
- 20 MB database
- Shared server
- Good for small projects

**Setup:**

1. Go to [elephantsql.com](https://www.elephantsql.com/)
2. Sign up (free)
3. Click **"Create New Instance"**
4. Name: `nfl-tracker`, Plan: **Tiny Turtle (Free)**
5. Select region, click **"Review"**
6. Click **"Create instance"**
7. Click on your new instance
8. Copy the **URL** connection string
9. Add to Vercel environment variables (see below)

---

### 5. **Vercel Postgres** (If you want to stay on Vercel)

**Free Tier:**
- 256 MB storage
- 60 hours compute time/month

**Setup:**

1. Go to Vercel project → **Storage** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Name it, choose region, click **"Create"**
5. Click **"Connect to Project"**
6. Select your project, choose environments
7. Click **"Connect"**
8. Done! (Auto-configured)

---

## Adding Database to Your App

### Step 1: Get Your Connection String

From any provider above, you should have a connection string like:
```
postgresql://username:password@host:5432/database
```

### Step 2: Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click **"Settings"**
3. Click **"Environment Variables"**
4. Click **"Add New"**
5. Enter:
   - **Key**: `DATABASE_URL`
   - **Value**: Your PostgreSQL connection string
   - **Environments**: Check all (Production, Preview, Development)
6. Click **"Save"**

### Step 3: Redeploy Your App

1. Go to **"Deployments"** tab
2. Click the three dots on latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

### Step 4: Test!

1. Visit your deployed app
2. Add a player
3. Refresh the page
4. Player should persist! ✅

---

## Local Development

To test locally with your PostgreSQL database:

### Option 1: Use Vercel CLI

```bash
# Pull environment variables
vercel env pull .env.local

# Run dev server
npm run dev
```

### Option 2: Manual .env.local

Create `.env.local` in your project root:

```env
DATABASE_URL=your_postgresql_connection_string_here
```

Then run:
```bash
npm run dev
```

---

## Database Structure

The app automatically creates this table:

```sql
CREATE TABLE watchlist_players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    team VARCHAR(100),
    position VARCHAR(50),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_checked TIMESTAMP,
    cached_data JSONB
);
```

**Columns:**
- `id`: Auto-increment primary key
- `name`: Player name (unique)
- `team`: Team name (optional)
- `position`: Player position (optional)
- `added_at`: When player was added to watchlist
- `last_checked`: Last time player data was updated
- `cached_data`: JSON object containing injury, news, podcast, YouTube, Reddit data

---

## Viewing Your Data

### Supabase
1. Go to your project
2. Click **"Table Editor"**
3. Select `watchlist_players` table

### Neon
1. Use their SQL Editor in the dashboard
2. Run: `SELECT * FROM watchlist_players;`

### Railway
1. Click on PostgreSQL service
2. Click **"Data"** tab
3. Browse tables

### Any Provider (SQL Client)
Use tools like:
- [pgAdmin](https://www.pgadmin.org/)
- [DBeaver](https://dbeaver.io/)
- [TablePlus](https://tableplus.com/)

Connect using your connection string.

---

## Backup & Export

### Supabase Backup
Automatic daily backups on free tier (7 days retention)

### Manual Backup (Any Provider)
```bash
# Using pg_dump
pg_dump -h your-host -U your-user -d your-database -t watchlist_players > backup.sql

# Restore
psql -h your-host -U your-user -d your-database < backup.sql
```

---

## Migration Between Providers

To switch PostgreSQL providers:

1. **Export data** from old provider:
   ```sql
   SELECT * FROM watchlist_players;
   ```
   Save as CSV or use `pg_dump`

2. **Set up new provider** (follow setup above)

3. **Update Vercel environment variable**:
   - Change `DATABASE_URL` to new connection string
   - Redeploy

4. **Import data** to new provider (if needed)

---

## Pricing Comparison

| Provider | Free Tier Storage | Free Tier Limits | Best For |
|----------|------------------|------------------|----------|
| **Supabase** | 500 MB | Unlimited requests | Best overall free tier |
| **Neon** | 512 MB | Serverless, auto-scale | Hobby projects |
| **Railway** | $5/month credit | ~3 GB with credits | Developer friendly |
| **ElephantSQL** | 20 MB | Shared server | Tiny projects |
| **Vercel Postgres** | 256 MB | 60 hours compute/month | If already on Vercel |

**Recommendation for this app:** **Supabase** (best free tier, great tools)

---

## Troubleshooting

### "Connection refused" error

**Solution:**
- Check your connection string is correct
- Make sure IP whitelist allows connections (Supabase/Railway)
- Verify firewall isn't blocking port 5432

### "SSL required" error

The app automatically handles SSL for production. If you have issues, the connection code already includes:
```javascript
ssl: { rejectUnauthorized: false }
```

### "Table does not exist" error

The app auto-creates the table on first run. If it fails:

1. Connect to your database using SQL client
2. Run this manually:
```sql
CREATE TABLE IF NOT EXISTS watchlist_players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    team VARCHAR(100),
    position VARCHAR(50),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_checked TIMESTAMP,
    cached_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_player_name ON watchlist_players(name);
```

### "Too many connections" error

**Solution:**
- Using connection pooling (included in code)
- On Neon: Their serverless automatically handles this
- On Supabase: Consider upgrading plan or using connection pooler

---

## Why Not Vercel KV?

You asked great question! Here's the comparison:

| Feature | PostgreSQL | Vercel KV |
|---------|-----------|-----------|
| **Portability** | ✅ Works anywhere | ❌ Vercel only |
| **SQL Queries** | ✅ Full SQL support | ❌ Key-value only |
| **Cost** | ✅ Many free options | ⚠️ Vercel-tied pricing |
| **Migration** | ✅ Easy to export/import | ❌ Vendor lock-in |
| **Tools** | ✅ Tons of SQL tools | ⚠️ Limited tooling |

PostgreSQL gives you **freedom** and **flexibility**!

---

## Summary: Quick Start

1. Choose a provider (recommend **Supabase**)
2. Create free database
3. Copy connection string
4. Add to Vercel as `DATABASE_URL` environment variable
5. Redeploy
6. Done! 🎉

Your watchlist will persist forever, and you can switch providers anytime!

---

## Questions?

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Docs](https://supabase.com/docs)
- [Neon Docs](https://neon.tech/docs/introduction)

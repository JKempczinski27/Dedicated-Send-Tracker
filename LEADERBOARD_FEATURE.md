# League-Wide Sentiment Leaderboard Feature

## Overview

The **League-Wide Sentiment Leaderboard** is a major new feature that automatically tracks sentiment for **ALL active NFL players** (approximately 1,700 players) and displays the top performers in a real-time dashboard.

## ⚠️ Vercel Plan Compatibility

This feature is configured for **Vercel Hobby (Free) Plan** which allows only daily cron jobs.

| Vercel Plan | Cron Frequency | Batch Size | Daily Coverage | Full Coverage |
|-------------|---------------|------------|----------------|---------------|
| **Hobby (Free)** | Once daily | 75 players | 75 players/day | ~23 days |
| **Pro** | Every 15 min | 15 players | ~1,440 players/day | 1-2 days |

**Current Configuration:** Hobby Plan (daily processing at 4:00 AM)

To upgrade to faster processing, upgrade to Vercel Pro and change the cron schedule in `vercel.json`.

## Features

### 1. **Automatic Roster Sync**
- Fetches ALL active players from the NFL Official API
- Syncs 32 NFL team rosters to the database
- Updates player information daily
- No rate limits on NFL API (full access)

### 2. **Smart Priority Queue**
The system uses an intelligent priority system to manage rate-limited sentiment sources:

**Priority Tier 1 (Highest):**
- Starting QBs, RBs, WRs, TEs
- Updated every 6 hours

**Priority Tier 2 (Medium):**
- Other starters and notable backups
- Updated every 12 hours

**Priority Tier 3 (Low):**
- Bench players, practice squad
- Updated every 24-48 hours

**Special Priority:**
- Players with breaking news (injury keywords detected)
- Never-analyzed players (highest priority)

### 3. **Batch Processing**
- **Hobby Plan:** Processes 75 players once daily at 4:00 AM
- **Pro Plan:** Can process 15 players every 15 minutes (96 batches/day)
- Respects NewsAPI rate limits (100 requests/hour on free tier)
- Graceful error handling for failed requests

### 4. **Real-Time Dashboard**
- Top 5 Best Sentiment (green bars)
- Top 5 Worst Sentiment (red bars)
- Overall league statistics
- Auto-refreshes every 5 minutes

## Database Schema

### `all_players` Table
Stores all NFL players from roster sync:
- `nfl_id`: Unique player identifier from NFL API
- `name`: Player display name
- `team`: Team abbreviation (e.g., "KC", "SF")
- `position`: Normalized position (QB, RB, WR, etc.)
- `status`: Roster status (ACT, RES, PRA)
- `is_starter`: Boolean flag for starters
- `priority_tier`: 1-3 priority level
- `last_sentiment_update`: Timestamp of last analysis

### `sentiment_scores` Table
Stores sentiment analysis results:
- `player_id`: Foreign key to all_players
- `sentiment_score`: Overall sentiment (-10 to +10)
- `article_count`: Number of articles analyzed
- `positive_count`, `neutral_count`, `negative_count`: Breakdown
- `has_breaking_news`: Boolean flag for injury news
- `news_data`: JSONB with full article data
- `analyzed_at`: Timestamp of analysis

### `sentiment_queue` Table
Manages processing queue:
- `player_id`: Player to process
- `priority`: 1-3 priority level
- `status`: pending, processing, or completed
- `retry_count`: Number of failed attempts
- `last_attempt`: Timestamp of last attempt

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel Cron Jobs                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Roster Sync (Daily at 3:00 AM)                              │
│     └─> /api/cron/sync-rosters                                  │
│         └─> RosterSyncService.fetchAllPlayers()                 │
│             └─> LeaderboardManager.syncPlayers()                │
│                 └─> Queue high-priority players                 │
│                                                                   │
│  2. Sentiment Processing (Daily at 4:00 AM - Hobby Plan)       │
│     └─> /api/cron/process-sentiment                             │
│         └─> LeaderboardManager.getNextBatch(75)                 │
│             └─> SentimentBatchProcessor.processBatch()          │
│                 └─> NewsTracker.searchNews() (rate-limited)     │
│                     └─> LeaderboardManager.updateSentiment()    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend Dashboard                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  SentimentLeaderboard Component                                 │
│  └─> Fetches from /api/leaderboard                              │
│      └─> Displays Top 5 / Bottom 5                              │
│          └─> Auto-refreshes every 5 minutes                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### `GET /api/leaderboard`
Returns the current leaderboard data.

**Response:**
```json
{
  "success": true,
  "leaderboard": {
    "topPositive": [
      {
        "id": 123,
        "name": "Patrick Mahomes",
        "team": "KC",
        "position": "QB",
        "sentiment_score": 8.5,
        "article_count": 25,
        "analyzed_at": "2024-01-15T12:00:00Z"
      }
    ],
    "topNegative": [...],
    "totalTracked": 450
  },
  "stats": {
    "totalPlayers": 1700,
    "trackedPlayers": 450,
    "positiveCount": 250,
    "negativeCount": 200,
    "avgSentiment": "1.25"
  }
}
```

### `POST /api/cron/sync-rosters`
Syncs all NFL rosters from the official API.
**Auth:** Requires `CRON_SECRET` in Authorization header.

### `POST /api/cron/process-sentiment`
Processes next batch of players for sentiment analysis.
**Auth:** Requires `CRON_SECRET` in Authorization header.

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string (Neon/Supabase)
- `CRON_SECRET` - Secret token for authenticating cron jobs
- `NFL_CLIENT_KEY` - NFL API client key (already configured)
- `NFL_CLIENT_SECRET` - NFL API client secret (already configured)

### Optional
- `NEWS_API_KEY` - NewsAPI key for sentiment analysis
  - Without this, leaderboard will show 0 scores
  - Free tier: 100 requests/hour

## Vercel Cron Configuration

Added to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-rosters",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/process-sentiment",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Schedule Explanation:**
- Roster sync: Daily at 3:00 AM ET
- Sentiment processing: Daily at 4:00 AM ET (Hobby plan)

## Rate Limit Management

The system is designed to work within NewsAPI free tier limits:

- **NewsAPI Free Tier:** 100 requests/hour
- **Hobby Plan Usage:** 75 players once per day (well within limits)
- **Pro Plan Usage:** 15 players × 4 times/hour = 60 requests/hour

**Hobby Plan Timeline:**
- Day 1: 75 high-priority players (QB/RB/WR starters)
- Week 1: ~525 players analyzed
- Month 1: Full coverage of all 1,700 players
- Ongoing: High-priority players re-analyzed more frequently

## How to Deploy

1. **Set Environment Variables in Vercel:**
   ```bash
   CRON_SECRET=<generate-random-secret>
   DATABASE_URL=<your-postgres-url>
   NEWS_API_KEY=<your-newsapi-key>
   ```

2. **Push to Vercel:**
   ```bash
   git push origin claude/sentiment-leaderboard-1UW41
   ```

3. **Verify Deployment:**
   - Check Vercel dashboard for cron job status
   - Monitor logs for successful roster sync
   - Check database for populated tables

4. **Initial Setup:**
   - First roster sync runs at 3:00 AM (next morning after deploy)
   - Sentiment processing runs at 4:00 AM
   - Leaderboard will show first data the next morning
   - **Tip:** Manually trigger cron jobs in Vercel dashboard to test immediately

## Monitoring

### Check Cron Job Logs
```bash
vercel logs --follow
```

### Check Database
```sql
-- Check player count
SELECT COUNT(*) FROM all_players;

-- Check sentiment coverage
SELECT
  COUNT(*) as total_players,
  COUNT(CASE WHEN last_sentiment_update IS NOT NULL THEN 1 END) as analyzed
FROM all_players;

-- Check leaderboard
SELECT name, team, sentiment_score, article_count
FROM all_players p
JOIN sentiment_scores s ON p.id = s.player_id
ORDER BY sentiment_score DESC
LIMIT 10;
```

## Troubleshooting

### Issue: Leaderboard shows "No Data"
- **Cause:** Cron jobs haven't run yet (runs at 3-4 AM) or NewsAPI key missing
- **Solution:** Wait until next morning, or manually trigger cron in Vercel dashboard

### Issue: Only a few players analyzed
- **Cause:** Normal on Hobby plan - processes 75 players per day
- **Solution:** Expected behavior, full coverage takes ~23 days. High-priority players appear first.

### Issue: Cron job 401 Unauthorized
- **Cause:** CRON_SECRET not set or incorrect
- **Solution:** Set CRON_SECRET in Vercel environment variables

### Issue: No roster data synced
- **Cause:** NFL API credentials missing or invalid
- **Solution:** Verify NFL_CLIENT_KEY and NFL_CLIENT_SECRET

## Future Enhancements

Potential improvements:
- Add Reddit/YouTube sentiment sources (when APIs available)
- Implement sentiment trend analysis (week-over-week)
- Add player comparison view
- Export leaderboard to CSV
- Email alerts for sentiment changes
- Team-based leaderboards

## File Structure

```
├── leaderboard-manager.js           # Database operations
├── roster-sync-service.js           # NFL API roster fetcher
├── sentiment-batch-processor.js     # Batch sentiment analysis
├── pages/
│   ├── api/
│   │   ├── leaderboard.js           # Leaderboard API endpoint
│   │   └── cron/
│   │       ├── sync-rosters.js      # Roster sync cron
│   │       └── process-sentiment.js # Sentiment cron
│   └── index.js                     # Updated with Leaderboard tab
├── components/
│   └── SentimentLeaderboard.js      # React component
└── vercel.json                      # Cron configuration
```

## Summary

This feature scales your NFL tracking from a manual watchlist to **automatic league-wide coverage**, using smart prioritization to work within API rate limits while ensuring all players eventually get analyzed.

The system is:
- ✅ Fully automated (no manual intervention)
- ✅ Cost-effective (works with free tiers)
- ✅ Scalable (handles 1,700+ players)
- ✅ Intelligent (priority-based processing)
- ✅ Production-ready (error handling, monitoring)

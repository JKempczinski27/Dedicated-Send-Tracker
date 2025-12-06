# NFL Injury Tracker & Social Media Monitor

A comprehensive JavaScript tracker that monitors NFL player injury statuses, tracks news coverage with sentiment analysis, searches podcast mentions, and monitors social media discussions across YouTube and Reddit.

## Features

### 📊 Player Watchlist Dashboard (NEW!)
- Create a personalized watchlist of players to monitor
- View all players at once with key metrics prominently displayed
- Track injury status, sentiment scores, and social media mentions
- Beautiful HTML dashboard with visual charts
- Persistent storage - your watchlist is saved between sessions

### 🏈 Basic Injury Tracking
- View all current NFL player injuries
- Search for specific player injury status
- Organized display by team
- Real-time injury updates

### 📰 News Sentiment Analysis
- Search news articles about players
- AI-powered sentiment analysis (Positive/Negative/Neutral)
- Compare **national vs local coverage** sentiment
- Track how media narrative changes over time
- Identify coverage bias between national and local publications

### 🎙️ Podcast Mention Tracking
- Search popular NFL podcasts via RSS feeds
- Track mentions in episode titles and descriptions
- Monitor podcasts including:
  - Around the NFL
  - The Pat McAfee Show
  - NFL Fantasy Football Podcast
  - Good Morning Football
  - And more...

### 📺 YouTube Video Search
- Search NFL-related YouTube channels
- Find video mentions of specific players
- Track popular NFL content creators

### 💬 Reddit Discussion Monitoring
- Search r/NFL and other sports subreddits
- Track fan discussions and reactions
- View post scores, comments, and user flairs
- Monitor team-specific subreddits

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure API Keys:**

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
# Required
NFL_API_KEY=your_sportsdata_api_key

# Optional (for enhanced features)
YOUTUBE_API_KEY=your_youtube_api_key
NEWS_API_KEY=your_news_api_key
```

**Getting API Keys:**
- **NFL API** (Required): [SportsData.io](https://sportsdata.io/)
- **News API** (Optional): [NewsAPI.org](https://newsapi.org/) - Free tier available
- **YouTube API** (Optional): [Google Developers Console](https://console.developers.google.com/)
- **Reddit**: No API key required!

## Usage

### Basic Injury Tracker

View all injuries:
```bash
npm start
```

Search for a specific player:
```bash
npm start Patrick Mahomes
```

### Enhanced Comprehensive Tracker

Get complete coverage analysis for a player:
```bash
npm run track "Patrick Mahomes"
```

or

```bash
node enhanced-tracker.js "Patrick Mahomes"
```

This will display:
- ⚕️ Current injury status
- 📰 News sentiment analysis with national vs local comparison
- 🎙️ Recent podcast mentions
- 📺 YouTube video coverage
- 💬 Reddit discussions

### Player Watchlist Dashboard

**NEW!** Create a personalized dashboard to monitor multiple players at once:

**Add players to your watchlist:**
```bash
npm run dashboard add "Patrick Mahomes"
npm run dashboard add "Josh Allen"
npm run dashboard add "Travis Kelce"
```

**View your dashboard:**
```bash
npm run dashboard
```

This displays all tracked players with:
- 🏥 Injury status (healthy/injured with details)
- 📰 News sentiment scores and national vs local comparison
- 💬 Social media mention counts (podcasts, YouTube, Reddit)
- 🕐 Last update timestamps

**Dashboard Commands:**
```bash
npm run dashboard              # Update and show dashboard
npm run dashboard add "Name"   # Add player to watchlist
npm run dashboard remove "Name" # Remove player from watchlist
npm run dashboard list         # List all tracked players
npm run dashboard show         # Show cached data (no update)
npm run dashboard update       # Force update all players
npm run dashboard clear        # Clear entire watchlist
```

**Generate HTML Dashboard:**

For a beautiful visual dashboard that opens in your browser:
```bash
npm run html
```

This creates `dashboard.html` with:
- 🎨 Beautiful gradient design
- 📊 Visual sentiment breakdown bars
- 📈 National vs local comparison charts
- 📱 Responsive layout
- ⚡ Interactive hover effects

Simply open the generated `dashboard.html` file in your web browser!

## Output Examples

### News Sentiment Analysis
```
📰 Analyzing news coverage...
   Found 23 articles (last 7 days)

   📊 OVERALL SENTIMENT: Positive (2.3)
      Positive: 65.2%
      Neutral:  21.7%
      Negative: 13.1%

   🔍 COVERAGE COMPARISON:
      National (15 articles): Neutral (0.8)
      Local (8 articles): Positive (3.5)
      Difference: 2.7 points

   📑 RECENT HEADLINES:
      ➕ [4] "Mahomes leads Chiefs to victory despite ankle concern"
         ESPN (national) - 12/04/2024
      ➖ [-2] "Injury may sideline QB for Sunday's game"
         Kansas City Star (local) - 12/03/2024
```

### Podcast Mentions
```
🎙️ Searching podcast mentions...
   Found mentions in 3 podcast(s):

   🎧 The Pat McAfee Show
      • Mahomes Injury Update & AFC Playoff Picture
        12/04/2024
      • Chiefs QB Status for Week 14
        12/03/2024
```

### Reddit Discussions
```
💬 Searching Reddit discussions...
   Found 8 recent discussions:

   💬 [Schefter] Patrick Mahomes listed as questionable
      r/nfl • 2,341 points • 487 comments
      https://www.reddit.com/r/nfl/...
```

## Project Structure

```
.
├── injury-tracker.js          # Basic injury tracker (original)
├── enhanced-tracker.js        # Comprehensive multi-platform tracker
├── dashboard.js               # Player watchlist dashboard (CLI)
├── html-dashboard.js          # HTML dashboard generator
├── watchlist-manager.js       # Watchlist persistence manager
├── news-tracker.js            # News API with sentiment analysis
├── podcast-tracker.js         # RSS podcast feed monitor
├── youtube-tracker.js         # YouTube video search
├── reddit-tracker.js          # Reddit discussion tracker
├── package.json               # Dependencies
├── watchlist.json             # Your saved player watchlist (auto-generated)
├── dashboard.html             # Visual HTML dashboard (auto-generated)
└── README.md                  # This file
```

## API Information

### Required APIs
- **SportsData.io NFL API**: Provides injury data, player info, and team stats

### Optional APIs
- **News API**: Searches news articles from thousands of sources
- **YouTube Data API**: Searches videos and channels
- **Reddit API**: Public JSON feeds (no authentication required)

## Features Breakdown

### Sentiment Analysis
- Analyzes positive/negative tone of news articles
- Compares sentiment between national and local publications
- Tracks sentiment trends over time
- Helps identify media bias and narrative framing

### Source Classification
- **National Sources**: ESPN, Fox Sports, CBS Sports, Bleacher Report, etc.
- **Local Sources**: Team city newspapers, regional sports networks
- **Comparison Metrics**: Average sentiment, article count, tone differences

### Podcast Tracking
- RSS feed parsing for major NFL podcasts
- Searches episode titles and descriptions
- No API key required
- Updates in real-time as new episodes release

### Reddit Monitoring
- Searches multiple NFL subreddits
- Includes r/nfl, r/fantasyfootball, team subreddits
- Shows upvotes, comments, and user flairs
- No authentication needed

## Limitations

- **YouTube transcripts**: Requires additional setup for full transcript search
- **Reddit location data**: Not available through API
- **News API**: Free tier has rate limits (100 requests/day)
- **Podcast transcripts**: Only searches titles/descriptions, not full audio

## Future Enhancements

Potential features to add:
- [ ] Full YouTube transcript search
- [ ] Twitter/X integration (requires paid API)
- [ ] Historical sentiment tracking with charts
- [ ] Alert system for breaking injury news
- [ ] Web dashboard for visual analytics
- [ ] Player photo integration from NFL API

## License

ISC

## Contributing

Feel free to submit issues or pull requests!
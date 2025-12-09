# YouTube Podcast Transcript Tracking

This feature enables tracking and sentiment analysis of NFL player discussions in YouTube podcast content by fetching video transcripts and analyzing sentiment.

## Overview

The enhanced YouTube tracker can:
- ✅ Fetch transcripts from YouTube videos
- ✅ Distinguish between podcast content and regular videos/highlights
- ✅ Perform sentiment analysis on transcript content
- ✅ Extract player-specific mentions with contextual sentiment
- ✅ Filter and prioritize podcast-style content

## Features

### 1. Transcript Fetching

Automatically fetches and analyzes video transcripts using the `youtube-transcript` package.

**Returns:**
- Full transcript text
- Word count and duration
- Overall sentiment analysis (score, label, positive/negative words)
- Player-specific mentions with surrounding context

### 2. Podcast Detection

Uses a multi-factor scoring system to distinguish podcast content from highlights/clips:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Duration** | +3 | Videos 30+ minutes (strong podcast indicator) |
| **Known Channels** | +3 | Pat McAfee Show, Around the NFL, etc. |
| **Title Patterns** | +2 | "Episode", "Ep.", "Full Show", "Interview", etc. |
| **Description** | +1 | Contains "podcast" or "full episode" |
| **Avoid Patterns** | -2 | "Highlight", "Clip", "Recap", "Top 10", etc. |

**Threshold:** Score ≥ 4 = Podcast content

### 3. Sentiment Analysis

Applied at two levels:

#### Overall Transcript Sentiment
Analyzes the entire video transcript for general tone.

#### Player-Specific Context Sentiment
- Extracts sentences mentioning the player (by full name or last name)
- Analyzes sentiment of surrounding context (±1 sentence)
- Provides focused sentiment on player-specific discussions

**Sentiment Labels:**
- Very Positive (score > 2)
- Positive (score > 0)
- Neutral (score = 0)
- Negative (score > -2)
- Very Negative (score ≤ -2)

## Usage

### Basic Usage

```javascript
const YouTubeTracker = require('./youtube-tracker');

const tracker = new YouTubeTracker(process.env.YOUTUBE_API_KEY);

// Search for podcast content with transcripts
const podcasts = await tracker.searchPodcastsWithTranscripts('Patrick Mahomes', 5);

podcasts.forEach(podcast => {
    console.log(`Title: ${podcast.title}`);
    console.log(`Sentiment: ${podcast.transcript.sentiment.label}`);
    console.log(`Player mentions: ${podcast.transcript.playerContext.count}`);
});
```

### Advanced Usage

#### Fetch Transcript for Specific Video

```javascript
// Get transcript with player context
const transcript = await tracker.getVideoCaptions('VIDEO_ID', 'Patrick Mahomes');

if (transcript.available) {
    console.log(`Overall Sentiment: ${transcript.sentiment.label}`);
    console.log(`Word Count: ${transcript.wordCount}`);

    // Player-specific mentions
    transcript.playerContext.mentions.forEach(mention => {
        console.log(`Context: ${mention.context}`);
        console.log(`Sentiment: ${mention.sentiment.label}`);
    });
}
```

#### Check if Video is Podcast Content

```javascript
const videoDetails = await tracker.getVideoDetails('VIDEO_ID');
const isPodcast = await tracker.isPodcastContent(videoDetails);

console.log(`Is Podcast: ${isPodcast}`);
```

## API Methods

### `searchPodcastsWithTranscripts(playerName, maxResults = 5)`

Searches for podcast content about a player and fetches transcripts with sentiment analysis.

**Parameters:**
- `playerName` (string): Player's full name
- `maxResults` (number): Maximum podcasts to return (default: 5)

**Returns:** Array of podcast objects with transcript and sentiment data

### `getVideoCaptions(videoId, playerName = '')`

Fetches transcript for a specific video with sentiment analysis.

**Parameters:**
- `videoId` (string): YouTube video ID
- `playerName` (string, optional): Player name for context extraction

**Returns:** Transcript object with sentiment and player context

### `isPodcastContent(video)`

Determines if a video is podcast content using metadata analysis.

**Parameters:**
- `video` (object): Video object with title, description, channelId

**Returns:** Boolean indicating if video is podcast content

### `getVideoDetails(videoId)`

Fetches detailed video information including duration.

**Parameters:**
- `videoId` (string): YouTube video ID

**Returns:** Video details object with duration, channel, title, etc.

## Example Output

```javascript
{
  title: "The Pat McAfee Show | Wednesday, December 6th, 2023",
  channelTitle: "The Pat McAfee Show",
  publishedAt: "12/6/2023",
  url: "https://www.youtube.com/watch?v=...",
  isPodcast: true,
  transcript: {
    available: true,
    wordCount: 12543,
    duration: 7245,
    sentiment: {
      score: 3,
      comparative: 0.0002,
      label: "Very Positive",
      positive: ["great", "amazing", "excellent", "win"],
      negative: ["injury", "hurt"]
    },
    playerContext: {
      count: 5,
      mentions: [
        {
          context: "Patrick Mahomes looked absolutely incredible out there. The way he extended plays and found receivers was just elite quarterback play.",
          sentiment: {
            score: 4,
            comparative: 0.15,
            label: "Very Positive"
          }
        }
      ]
    }
  }
}
```

## Podcast Channels Currently Tracked

- Pat McAfee Show
- Around the NFL
- Good Morning Football
- NFL Network
- NFL Official Channel

## Configuration

### Adding Podcast Channels

Edit `youtube-tracker.js` to add more podcast channels:

```javascript
this.podcastChannels = [
    'UCxdQI43w4AgkXwEHhPj6Zhg', // Pat McAfee Show
    'UCqFMzb-4AUf6WAIbl132QKA', // Around the NFL
    'YOUR_CHANNEL_ID_HERE',      // Your Podcast Channel
];
```

### Adjusting Podcast Duration Threshold

Default is 30 minutes (1800 seconds):

```javascript
// In constructor
this.minPodcastDuration = 1800; // Change to desired seconds
```

## Testing

Run the test script to verify functionality:

```bash
node test-youtube-podcasts.js
```

**Prerequisites:**
- YouTube Data API key in `.env` file
- Active internet connection
- Videos with available transcripts

## Limitations

1. **Transcript Availability**: Not all videos have transcripts available
   - Requires video owner to enable captions
   - Auto-generated captions must be available

2. **API Rate Limits**: YouTube Data API has quotas
   - 10,000 units per day (free tier)
   - Each video details request costs 1 unit
   - Transcript fetching uses unofficial API (no quota impact)

3. **Language**: Currently only supports English transcripts

4. **Accuracy**: Podcast detection is heuristic-based
   - May occasionally misclassify content
   - Threshold can be adjusted for precision/recall trade-off

## Integration with Enhanced Tracker

The YouTube tracker is integrated into the main `enhanced-tracker.js`:

```javascript
const EnhancedTracker = require('./enhanced-tracker');

const tracker = new EnhancedTracker({
    nflApiKey: process.env.NFL_API_KEY,
    newsApiKey: process.env.NEWS_API_KEY,
    youtubeApiKey: process.env.YOUTUBE_API_KEY
});

// Automatically includes podcast transcript analysis
const playerData = await tracker.trackPlayer('Patrick Mahomes');

// Access podcast data with sentiment
console.log(playerData.youtube.podcasts);
```

## Performance Considerations

- **Rate Limiting**: Built-in delays between API requests (500ms)
- **Selective Fetching**: Only fetches transcripts for detected podcast content
- **Caching**: Consider caching transcript data to avoid repeated fetches
- **Async Processing**: All methods are async for non-blocking operation

## Troubleshooting

### "No transcript available"

**Causes:**
- Video doesn't have captions enabled
- Captions are manually uploaded only (not auto-generated)
- Age-restricted or private videos

**Solution:** The tracker gracefully handles this and continues to next video

### "API request failed"

**Causes:**
- Invalid or missing YouTube API key
- Rate limit exceeded
- Network connectivity issues

**Solution:** Check `.env` file has valid `YOUTUBE_API_KEY`

### Podcast detection not accurate

**Solution:** Adjust scoring thresholds in `isPodcastContent()` method:
- Increase threshold for more precision (fewer false positives)
- Decrease threshold for more recall (catch more podcasts)

## Future Enhancements

Potential improvements:
- [ ] Support for multiple languages
- [ ] Playlist-based podcast detection
- [ ] Temporal sentiment analysis (track sentiment over time)
- [ ] Speaker diarization (identify who said what)
- [ ] Topic extraction (identify main discussion topics)
- [ ] Comparative analysis across multiple podcasts

## Related Documentation

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [youtube-transcript Package](https://www.npmjs.com/package/youtube-transcript)
- [sentiment Package](https://www.npmjs.com/package/sentiment)

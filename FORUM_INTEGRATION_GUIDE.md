# Multi-Source Sentiment Analysis Guide

## Overview

Your sentiment analysis now **aggregates data from 3 sources**:
- **News** (50% weight) - NewsAPI articles
- **Reddit** (30% weight) - r/NFL discussions
- **Forums** (20% weight) - Message boards (RealGM, team forums, etc.)

## ✅ What's Already Implemented

### 1. Multi-Source Architecture
The `SentimentBatchProcessor` now pulls from:
```
Player Sentiment Analysis
├─ 50% News (NewsAPI)
├─ 30% Reddit (r/NFL posts)
└─ 20% Forums (message boards)
    └─ Weighted average = Final Score
```

### 2. Enable/Disable Sources
In `sentiment-batch-processor.js`:
```javascript
this.sources = {
    news: true,      // NewsAPI
    reddit: true,    // Reddit
    forums: true     // Set to false to disable forum scraping
};
```

### 3. Graceful Fallbacks
- If one source fails, others still work
- Missing data sources get 0 weight
- Continues processing even if forums are down

## 🛠️ Adding Real Forum Scraping

The `ForumTracker` class is a **template** - you need to add actual scraping logic.

### Option 1: Use Puppeteer (Recommended for Dynamic Sites)

**Install:**
```bash
npm install puppeteer cheerio
```

**Update `forum-tracker.js`:**
```javascript
const puppeteer = require('puppeteer');

async searchRealGM(playerName, maxResults) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to forum search
    const searchUrl = `https://forums.realgm.com/boards/search.php?searchid=${encodeURIComponent(playerName)}`;
    await page.goto(searchUrl);

    // Extract posts
    const posts = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('.post').forEach(post => {
            results.push({
                title: post.querySelector('.post-title')?.innerText,
                content: post.querySelector('.post-content')?.innerText,
                author: post.querySelector('.post-author')?.innerText,
                date: post.querySelector('.post-date')?.innerText
            });
        });
        return results;
    });

    await browser.close();

    return posts.slice(0, maxResults).map(p => ({
        ...p,
        source: 'RealGM'
    }));
}
```

### Option 2: Use Cheerio (For Static Sites)

**Install:**
```bash
npm install cheerio axios
```

**Example:**
```javascript
const cheerio = require('cheerio');
const axios = require('axios');

async searchRealGM(playerName, maxResults) {
    const searchUrl = `https://forums.realgm.com/boards/search.php?query=${encodeURIComponent(playerName)}`;

    const response = await axios.get(searchUrl, {
        headers: { 'User-Agent': this.userAgent }
    });

    const $ = cheerio.load(response.data);
    const posts = [];

    $('.forum-post').each((i, elem) => {
        if (i >= maxResults) return false;

        posts.push({
            title: $(elem).find('.post-title').text(),
            content: $(elem).find('.post-content').text(),
            author: $(elem).find('.post-author').text(),
            date: $(elem).find('.post-date').text(),
            source: 'RealGM'
        });
    });

    return posts;
}
```

## 🎯 Recommended NFL Forums to Add

### Tier 1: High-Quality Sources
| Forum | Type | Difficulty | Value |
|-------|------|------------|-------|
| **Reddit (r/NFL)** | ✅ Already integrated | Easy | ⭐⭐⭐⭐⭐ |
| **RealGM Forums** | Scraping needed | Medium | ⭐⭐⭐⭐ |
| **ProFootballTalk Comments** | Scraping needed | Easy | ⭐⭐⭐ |

### Tier 2: Team-Specific Forums
These have passionate fans with strong opinions:
- **Chiefs Planet** (chiefsplanet.com) - Kansas City
- **CowboysZone** (cowboyszone.com) - Dallas
- **JetsInsider** (forums.jetnation.com) - NY Jets
- **PackersHome** (packershome.com) - Green Bay

**Add team forums:**
```javascript
// In forum-tracker.js
this.forums = {
    realgm: { baseUrl: 'https://forums.realgm.com', enabled: true },
    chiefsplanet: { baseUrl: 'https://chiefsplanet.com', enabled: true },
    cowboyszone: { baseUrl: 'https://cowboyszone.com', enabled: true }
    // Add more...
};
```

### Tier 3: Advanced Sources
| Source | Complexity | Worth It? |
|--------|-----------|-----------|
| **Discord Servers** | Hard (need bot) | ⭐⭐⭐⭐⭐ (real-time) |
| **Facebook Groups** | Very Hard | ⭐⭐ (privacy issues) |
| **Twitter/X** | Medium (API $) | ⭐⭐⭐⭐⭐ (trending) |

## 🔧 How to Test Forum Integration

### 1. Quick Test (Single Player)
```bash
# Test the forum tracker directly
node -e "
const ForumTracker = require('./forum-tracker');
const tracker = new ForumTracker();
tracker.searchForums('Patrick Mahomes', 10).then(console.log);
"
```

### 2. Test in Batch Processor
```bash
# Temporarily set batchSize to 1 for testing
# In pages/api/cron/process-sentiment.js:
const batchSize = 1;  // Just test one player

# Then manually trigger the cron job in Vercel
```

### 3. Check Logs
```bash
vercel logs --follow
```

Look for:
```
[Player Name]
  📰 News: 5.2 (12 articles)
  💬 Reddit: 3.1 (8 posts)
  🗣️  Forums: 2.4 (5 posts)
  📊 OVERALL: 4.1 (25 total items)
```

## ⚙️ Configuration Options

### Adjust Source Weights
In `sentiment-batch-processor.js`:
```javascript
// Current weights
const newsWeight = 0.5;    // 50%
const redditWeight = 0.3;  // 30%
const forumWeight = 0.2;   // 20%

// Example: Make forums more important
const newsWeight = 0.4;    // 40%
const redditWeight = 0.3;  // 30%
const forumWeight = 0.3;   // 30%
```

### Disable Forums Temporarily
```javascript
this.sources = {
    news: true,
    reddit: true,
    forums: false  // Disable while building scraper
};
```

### Control Forum Result Count
```javascript
// In analyzePlayerSentiment()
const forumData = await this.forumTracker.searchForums(player.name, 15);
//                                                                    ^^
//                                                          Change this number
```

## 📊 Expected Output

### Before (News Only)
```
Patrick Mahomes
  📰 News: 6.5 (18 articles)
  📊 OVERALL: 6.5 (18 total items)
```

### After (Multi-Source)
```
Patrick Mahomes
  📰 News: 6.5 (18 articles)
  💬 Reddit: 4.2 (12 posts)
  🗣️  Forums: 3.8 (8 posts)
  📊 OVERALL: 5.4 (38 total items)
```

## 🚨 Rate Limiting & Ethics

### Be Respectful
1. **Add delays** between requests:
```javascript
await this.delay(2000);  // 2 second delay
```

2. **Use proper User-Agent**:
```javascript
'User-Agent': 'NFLSentimentBot/1.0 (contact@yoursite.com)'
```

3. **Cache results**:
```javascript
// Don't scrape same forum twice in one day
if (this.cache[forumKey] && Date.now() - this.cache[forumKey].time < 86400000) {
    return this.cache[forumKey].data;
}
```

4. **Respect robots.txt**:
```bash
curl https://forums.realgm.com/robots.txt
```

### Rate Limit Guidelines
- **RealGM**: 1 request per 2 seconds
- **Team Forums**: 1 request per 3 seconds
- **Reddit**: Already rate-limited in RedditTracker

## 🐛 Troubleshooting

### Issue: Forums return empty data
**Solution:**
```javascript
// Add debug logging
console.log('Forum HTML:', html.substring(0, 500));
console.log('Posts found:', posts.length);
```

### Issue: Scraping blocked (403/429)
**Solutions:**
- Use rotating User-Agents
- Add longer delays
- Use Puppeteer with headless browser
- Consider using a proxy service

### Issue: Sentiment score seems wrong
**Check:**
```javascript
// Log individual source scores
console.log('News score:', newsData.analysis.overallSentiment.score);
console.log('Reddit score:', redditSentiment.score);
console.log('Forum score:', forumData.sentiment.score);
console.log('Weighted:', overallScore);
```

## 📝 Next Steps

1. **Start Simple**: Enable Reddit only (already working)
2. **Add One Forum**: Implement RealGM scraper
3. **Test Thoroughly**: Run on 10 players, verify output
4. **Scale Up**: Add more team forums
5. **Monitor Performance**: Check Vercel function duration

## 🎓 Learning Resources

### Web Scraping
- [Puppeteer Docs](https://pptr.dev/)
- [Cheerio GitHub](https://github.com/cheeriojs/cheerio)
- [Web Scraping Best Practices](https://www.scrapehero.com/web-scraping-best-practices/)

### Sentiment Analysis
- [Sentiment NPM](https://www.npmjs.com/package/sentiment)
- [Natural Language Processing Basics](https://github.com/NaturalNode/natural)

## 💡 Pro Tips

### 1. Test Locally First
```bash
# Test scraping before deploying
node test-forum-scraper.js
```

### 2. Use Environment Variables
```javascript
// In .env
ENABLE_FORUMS=true
FORUM_DELAY_MS=2000

// In code
this.sources.forums = process.env.ENABLE_FORUMS === 'true';
```

### 3. Monitor Costs
- Vercel functions have execution time limits (10s on Hobby)
- Each forum scrape adds ~1-2 seconds
- 75 players × 3 sources = may need Pro plan for longer timeouts

### 4. Consider Pre-Processing
Instead of scraping in real-time:
1. Run a separate nightly job to scrape forums
2. Store results in database
3. Use cached forum data in sentiment analysis

This is **faster** and more **reliable**!

## ✅ Summary

You now have:
- ✅ Multi-source sentiment (News + Reddit + Forums)
- ✅ Weighted aggregation (customizable)
- ✅ Graceful fallbacks (missing sources don't break)
- ✅ Template for adding forum scrapers
- ✅ Reddit already working out of the box!

**Ready to deploy** - just need to implement the actual forum scraping logic for the specific sites you want!

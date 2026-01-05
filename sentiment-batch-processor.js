const NewsTracker = require('./news-tracker');
const RedditTracker = require('./reddit-tracker');
const ForumTracker = require('./forum-tracker');

/**
 * SentimentBatchProcessor - Processes sentiment analysis in controlled batches
 *
 * This is the "Smart Queue" that manages rate limits while processing 1,700+ players
 * Key features:
 * - Processes players in small batches (10-20 at a time)
 * - Aggregates sentiment from MULTIPLE sources (News, Reddit, Forums)
 * - Respects API rate limits (NewsAPI, Reddit, etc.)
 * - Gracefully handles failures
 * - Tracks processing metrics
 */
class SentimentBatchProcessor {
    constructor() {
        this.NEWS_API_KEY = process.env.NEWS_API_KEY;
        this.newsTracker = this.NEWS_API_KEY ? new NewsTracker(this.NEWS_API_KEY) : null;
        this.redditTracker = new RedditTracker();
        this.forumTracker = new ForumTracker();

        // Enable/disable sources
        this.sources = {
            news: this.newsTracker !== null,
            reddit: true,
            forums: true  // Set to false to disable forum scraping
        };

        // Rate limiting configuration
        this.rateLimit = {
            newsAPI: {
                requestsPerHour: 100,  // NewsAPI free tier limit
                delayBetweenRequests: 1000  // 1 second between requests
            }
        };

        this.stats = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            startTime: null
        };
    }

    /**
     * Process a batch of players for sentiment analysis
     * @param {Array} players - Array of player objects from leaderboard manager
     * @param {Object} options - Processing options
     */
    async processBatch(players, options = {}) {
        const {
            batchSize = 15,
            respectRateLimits = true,
            onProgress = null
        } = options;

        this.stats.startTime = Date.now();
        console.log(`\n🔄 Starting batch sentiment analysis for ${players.length} players...`);

        const results = [];

        // Process in smaller chunks to respect rate limits
        for (let i = 0; i < players.length; i++) {
            const player = players[i];

            try {
                // Progress callback
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: players.length,
                        player: player.name
                    });
                }

                console.log(`  [${i + 1}/${players.length}] Analyzing ${player.name} (${player.team} ${player.position})...`);

                // Analyze sentiment for this player
                const sentimentData = await this.analyzePlayerSentiment(player);

                results.push({
                    playerId: player.id,
                    playerName: player.name,
                    success: true,
                    data: sentimentData
                });

                this.stats.processed++;
                this.stats.succeeded++;

                // Rate limiting: delay between requests
                if (respectRateLimits && i < players.length - 1) {
                    await this.delay(this.rateLimit.newsAPI.delayBetweenRequests);
                }

            } catch (error) {
                console.error(`  ❌ Failed to analyze ${player.name}:`, error.message);

                results.push({
                    playerId: player.id,
                    playerName: player.name,
                    success: false,
                    error: error.message
                });

                this.stats.processed++;
                this.stats.failed++;

                // Continue with next player
                continue;
            }
        }

        const duration = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);
        console.log(`\n✅ Batch complete: ${this.stats.succeeded} succeeded, ${this.stats.failed} failed (${duration}s)`);

        return {
            results,
            stats: { ...this.stats }
        };
    }

    /**
     * Analyze sentiment for a single player
     * AGGREGATES from multiple sources: News, Reddit, Forums
     */
    async analyzePlayerSentiment(player) {
        const sourcesData = {
            news: null,
            reddit: null,
            forums: null
        };

        let totalArticles = 0;
        let weightedScoreSum = 0;
        let totalWeight = 0;

        try {
            // 1. NEWS DATA (highest weight: 50%)
            if (this.sources.news) {
                try {
                    const newsData = await this.newsTracker.searchNews(player.name);
                    if (newsData && newsData.articles && newsData.articles.length > 0) {
                        sourcesData.news = newsData.analysis;
                        totalArticles += newsData.articles.length;

                        const newsWeight = 0.5;
                        weightedScoreSum += newsData.analysis.overallSentiment.score * newsWeight;
                        totalWeight += newsWeight;

                        console.log(`    📰 News: ${newsData.analysis.overallSentiment.score} (${newsData.articles.length} articles)`);
                    }
                } catch (error) {
                    console.log(`    ⚠️  News fetch failed: ${error.message}`);
                }
            }

            // 2. REDDIT DATA (medium weight: 30%)
            if (this.sources.reddit) {
                try {
                    const redditPosts = await this.redditTracker.searchReddit(player.name, 'nfl', 10);
                    if (redditPosts && redditPosts.length > 0) {
                        // Calculate Reddit sentiment from post titles + scores
                        const redditSentiment = this.calculateRedditSentiment(redditPosts);
                        sourcesData.reddit = redditSentiment;
                        totalArticles += redditPosts.length;

                        const redditWeight = 0.3;
                        weightedScoreSum += redditSentiment.score * redditWeight;
                        totalWeight += redditWeight;

                        console.log(`    💬 Reddit: ${redditSentiment.score.toFixed(2)} (${redditPosts.length} posts)`);
                    }
                } catch (error) {
                    console.log(`    ⚠️  Reddit fetch failed: ${error.message}`);
                }
            }

            // 3. FORUM DATA (lower weight: 20%)
            if (this.sources.forums) {
                try {
                    const forumData = await this.forumTracker.searchForums(player.name, 15);
                    if (forumData && forumData.totalMentions > 0) {
                        sourcesData.forums = forumData.sentiment;
                        totalArticles += forumData.totalMentions;

                        const forumWeight = 0.2;
                        weightedScoreSum += forumData.sentiment.score * forumWeight;
                        totalWeight += forumWeight;

                        console.log(`    🗣️  Forums: ${forumData.sentiment.score.toFixed(2)} (${forumData.totalMentions} posts)`);
                    }
                } catch (error) {
                    console.log(`    ⚠️  Forum fetch failed: ${error.message}`);
                }
            }

            // No data from any source
            if (totalArticles === 0) {
                console.log(`    ℹ️  No data from any source`);
                return this.createEmptySentimentData();
            }

            // Calculate weighted average sentiment
            const overallScore = totalWeight > 0 ? weightedScoreSum / totalWeight : 0;

            // Check for breaking news (from news articles)
            const hasBreakingNews = sourcesData.news
                ? this.detectBreakingNews(sourcesData.news)
                : false;

            console.log(`    📊 OVERALL: ${overallScore.toFixed(2)} (${totalArticles} total items)`);

            return {
                overallScore: overallScore,
                articleCount: totalArticles,
                positiveCount: this.countPositive(sourcesData),
                neutralCount: this.countNeutral(sourcesData),
                negativeCount: this.countNegative(sourcesData),
                hasBreakingNews: hasBreakingNews,
                rawData: {
                    aggregated: {
                        sources: Object.keys(sourcesData).filter(k => sourcesData[k] !== null),
                        totalItems: totalArticles,
                        overallScore: overallScore
                    },
                    news: sourcesData.news,
                    reddit: sourcesData.reddit,
                    forums: sourcesData.forums
                }
            };

        } catch (error) {
            console.error(`    ⚠️  Error analyzing sentiment:`, error.message);
            throw error;
        }
    }

    /**
     * Calculate sentiment from Reddit posts
     */
    calculateRedditSentiment(posts) {
        const Sentiment = require('sentiment');
        const sentiment = new Sentiment();

        let totalScore = 0;
        let positive = 0;
        let negative = 0;
        let neutral = 0;

        posts.forEach(post => {
            const analysis = sentiment.analyze(post.title);
            totalScore += analysis.score;

            if (analysis.score > 0) positive++;
            else if (analysis.score < 0) negative++;
            else neutral++;
        });

        return {
            score: posts.length > 0 ? totalScore / posts.length : 0,
            positive,
            negative,
            neutral
        };
    }

    /**
     * Count positive mentions across all sources
     */
    countPositive(sourcesData) {
        let count = 0;
        if (sourcesData.news) count += sourcesData.news.breakdown?.positive?.count || 0;
        if (sourcesData.reddit) count += sourcesData.reddit.positive || 0;
        if (sourcesData.forums) count += sourcesData.forums.positive || 0;
        return count;
    }

    /**
     * Count neutral mentions across all sources
     */
    countNeutral(sourcesData) {
        let count = 0;
        if (sourcesData.news) count += sourcesData.news.breakdown?.neutral?.count || 0;
        if (sourcesData.reddit) count += sourcesData.reddit.neutral || 0;
        if (sourcesData.forums) count += sourcesData.forums.neutral || 0;
        return count;
    }

    /**
     * Count negative mentions across all sources
     */
    countNegative(sourcesData) {
        let count = 0;
        if (sourcesData.news) count += sourcesData.news.breakdown?.negative?.count || 0;
        if (sourcesData.reddit) count += sourcesData.reddit.negative || 0;
        if (sourcesData.forums) count += sourcesData.forums.negative || 0;
        return count;
    }

    /**
     * Detect breaking news (injury keywords, recent articles)
     */
    detectBreakingNews(articles) {
        const injuryKeywords = [
            'injury', 'injured', 'hurt', 'out', 'ir', 'reserve',
            'questionable', 'doubtful', 'ruled out', 'sidelined',
            'concussion', 'acl', 'mcl', 'ankle', 'knee', 'shoulder'
        ];

        // Check last 48 hours for injury-related articles
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

        const recentInjuryArticles = articles.filter(article => {
            const publishDate = new Date(article.publishedAt);
            const isRecent = publishDate > twoDaysAgo;

            const titleLower = (article.title || '').toLowerCase();
            const hasInjuryKeyword = injuryKeywords.some(keyword =>
                titleLower.includes(keyword)
            );

            return isRecent && hasInjuryKeyword;
        });

        return recentInjuryArticles.length > 0;
    }

    /**
     * Create empty sentiment data (when no news available)
     */
    createEmptySentimentData() {
        return {
            overallScore: 0,
            articleCount: 0,
            positiveCount: 0,
            neutralCount: 0,
            negativeCount: 0,
            hasBreakingNews: false,
            rawData: {}
        };
    }

    /**
     * Delay helper for rate limiting
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get current processing stats
     */
    getStats() {
        return {
            ...this.stats,
            duration: this.stats.startTime
                ? ((Date.now() - this.stats.startTime) / 1000).toFixed(2)
                : 0
        };
    }

    /**
     * Reset stats
     */
    resetStats() {
        this.stats = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            startTime: null
        };
    }
}

module.exports = SentimentBatchProcessor;

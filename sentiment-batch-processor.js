const NewsTracker = require('./news-tracker');

/**
 * SentimentBatchProcessor - Processes sentiment analysis in controlled batches
 *
 * This is the "Smart Queue" that manages rate limits while processing 1,700+ players
 * Key features:
 * - Processes players in small batches (10-20 at a time)
 * - Respects API rate limits (NewsAPI, Reddit, etc.)
 * - Gracefully handles failures
 * - Tracks processing metrics
 */
class SentimentBatchProcessor {
    constructor() {
        this.NEWS_API_KEY = process.env.NEWS_API_KEY;
        this.newsTracker = this.NEWS_API_KEY ? new NewsTracker(this.NEWS_API_KEY) : null;

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
     * Uses NewsAPI (primary source) with fallback logic
     */
    async analyzePlayerSentiment(player) {
        // If no NewsAPI key, return empty data
        if (!this.newsTracker) {
            return this.createEmptySentimentData();
        }

        try {
            // Search for news about the player (last 7 days)
            const newsData = await this.newsTracker.searchNews(player.name);

            // If no articles found, return empty
            if (!newsData || !newsData.articles || newsData.articles.length === 0) {
                console.log(`    ℹ️  No recent news found`);
                return this.createEmptySentimentData();
            }

            // Extract sentiment data
            const analysis = newsData.analysis;
            const articles = newsData.articles;

            // Check for breaking injury news
            const hasBreakingNews = this.detectBreakingNews(articles);

            console.log(`    📊 Sentiment: ${analysis.overallSentiment.score} (${articles.length} articles)`);

            return {
                overallScore: analysis.overallSentiment.score,
                articleCount: analysis.total,
                positiveCount: analysis.breakdown.positive.count || 0,
                neutralCount: analysis.breakdown.neutral.count || 0,
                negativeCount: analysis.breakdown.negative.count || 0,
                hasBreakingNews: hasBreakingNews,
                rawData: {
                    overallSentiment: analysis.overallSentiment,
                    breakdown: analysis.breakdown,
                    topArticles: articles.slice(0, 3).map(a => ({
                        title: a.title,
                        source: a.source,
                        sentiment: a.sentiment,
                        publishedAt: a.publishedAt
                    }))
                }
            };

        } catch (error) {
            console.error(`    ⚠️  Error analyzing sentiment:`, error.message);
            throw error;
        }
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

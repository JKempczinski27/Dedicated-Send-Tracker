const https = require('https');
const Sentiment = require('sentiment');

class NewsTracker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.sentiment = new Sentiment();

        // Classification of news sources
        this.nationalSources = [
            'espn', 'fox-sports', 'bleacher-report', 'cbs-sports',
            'nfl-news', 'usa-today', 'sports-illustrated', 'the-athletic'
        ];

        this.localSourceKeywords = [
            'tribune', 'times', 'post', 'journal', 'gazette',
            'chronicle', 'herald', 'news', 'press'
        ];

        // Injury alert keywords for breaking news detection
        // High-priority keywords indicate serious injuries
        this.highPriorityInjuryKeywords = [
            'torn', 'tear', 'tore', 'acl', 'mcl', 'achilles',
            'broken', 'fracture', 'fractured', 'surgery',
            'injured reserve', 'out for season', 'season-ending',
            'ruled out', 'sidelined'
        ];
        
        // Medium-priority require context (player name nearby)
        this.mediumPriorityInjuryKeywords = [
            'injury', 'injured', 'hurt', 'concussion',
            'ir ', ' ir', 'week-to-week', 'day-to-day',
            'questionable', 'doubtful'
        ];
    }

    // Search for news articles about a player
    async searchNews(playerName, fromDate = null) {
        const query = encodeURIComponent(`${playerName} NFL`);
        const dateParam = fromDate || this._getDateDaysAgo(7); // Last 7 days by default
        const path = `/v2/everything?q=${query}&language=en&sortBy=publishedAt&from=${dateParam}&apiKey=${this.apiKey}`;

        try {
            const data = await this._makeRequest('newsapi.org', path);
            return this._processArticles(data.articles);
        } catch (error) {
            console.error('News API error:', error.message);
            return {
                articles: [],
                analysis: null,
                injuryAlert: null
            };
        }
    }

    // Process articles with sentiment analysis
    _processArticles(articles) {
        if (!articles || articles.length === 0) {
            return {
                articles: [],
                analysis: null,
                injuryAlert: null
            };
        }

        const processedArticles = articles.map(article => {
            const text = `${article.title} ${article.description || ''}`;
            const sentimentScore = this.sentiment.analyze(text);
            const sourceType = this._classifySource(article.source.name);
            const hasInjuryKeywords = this._detectInjuryKeywords(text);

            return {
                title: article.title,
                description: article.description,
                source: article.source.name,
                sourceType: sourceType,
                url: article.url,
                publishedAt: new Date(article.publishedAt).toLocaleDateString(),
                publishedAtRaw: article.publishedAt,
                sentiment: {
                    score: sentimentScore.score,
                    comparative: sentimentScore.comparative,
                    label: this._getSentimentLabel(sentimentScore.score)
                },
                hasInjuryKeywords: hasInjuryKeywords
            };
        });

        const analysis = this._analyzeArticles(processedArticles);
        const injuryAlert = this._detectBreakingInjuryNews(processedArticles);

        return {
            articles: processedArticles,
            analysis: analysis,
            injuryAlert: injuryAlert
        };
    }

    // Analyze articles for trends
    _analyzeArticles(articles) {
        const totalArticles = articles.length;
        const positive = articles.filter(a => a.sentiment.score > 0).length;
        const negative = articles.filter(a => a.sentiment.score < 0).length;
        const neutral = articles.filter(a => a.sentiment.score === 0).length;

        const avgSentiment = articles.reduce((sum, a) => sum + a.sentiment.score, 0) / totalArticles;

        // Analyze by source type
        const nationalArticles = articles.filter(a => a.sourceType === 'national');
        const localArticles = articles.filter(a => a.sourceType === 'local');

        const nationalSentiment = nationalArticles.length > 0
            ? nationalArticles.reduce((sum, a) => sum + a.sentiment.score, 0) / nationalArticles.length
            : 0;

        const localSentiment = localArticles.length > 0
            ? localArticles.reduce((sum, a) => sum + a.sentiment.score, 0) / localArticles.length
            : 0;

        return {
            total: totalArticles,
            breakdown: {
                positive: { count: positive, percentage: ((positive / totalArticles) * 100).toFixed(1) },
                negative: { count: negative, percentage: ((negative / totalArticles) * 100).toFixed(1) },
                neutral: { count: neutral, percentage: ((neutral / totalArticles) * 100).toFixed(1) }
            },
            overallSentiment: {
                score: avgSentiment.toFixed(2),
                label: this._getSentimentLabel(avgSentiment)
            },
            sourceComparison: {
                national: {
                    count: nationalArticles.length,
                    avgSentiment: nationalSentiment.toFixed(2),
                    label: this._getSentimentLabel(nationalSentiment)
                },
                local: {
                    count: localArticles.length,
                    avgSentiment: localSentiment.toFixed(2),
                    label: this._getSentimentLabel(localSentiment)
                },
                difference: (localSentiment - nationalSentiment).toFixed(2)
            }
        };
    }

    // Classify source as national or local
    _classifySource(sourceName) {
        const lowerSource = sourceName.toLowerCase();

        // Check if it's a national source
        if (this.nationalSources.some(ns => lowerSource.includes(ns))) {
            return 'national';
        }

        // Check if it matches local keywords
        if (this.localSourceKeywords.some(keyword => lowerSource.includes(keyword))) {
            return 'local';
        }

        // Default to other
        return 'other';
    }

    _getSentimentLabel(score) {
        if (score > 2) return 'Very Positive';
        if (score > 0) return 'Positive';
        if (score === 0) return 'Neutral';
        if (score > -2) return 'Negative';
        return 'Very Negative';
    }

    _getDateDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }

    // Detect injury keywords in article text (more sophisticated detection)
    _detectInjuryKeywords(text) {
        const lowerText = text.toLowerCase();
        
        // Check for high-priority keywords (immediate red flags)
        const hasHighPriority = this.highPriorityInjuryKeywords.some(keyword => 
            lowerText.includes(keyword.toLowerCase())
        );
        
        if (hasHighPriority) return true;
        
        // Check for medium-priority keywords (require additional context)
        // Only flag if multiple injury-related terms appear
        const mediumMatches = this.mediumPriorityInjuryKeywords.filter(keyword => 
            lowerText.includes(keyword.toLowerCase())
        );
        
        // Require at least 2 medium-priority matches to reduce false positives
        return mediumMatches.length >= 2;
    }

    // Detect breaking injury news (within last 48 hours)
    _detectBreakingInjuryNews(articles) {
        const now = new Date();
        const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));

        const recentInjuryArticles = articles.filter(article => {
            const publishedDate = new Date(article.publishedAtRaw);
            return article.hasInjuryKeywords && publishedDate >= fortyEightHoursAgo;
        });

        if (recentInjuryArticles.length === 0) {
            return null;
        }

        // Get the most recent injury article
        const mostRecent = recentInjuryArticles.sort((a, b) => 
            new Date(b.publishedAtRaw) - new Date(a.publishedAtRaw)
        )[0];

        const hoursAgo = Math.floor((now - new Date(mostRecent.publishedAtRaw)) / (1000 * 60 * 60));

        return {
            detected: true,
            count: recentInjuryArticles.length,
            mostRecentArticle: {
                title: mostRecent.title,
                source: mostRecent.source,
                url: mostRecent.url,
                publishedAt: mostRecent.publishedAt,
                hoursAgo: hoursAgo
            },
            articles: recentInjuryArticles
        };
    }

    _makeRequest(hostname, path) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname,
                path,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'NFL-Player-Tracker/1.0'
                }
            };

            https.get(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            reject(new Error('Failed to parse response'));
                        }
                    } else {
                        try {
                            const errorData = JSON.parse(data);
                            reject(new Error(`API request failed with status ${res.statusCode}: ${errorData.message || data}`));
                        } catch {
                            reject(new Error(`API request failed with status ${res.statusCode}`));
                        }
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }
}

module.exports = NewsTracker;

require('dotenv').config();
const https = require('https');
const YouTubeTracker = require('./youtube-tracker');
const PodcastTracker = require('./podcast-tracker');
const NewsTracker = require('./news-tracker');
const RedditTracker = require('./reddit-tracker');

// API Keys
const NFL_API_KEY = process.env.NFL_API_KEY || 'XgHqalcBNSjLzQBUkRVL1PJ0iJIFgcfNWFeHEvHk';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

class EnhancedTracker {
    constructor() {
        this.youtubeTracker = YOUTUBE_API_KEY ? new YouTubeTracker(YOUTUBE_API_KEY) : null;
        this.podcastTracker = new PodcastTracker();
        this.newsTracker = NEWS_API_KEY ? new NewsTracker(NEWS_API_KEY) : null;
        this.redditTracker = new RedditTracker();
    }

    // Fetch NFL injuries
    async fetchInjuries() {
        const options = {
            hostname: 'api.sportsdata.io',
            path: `/v3/nfl/scores/json/Injuries/2024`,
            headers: {
                'Ocp-Apim-Subscription-Key': NFL_API_KEY
            }
        };

        return new Promise((resolve, reject) => {
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
                        reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    // Comprehensive player tracking
    async trackPlayer(playerName) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`COMPREHENSIVE TRACKER: ${playerName.toUpperCase()}`);
        console.log(`${'='.repeat(60)}\n`);

        const results = {
            injury: null,
            news: null,
            podcasts: null,
            youtube: null,
            reddit: null
        };

        // 1. Check injury status
        console.log('⚕️  Fetching injury data...');
        try {
            const injuries = await this.fetchInjuries();
            const playerInjury = injuries.find(inj =>
                inj.Name && inj.Name.toLowerCase().includes(playerName.toLowerCase())
            );
            results.injury = playerInjury;
            this.displayInjuryStatus(playerInjury, playerName);
        } catch (error) {
            console.log(`   Error: ${error.message}\n`);
        }

        // 2. Search news with sentiment analysis
        if (this.newsTracker) {
            console.log('📰 Analyzing news coverage...');
            try {
                results.news = await this.newsTracker.searchNews(playerName);
                this.displayNewsAnalysis(results.news);
            } catch (error) {
                console.log(`   Error: ${error.message}\n`);
            }
        } else {
            console.log('📰 News tracking disabled (no API key)\n');
        }

        // 3. Search podcasts
        console.log('🎙️  Searching podcast mentions...');
        try {
            results.podcasts = await this.podcastTracker.searchPodcasts(playerName);
            this.displayPodcastMentions(results.podcasts);
        } catch (error) {
            console.log(`   Error: ${error.message}\n`);
        }

        // 4. Search YouTube
        if (this.youtubeTracker) {
            console.log('📺 Searching YouTube videos...');
            try {
                results.youtube = await this.youtubeTracker.searchVideos(playerName, 5);
                this.displayYouTubeResults(results.youtube);
            } catch (error) {
                console.log(`   Error: ${error.message}\n`);
            }
        } else {
            console.log('📺 YouTube tracking disabled (no API key)\n');
        }

        // 5. Search Reddit
        console.log('💬 Searching Reddit discussions...');
        try {
            results.reddit = await this.redditTracker.searchReddit(playerName, 'nfl', 10);
            this.displayRedditResults(results.reddit);
        } catch (error) {
            console.log(`   Error: ${error.message}\n`);
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log('Tracking complete!');
        console.log(`${'='.repeat(60)}\n`);

        return results;
    }

    displayInjuryStatus(injury, playerName) {
        if (!injury) {
            console.log(`   ✅ No injury reported for ${playerName}\n`);
            return;
        }

        console.log(`   Player: ${injury.Name}`);
        console.log(`   Team: ${injury.Team}`);
        console.log(`   Position: ${injury.Position}`);
        console.log(`   Injury: ${injury.BodyPart || 'N/A'}`);
        console.log(`   Status: ${injury.Status || 'Unknown'}`);
        if (injury.Updated) {
            console.log(`   Last Updated: ${injury.Updated}`);
        }
        console.log('');
    }

    displayNewsAnalysis(newsData) {
        if (!newsData || !newsData.articles || newsData.articles.length === 0) {
            console.log('   No recent news found\n');
            return;
        }

        const { articles, analysis } = newsData;

        console.log(`   Found ${analysis.total} articles (last 7 days)\n`);

        // Overall sentiment
        console.log(`   📊 OVERALL SENTIMENT: ${analysis.overallSentiment.label} (${analysis.overallSentiment.score})`);
        console.log(`      Positive: ${analysis.breakdown.positive.percentage}%`);
        console.log(`      Neutral:  ${analysis.breakdown.neutral.percentage}%`);
        console.log(`      Negative: ${analysis.breakdown.negative.percentage}%\n`);

        // Source comparison
        if (analysis.sourceComparison.national.count > 0 && analysis.sourceComparison.local.count > 0) {
            console.log(`   🔍 COVERAGE COMPARISON:`);
            console.log(`      National (${analysis.sourceComparison.national.count} articles): ${analysis.sourceComparison.national.label} (${analysis.sourceComparison.national.avgSentiment})`);
            console.log(`      Local (${analysis.sourceComparison.local.count} articles): ${analysis.sourceComparison.local.label} (${analysis.sourceComparison.local.avgSentiment})`);
            console.log(`      Difference: ${analysis.sourceComparison.difference} points\n`);
        }

        // Show top articles
        console.log(`   📑 RECENT HEADLINES:`);
        articles.slice(0, 5).forEach((article, i) => {
            const sentimentIcon = article.sentiment.score > 0 ? '➕' : article.sentiment.score < 0 ? '➖' : '➡️';
            console.log(`      ${sentimentIcon} [${article.sentiment.score}] ${article.title}`);
            console.log(`         ${article.source} (${article.sourceType}) - ${article.publishedAt}`);
        });
        console.log('');
    }

    displayPodcastMentions(podcasts) {
        if (!podcasts || podcasts.length === 0) {
            console.log('   No recent podcast mentions found\n');
            return;
        }

        console.log(`   Found mentions in ${podcasts.length} podcast(s):\n`);
        podcasts.forEach(podcast => {
            console.log(`   🎧 ${podcast.podcastName}`);
            podcast.episodes.slice(0, 3).forEach(episode => {
                console.log(`      • ${episode.title}`);
                console.log(`        ${episode.publishedAt}`);
            });
            console.log('');
        });
    }

    displayYouTubeResults(videos) {
        if (!videos || videos.length === 0) {
            console.log('   No recent YouTube videos found\n');
            return;
        }

        console.log(`   Found ${videos.length} recent videos:\n`);
        videos.forEach(video => {
            console.log(`   📹 ${video.title}`);
            console.log(`      ${video.channelTitle} - ${video.publishedAt}`);
            console.log(`      ${video.url}\n`);
        });
    }

    displayRedditResults(posts) {
        if (!posts || posts.length === 0) {
            console.log('   No recent Reddit discussions found\n');
            return;
        }

        console.log(`   Found ${posts.length} recent discussions:\n`);
        posts.slice(0, 5).forEach(post => {
            console.log(`   💬 ${post.title}`);
            console.log(`      r/${post.subreddit} • ${post.score} points • ${post.numComments} comments`);
            console.log(`      ${post.url}\n`);
        });
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node enhanced-tracker.js <player name>');
        console.log('Example: node enhanced-tracker.js Patrick Mahomes');
        console.log('\nRequired API Keys:');
        console.log('  NFL_API_KEY: ✅ Configured');
        console.log(`  YOUTUBE_API_KEY: ${YOUTUBE_API_KEY ? '✅' : '❌'} ${!YOUTUBE_API_KEY ? '(Optional)' : ''}`);
        console.log(`  NEWS_API_KEY: ${NEWS_API_KEY ? '✅' : '❌'} ${!NEWS_API_KEY ? '(Optional)' : ''}`);
        process.exit(1);
    }

    const playerName = args.join(' ');
    const tracker = new EnhancedTracker();

    try {
        await tracker.trackPlayer(playerName);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = EnhancedTracker;

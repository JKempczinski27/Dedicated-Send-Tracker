require('dotenv').config();
const https = require('https');
const YouTubeTracker = require('./youtube-tracker');
const PodcastTracker = require('./podcast-tracker');
const NewsTracker = require('./news-tracker');
const RedditTracker = require('./reddit-tracker');

// API Keys
const CLIENT_KEY = process.env.NFL_CLIENT_KEY || 'VhcsgwovwvCiN3xrl5UPippxjaMBOwqk';
const CLIENT_SECRET = process.env.NFL_CLIENT_SECRET || '9giQIDN3gmlaKjbL';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

class EnhancedTracker {
    constructor() {
        this.youtubeTracker = YOUTUBE_API_KEY ? new YouTubeTracker(YOUTUBE_API_KEY) : null;
        this.podcastTracker = new PodcastTracker();
        this.newsTracker = NEWS_API_KEY ? new NewsTracker(NEWS_API_KEY) : null;
        this.redditTracker = new RedditTracker();
        this.cachedToken = null;
        this.tokenExpiry = null;
    }

    // Get OAuth token from NFL Identity API
    async getToken() {
        // Return cached token if still valid
        if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.cachedToken;
        }

        const postData = JSON.stringify({
            clientKey: CLIENT_KEY,
            clientSecret: CLIENT_SECRET
        });

        const options = {
            hostname: 'api.nfl.com',
            path: '/identity/v3/token',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': CLIENT_KEY,
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const parsed = JSON.parse(data);
                            this.cachedToken = parsed.accessToken;
                            this.tokenExpiry = parsed.expiresIn * 1000;
                            resolve(this.cachedToken);
                        } catch (error) {
                            reject(new Error('Failed to parse token response'));
                        }
                    } else {
                        reject(new Error(`Token request failed with status ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    // Fetch injuries from NFL API
    async fetchInjuries(season = 2024, seasonType = 'REG') {
        const token = await this.getToken();
        
        const options = {
            hostname: 'api.nfl.com',
            path: `/football/v2/injuries?season=${season}&seasonType=${seasonType}`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        return new Promise((resolve, reject) => {
            https.get(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            reject(new Error('Failed to parse injuries'));
                        }
                    } else {
                        reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                    }
                });
            }).on('error', reject);
        });
    }

    // Fetch player information from persons endpoint
    async fetchPlayerInfo(playerName) {
        const token = await this.getToken();
        
        const options = {
            hostname: 'api.nfl.com',
            path: `/football/v2/persons?displayName=${encodeURIComponent(playerName)}`,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        return new Promise((resolve, reject) => {
            https.get(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.persons && parsed.persons.length > 0) {
                                // Return the active player (not retired)
                                const activePlayer = parsed.persons.find(p => p.status !== 'RET') || parsed.persons[0];
                                resolve({
                                    found: true,
                                    id: activePlayer.id,
                                    name: activePlayer.displayName,
                                    status: activePlayer.status,
                                    college: activePlayer.collegeNames?.[0],
                                    birthDate: activePlayer.birthDate,
                                    draftYear: activePlayer.draftYear,
                                    headshot: activePlayer.headshot
                                });
                            } else {
                                resolve({ found: false });
                            }
                        } catch (error) {
                            reject(new Error('Failed to parse player info'));
                        }
                    } else {
                        reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
                    }
                });
            }).on('error', reject);
        });
    }

    // Fetch injuries for a specific player
    async fetchPlayerInjury(playerName) {
        try {
            const data = await this.fetchInjuries();
            
            if (data.injuries && Array.isArray(data.injuries)) {
                const playerInjury = data.injuries.find(injury => {
                    const displayName = injury.person?.displayName || '';
                    return displayName.toLowerCase().includes(playerName.toLowerCase());
                });
                
                if (playerInjury) {
                    return {
                        name: playerInjury.person?.displayName || 'Unknown',
                        team: playerInjury.team?.fullName || 'Unknown',
                        position: playerInjury.position,
                        status: playerInjury.injuryStatus || 'N/A',
                        injuries: playerInjury.injuries?.join(', ') || 'N/A',
                        practiceStatus: playerInjury.practiceStatus,
                        found: true
                    };
                }
            }
        } catch (error) {
            console.error(`Error fetching player injury: ${error.message}`);
        }
        
        return { found: false, name: playerName };
    }

    // Comprehensive player tracking
    async trackPlayer(playerName) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`COMPREHENSIVE TRACKER: ${playerName.toUpperCase()}`);
        console.log(`${'='.repeat(60)}\n`);

        const results = {
            playerInfo: null,
            injury: null,
            news: null,
            podcasts: null,
            youtube: null,
            reddit: null
        };

        // 1. Get player roster status
        console.log('👤 Fetching player roster status...');
        try {
            const playerInfo = await this.fetchPlayerInfo(playerName);
            results.playerInfo = playerInfo;
            this.displayPlayerInfo(playerInfo);
        } catch (error) {
            console.log(`   Error: ${error.message}\n`);
        }

        // 2. Check injury status
        console.log('⚕️  Fetching injury data from NFL.com API...');
        try {
            const playerInjury = await this.fetchPlayerInjury(playerName);
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
            console.log(`   ⚠️ Podcast feeds unavailable\n`);
            results.podcasts = [];
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

    displayPlayerInfo(playerInfo) {
        if (!playerInfo || !playerInfo.found) {
            console.log(`   ⚠️  Player not found\n`);
            return;
        }

        console.log(`   Name: ${playerInfo.name}`);
        
        // Status interpretation
        const statusMap = {
            'ACT': '✅ Active Roster',
            'RES': '🚑 Reserve/Injured Reserve',
            'PRA': '📋 Practice Squad',
            'PUP': '⚕️  Physically Unable to Perform',
            'NON': '❌ Non-Football Injury List',
            'SUS': '⛔ Suspended',
            'RET': '👋 Retired',
            'DEV': '🔄 Developmental'
        };
        
        const statusDisplay = statusMap[playerInfo.status] || playerInfo.status || 'Unknown';
        console.log(`   Roster Status: ${statusDisplay}`);
        
        if (playerInfo.college) {
            console.log(`   College: ${playerInfo.college}`);
        }
        if (playerInfo.draftYear) {
            console.log(`   Draft Year: ${playerInfo.draftYear}`);
        }
        console.log('');
    }

    displayInjuryStatus(injury, playerName) {
        if (!injury || !injury.found) {
            console.log(`   ⚠️  Player not found in injury report: ${playerName}\n`);
            console.log(`   (This may mean the player is healthy or not currently injured)\n`);
            return;
        }

        console.log(`   Player: ${injury.name}`);
        console.log(`   Team: ${injury.team}`);
        console.log(`   Position: ${injury.position}`);
        console.log(`   Injury: ${injury.injuries}`);
        console.log(`   Status: ${injury.status}`);
        
        if (injury.practiceStatus) {
            const practiceMap = {
                'FULL': '✅ Full Practice',
                'LIMITED': '⚠️  Limited Practice',
                'DIDNOT': '❌ Did Not Practice',
                'N/A': 'No Practice Data'
            };
            const practiceDisplay = practiceMap[injury.practiceStatus] || injury.practiceStatus;
            console.log(`   Practice: ${practiceDisplay}`);
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
        console.log('  NFL_CLIENT_KEY: ✅ Configured');
        console.log('  NFL_CLIENT_SECRET: ✅ Configured');
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

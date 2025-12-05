const https = require('https');

class RedditTracker {
    constructor() {
        this.popularSubreddits = [
            'nfl',
            'fantasyfootball',
            'DynastyFF',
            'NFLstatheads',
            'NFLNoobs'
        ];

        this.teamSubreddits = [
            'KansasCityChiefs', 'BuffaloBills', 'Patriots', 'miamidolphins',
            'NYJets', 'ravens', 'Bengals', 'Browns', 'Steelers',
            'Texans', 'Colts', 'Jaguars', 'Tennesseetitans',
            'DenverBroncos', 'Chargers', 'LasVegasRaiders', 'KansasCityChiefs',
            'cowboys', 'NYGiants', 'eagles', 'Commanders',
            'CHIBears', 'detroitlions', 'GreenBayPackers', 'minnesotavikings',
            'falcons', 'panthers', 'Saints', 'buccaneers',
            '49ers', 'AZCardinals', 'LosAngelesRams', 'Seahawks'
        ];
    }

    // Search Reddit for player mentions
    async searchReddit(playerName, subreddit = null, limit = 25) {
        const query = encodeURIComponent(playerName);
        const subredditParam = subreddit ? `r/${subreddit}/` : '';
        const path = `/${subredditParam}search.json?q=${query}&limit=${limit}&sort=new&restrict_sr=${subreddit ? 'true' : 'false'}`;

        try {
            const data = await this._makeRequest('www.reddit.com', path);
            return this._formatPosts(data);
        } catch (error) {
            console.error('Reddit API error:', error.message);
            return [];
        }
    }

    // Search all NFL-related subreddits
    async searchAllSubreddits(playerName) {
        const results = {
            general: [],
            teams: []
        };

        // Search general NFL subreddits
        for (const subreddit of this.popularSubreddits) {
            try {
                const posts = await this.searchReddit(playerName, subreddit, 10);
                if (posts.length > 0) {
                    results.general.push({
                        subreddit: `r/${subreddit}`,
                        posts: posts
                    });
                }
                await this._delay(1000); // Reddit rate limiting
            } catch (error) {
                console.error(`Error searching r/${subreddit}:`, error.message);
            }
        }

        return results;
    }

    // Get top posts from a subreddit
    async getTopPosts(subreddit, timeframe = 'day', limit = 10) {
        const path = `/r/${subreddit}/top.json?t=${timeframe}&limit=${limit}`;

        try {
            const data = await this._makeRequest('www.reddit.com', path);
            return this._formatPosts(data);
        } catch (error) {
            console.error('Reddit API error:', error.message);
            return [];
        }
    }

    _formatPosts(data) {
        if (!data || !data.data || !data.data.children) {
            return [];
        }

        return data.data.children
            .filter(child => child.data)
            .map(child => {
                const post = child.data;
                return {
                    title: post.title,
                    author: post.author,
                    subreddit: post.subreddit,
                    score: post.score,
                    numComments: post.num_comments,
                    url: `https://www.reddit.com${post.permalink}`,
                    createdAt: new Date(post.created_utc * 1000).toLocaleDateString(),
                    flair: post.link_flair_text || post.author_flair_text || null,
                    selfText: post.selftext ? post.selftext.substring(0, 200) + '...' : null
                };
            });
    }

    _makeRequest(hostname, path) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname,
                path,
                method: 'GET',
                headers: {
                    'User-Agent': 'NFL-Injury-Tracker/1.0'
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
                        reject(new Error(`API request failed with status ${res.statusCode}`));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = RedditTracker;

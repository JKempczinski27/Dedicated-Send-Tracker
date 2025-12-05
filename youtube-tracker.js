const https = require('https');

class YouTubeTracker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.popularNFLChannels = [
            'UCxcTeAKWJca6XyJ37_ZoKIQ', // NFL
            'UCxdQI43w4AgkXwEHhPj6Zhg', // Pat McAfee Show
            'UCFR2oaNj02WnXkOgLH0iqOA', // Good Morning Football
            'UCqFMzb-4AUf6WAIbl132QKA', // Around the NFL
            'UCmEKLdY0dHyS8udUMx2VWPg', // NFL Network
        ];
    }

    // Search for videos mentioning a player
    async searchVideos(playerName, maxResults = 10) {
        const query = encodeURIComponent(`${playerName} NFL injury`);
        const path = `/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=${maxResults}&key=${this.apiKey}`;

        try {
            const data = await this._makeRequest('www.googleapis.com', path);
            return this._formatVideoResults(data);
        } catch (error) {
            console.error('YouTube search error:', error.message);
            return [];
        }
    }

    // Get video captions/transcripts (Note: Requires additional API setup)
    async getVideoCaptions(videoId) {
        // Note: YouTube Captions API requires OAuth2, which is complex for CLI
        // Alternative: Use youtube-transcript npm package
        return {
            videoId,
            note: 'Transcript fetching requires youtube-transcript package',
            suggestion: 'Install: npm install youtube-transcript'
        };
    }

    // Search within specific NFL podcast channels
    async searchChannelVideos(playerName, channelId, maxResults = 5) {
        const query = encodeURIComponent(playerName);
        const path = `/youtube/v3/search?part=snippet&channelId=${channelId}&q=${query}&type=video&maxResults=${maxResults}&key=${this.apiKey}`;

        try {
            const data = await this._makeRequest('www.googleapis.com', path);
            return this._formatVideoResults(data);
        } catch (error) {
            console.error('Channel search error:', error.message);
            return [];
        }
    }

    // Search all popular NFL channels
    async searchAllChannels(playerName) {
        const results = [];

        for (const channelId of this.popularNFLChannels) {
            try {
                const channelResults = await this.searchChannelVideos(playerName, channelId, 3);
                results.push(...channelResults);
                // Add delay to avoid rate limiting
                await this._delay(100);
            } catch (error) {
                console.error(`Error searching channel ${channelId}:`, error.message);
            }
        }

        return results;
    }

    _formatVideoResults(data) {
        if (!data.items || data.items.length === 0) {
            return [];
        }

        return data.items.map(item => ({
            title: item.snippet.title,
            description: item.snippet.description,
            channelTitle: item.snippet.channelTitle,
            publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
            videoId: item.id.videoId,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            thumbnail: item.snippet.thumbnails.default.url
        }));
    }

    _makeRequest(hostname, path) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname,
                path,
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
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

module.exports = YouTubeTracker;

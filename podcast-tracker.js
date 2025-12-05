const https = require('https');
const http = require('http');

class PodcastTracker {
    constructor() {
        this.popularPodcasts = [
            {
                name: 'Around the NFL',
                feed: 'http://feeds.megaphone.fm/aroundthenfl'
            },
            {
                name: 'The Pat McAfee Show',
                feed: 'https://feeds.megaphone.fm/thepatmcafeeshow'
            },
            {
                name: 'NFL Fantasy Football Podcast',
                feed: 'https://feeds.megaphone.fm/nflfantasyfootball'
            },
            {
                name: 'Good Morning Football',
                feed: 'https://feeds.megaphone.fm/goodmorningfootball'
            },
            {
                name: 'NFL: The Insiders',
                feed: 'https://feeds.megaphone.fm/nfltheinsiders'
            }
        ];
    }

    // Search podcast episodes for player mentions
    async searchPodcasts(playerName) {
        const results = [];
        const searchTerms = playerName.toLowerCase().split(' ');

        for (const podcast of this.popularPodcasts) {
            try {
                const episodes = await this._fetchPodcastFeed(podcast.feed);
                const matchingEpisodes = episodes.filter(episode => {
                    const title = episode.title.toLowerCase();
                    const description = episode.description.toLowerCase();
                    return searchTerms.some(term =>
                        title.includes(term) || description.includes(term)
                    );
                });

                if (matchingEpisodes.length > 0) {
                    results.push({
                        podcastName: podcast.name,
                        episodes: matchingEpisodes.slice(0, 5) // Limit to 5 most recent
                    });
                }
            } catch (error) {
                console.error(`Error fetching ${podcast.name}:`, error.message);
            }
        }

        return results;
    }

    // Fetch and parse RSS feed
    async _fetchPodcastFeed(feedUrl) {
        try {
            const xml = await this._fetchUrl(feedUrl);
            return this._parseRSS(xml);
        } catch (error) {
            throw new Error(`Failed to fetch podcast feed: ${error.message}`);
        }
    }

    // Simple RSS parser (basic implementation)
    _parseRSS(xml) {
        const episodes = [];

        // Extract items from RSS feed
        const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi);

        if (!itemMatches) {
            return episodes;
        }

        for (const item of itemMatches.slice(0, 20)) { // Process last 20 episodes
            const title = this._extractTag(item, 'title');
            const description = this._extractTag(item, 'description');
            const pubDate = this._extractTag(item, 'pubDate');
            const link = this._extractTag(item, 'link');
            const enclosure = this._extractAttribute(item, 'enclosure', 'url');

            episodes.push({
                title: this._cleanText(title),
                description: this._cleanText(description),
                publishedAt: pubDate ? new Date(pubDate).toLocaleDateString() : 'Unknown',
                link: link || enclosure || 'No link available'
            });
        }

        return episodes;
    }

    _extractTag(xml, tagName) {
        const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
        const match = xml.match(regex);
        return match ? match[1] : '';
    }

    _extractAttribute(xml, tagName, attribute) {
        const regex = new RegExp(`<${tagName}[^>]*${attribute}="([^"]*)"`, 'i');
        const match = xml.match(regex);
        return match ? match[1] : '';
    }

    _cleanText(text) {
        return text
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    }

    _fetchUrl(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;

            client.get(url, (res) => {
                // Handle redirects
                if (res.statusCode === 301 || res.statusCode === 302) {
                    return this._fetchUrl(res.headers.location)
                        .then(resolve)
                        .catch(reject);
                }

                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`Request failed with status ${res.statusCode}`));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }
}

module.exports = PodcastTracker;

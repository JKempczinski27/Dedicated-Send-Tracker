const https = require('https');
const { YoutubeTranscript } = require('youtube-transcript');
const Sentiment = require('sentiment');

class YouTubeTracker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.sentiment = new Sentiment();
        this.popularNFLChannels = [
            'UCxcTeAKWJca6XyJ37_ZoKIQ', // NFL
            'UCxdQI43w4AgkXwEHhPj6Zhg', // Pat McAfee Show
            'UCFR2oaNj02WnXkOgLH0iqOA', // Good Morning Football
            'UCqFMzb-4AUf6WAIbl132QKA', // Around the NFL
            'UCmEKLdY0dHyS8udUMx2VWPg', // NFL Network
        ];

        // Podcast channel IDs for detection
        this.podcastChannels = [
            'UCxdQI43w4AgkXwEHhPj6Zhg', // Pat McAfee Show
            'UCqFMzb-4AUf6WAIbl132QKA', // Around the NFL
        ];

        // Minimum duration for podcast content (in seconds) - 30 minutes
        this.minPodcastDuration = 1800;
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

    // Get video captions/transcripts with sentiment analysis
    async getVideoCaptions(videoId, playerName = '') {
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);

            if (!transcript || transcript.length === 0) {
                return {
                    videoId,
                    available: false,
                    error: 'No transcript available for this video'
                };
            }

            // Combine all transcript text
            const fullText = transcript.map(entry => entry.text).join(' ');

            // Analyze sentiment of the transcript
            const sentimentScore = this.sentiment.analyze(fullText);

            // Extract player mentions and context
            const playerContext = playerName ? this._extractPlayerContext(fullText, playerName) : null;

            return {
                videoId,
                available: true,
                transcript: transcript,
                fullText: fullText,
                wordCount: fullText.split(' ').length,
                duration: transcript[transcript.length - 1]?.offset || 0,
                sentiment: {
                    score: sentimentScore.score,
                    comparative: sentimentScore.comparative,
                    label: this._getSentimentLabel(sentimentScore.score),
                    positive: sentimentScore.positive,
                    negative: sentimentScore.negative
                },
                playerContext: playerContext
            };
        } catch (error) {
            return {
                videoId,
                available: false,
                error: error.message
            };
        }
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

    // Get video details including duration
    async getVideoDetails(videoId) {
        const path = `/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${this.apiKey}`;

        try {
            const data = await this._makeRequest('www.googleapis.com', path);

            if (!data.items || data.items.length === 0) {
                return null;
            }

            const video = data.items[0];
            const duration = this._parseDuration(video.contentDetails.duration);

            return {
                videoId: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                channelId: video.snippet.channelId,
                channelTitle: video.snippet.channelTitle,
                duration: duration,
                publishedAt: video.snippet.publishedAt
            };
        } catch (error) {
            console.error('Error fetching video details:', error.message);
            return null;
        }
    }

    // Detect if video is podcast content
    async isPodcastContent(video) {
        let score = 0;

        // Get detailed video information if we only have basic search results
        let videoDetails = video;
        if (!video.duration && video.videoId) {
            videoDetails = await this.getVideoDetails(video.videoId);
            if (!videoDetails) return false;
        }

        // Check 1: Duration (30+ minutes) - Strong indicator
        if (videoDetails.duration && videoDetails.duration >= this.minPodcastDuration) {
            score += 3;
        }

        // Check 2: Known podcast channels - Strong indicator
        const channelId = video.channelId || videoDetails.channelId;
        if (channelId && this.podcastChannels.includes(channelId)) {
            score += 3;
        }

        // Check 3: Title patterns - Moderate indicator
        const title = (video.title || videoDetails.title || '').toLowerCase();
        const podcastTitlePatterns = [
            /episode|ep\.|ep\s\d+/,
            /podcast/,
            /full\s+(show|episode)/,
            /interview/,
            /discussion/,
            /\b(w\/|with)\s+[A-Z]/,  // "with Guest Name"
        ];

        if (podcastTitlePatterns.some(pattern => pattern.test(title))) {
            score += 2;
        }

        // Check 4: Description patterns - Weak indicator
        const description = (video.description || videoDetails.description || '').toLowerCase();
        if (description.includes('podcast') || description.includes('full episode')) {
            score += 1;
        }

        // Check 5: Avoid highlights/clips - Negative indicator
        const avoidPatterns = [
            /highlight/,
            /clip/,
            /recap/,
            /\d+\s*min(ute)?s?\s+(of|from)/,  // "5 minutes of..."
            /top\s+\d+/,
            /best\s+(plays|moments)/
        ];

        if (avoidPatterns.some(pattern => pattern.test(title))) {
            score -= 2;
        }

        // Threshold: Score of 4 or higher indicates podcast content
        return score >= 4;
    }

    // Search for podcast content about a player with transcript analysis
    async searchPodcastsWithTranscripts(playerName, maxResults = 5) {
        try {
            // Search all channels
            const allVideos = await this.searchAllChannels(playerName);

            if (allVideos.length === 0) {
                return [];
            }

            const podcastResults = [];

            // Filter for podcast content and fetch transcripts
            for (const video of allVideos) {
                if (podcastResults.length >= maxResults) break;

                // Check if it's podcast content
                const isPodcast = await this.isPodcastContent(video);

                if (isPodcast) {
                    // Fetch transcript and sentiment
                    const transcriptData = await this.getVideoCaptions(video.videoId, playerName);

                    podcastResults.push({
                        ...video,
                        isPodcast: true,
                        transcript: transcriptData
                    });

                    // Add delay to avoid rate limiting
                    await this._delay(500);
                }
            }

            return podcastResults;
        } catch (error) {
            console.error('Error searching podcasts with transcripts:', error.message);
            return [];
        }
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

    // Convert sentiment score to label (same as NewsTracker)
    _getSentimentLabel(score) {
        if (score > 2) return 'Very Positive';
        if (score > 0) return 'Positive';
        if (score === 0) return 'Neutral';
        if (score > -2) return 'Negative';
        return 'Very Negative';
    }

    // Extract player mentions and surrounding context from transcript
    _extractPlayerContext(text, playerName) {
        const mentions = [];
        const nameParts = playerName.toLowerCase().split(' ');
        const lastName = nameParts[nameParts.length - 1];

        // Split text into sentences
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].toLowerCase();

            // Check if sentence mentions player (full name or last name)
            if (sentence.includes(playerName.toLowerCase()) || sentence.includes(lastName)) {
                // Get context (current sentence plus one before and after)
                const contextStart = Math.max(0, i - 1);
                const contextEnd = Math.min(sentences.length, i + 2);
                const context = sentences.slice(contextStart, contextEnd).join('. ').trim();

                // Analyze sentiment of this specific context
                const contextSentiment = this.sentiment.analyze(context);

                mentions.push({
                    context: context,
                    sentiment: {
                        score: contextSentiment.score,
                        comparative: contextSentiment.comparative,
                        label: this._getSentimentLabel(contextSentiment.score)
                    }
                });
            }
        }

        return {
            count: mentions.length,
            mentions: mentions
        };
    }

    // Parse YouTube ISO 8601 duration format (e.g., PT1H30M15S)
    _parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

        if (!match) return 0;

        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);

        return hours * 3600 + minutes * 60 + seconds;
    }
}

module.exports = YouTubeTracker;

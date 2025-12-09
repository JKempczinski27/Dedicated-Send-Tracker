require('dotenv').config();
const YouTubeTracker = require('./youtube-tracker');

async function testYouTubePodcastTracking() {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        console.error('❌ YOUTUBE_API_KEY not found in .env file');
        process.exit(1);
    }

    const tracker = new YouTubeTracker(apiKey);
    const playerName = 'Patrick Mahomes'; // Test with a popular player

    console.log('🏈 Testing YouTube Podcast Transcript Tracking');
    console.log('='.repeat(60));
    console.log(`Player: ${playerName}\n`);

    try {
        // Test 1: Search for podcasts with transcripts
        console.log('📡 Searching for podcast content...');
        const podcasts = await tracker.searchPodcastsWithTranscripts(playerName, 3);

        if (podcasts.length === 0) {
            console.log('⚠️  No podcast content found (this might be due to API limits or no transcripts available)');
            console.log('\nTrying basic video search instead...');

            // Fallback: Test basic video search
            const videos = await tracker.searchAllChannels(playerName);
            console.log(`\n✅ Found ${videos.length} videos total`);

            if (videos.length > 0) {
                const testVideo = videos[0];
                console.log('\n📹 Testing with first video:');
                console.log(`   Title: ${testVideo.title}`);
                console.log(`   Channel: ${testVideo.channelTitle}`);

                // Test 2: Check if it's podcast content
                console.log('\n🎙️  Checking if video is podcast content...');
                const isPodcast = await tracker.isPodcastContent(testVideo);
                console.log(`   Is Podcast: ${isPodcast ? '✅ YES' : '❌ NO'}`);

                // Test 3: Try to fetch transcript
                console.log('\n📝 Attempting to fetch transcript...');
                const transcript = await tracker.getVideoCaptions(testVideo.videoId, playerName);

                if (transcript.available) {
                    console.log('   ✅ Transcript available!');
                    console.log(`   Word count: ${transcript.wordCount}`);
                    console.log(`   Sentiment: ${transcript.sentiment.label} (score: ${transcript.sentiment.score})`);

                    if (transcript.playerContext && transcript.playerContext.count > 0) {
                        console.log(`\n   🎯 Player mentioned ${transcript.playerContext.count} times`);
                        console.log('\n   Sample mention:');
                        const firstMention = transcript.playerContext.mentions[0];
                        console.log(`   Context: "${firstMention.context.substring(0, 150)}..."`);
                        console.log(`   Sentiment: ${firstMention.sentiment.label} (${firstMention.sentiment.score})`);
                    }
                } else {
                    console.log(`   ❌ Transcript not available: ${transcript.error}`);
                }
            }
        } else {
            console.log(`✅ Found ${podcasts.length} podcast(s) with analysis\n`);

            // Display results
            podcasts.forEach((podcast, index) => {
                console.log(`\n${'─'.repeat(60)}`);
                console.log(`Podcast #${index + 1}:`);
                console.log(`Title: ${podcast.title}`);
                console.log(`Channel: ${podcast.channelTitle}`);
                console.log(`Published: ${podcast.publishedAt}`);
                console.log(`URL: ${podcast.url}`);

                if (podcast.transcript.available) {
                    console.log(`\n📊 Transcript Analysis:`);
                    console.log(`   Words: ${podcast.transcript.wordCount}`);
                    console.log(`   Overall Sentiment: ${podcast.transcript.sentiment.label} (${podcast.transcript.sentiment.score})`);
                    console.log(`   Positive words: ${podcast.transcript.sentiment.positive.join(', ') || 'none'}`);
                    console.log(`   Negative words: ${podcast.transcript.sentiment.negative.join(', ') || 'none'}`);

                    if (podcast.transcript.playerContext && podcast.transcript.playerContext.count > 0) {
                        console.log(`\n🎯 Player Mentions: ${podcast.transcript.playerContext.count}`);

                        // Show first mention
                        const firstMention = podcast.transcript.playerContext.mentions[0];
                        console.log(`\n   Sample Context:`);
                        console.log(`   "${firstMention.context.substring(0, 200)}..."`);
                        console.log(`   Mention Sentiment: ${firstMention.sentiment.label} (${firstMention.sentiment.score})`);
                    } else {
                        console.log(`\n⚠️  Player name not explicitly mentioned in transcript`);
                    }
                } else {
                    console.log(`\n❌ Transcript: ${podcast.transcript.error}`);
                }
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Test completed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
testYouTubePodcastTracking();

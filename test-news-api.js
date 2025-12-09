#!/usr/bin/env node
/**
 * Quick test script for News API integration
 */

require('dotenv').config();
const NewsTracker = require('./news-tracker');

const NEWS_API_KEY = process.env.NEWS_API_KEY;

async function testNewsAPI() {
    console.log('🧪 Testing News API Setup...\n');

    // Check if API key exists
    if (!NEWS_API_KEY) {
        console.error('❌ ERROR: NEWS_API_KEY not found in environment variables');
        console.log('\nPlease add NEWS_API_KEY to your .env file');
        process.exit(1);
    }

    console.log('✓ NEWS_API_KEY found in environment');
    console.log(`  Key: ${NEWS_API_KEY.substring(0, 8)}...${NEWS_API_KEY.substring(NEWS_API_KEY.length - 4)}\n`);

    // Test with a popular NFL player
    const testPlayer = 'Patrick Mahomes';
    console.log(`📰 Testing news search for: ${testPlayer}`);
    console.log('   Searching for articles from the last 7 days...\n');

    const tracker = new NewsTracker(NEWS_API_KEY);

    try {
        const results = await tracker.searchNews(testPlayer);

        if (!results.articles || results.articles.length === 0) {
            console.log('⚠️  WARNING: No articles found');
            console.log('   This could mean:');
            console.log('   - No recent news about this player');
            console.log('   - API key might be invalid');
            console.log('   - API rate limit reached\n');
            return;
        }

        console.log(`✅ SUCCESS! Found ${results.articles.length} articles\n`);

        // Display analysis
        if (results.analysis) {
            console.log('📊 Sentiment Analysis:');
            console.log(`   Overall: ${results.analysis.overallSentiment.label} (${results.analysis.overallSentiment.score})`);
            console.log(`   Positive: ${results.analysis.breakdown.positive.percentage}%`);
            console.log(`   Neutral: ${results.analysis.breakdown.neutral.percentage}%`);
            console.log(`   Negative: ${results.analysis.breakdown.negative.percentage}%\n`);

            if (results.analysis.sourceComparison) {
                console.log('📰 Source Comparison:');
                console.log(`   National: ${results.analysis.sourceComparison.national.count} articles (avg: ${results.analysis.sourceComparison.national.avgSentiment})`);
                console.log(`   Local: ${results.analysis.sourceComparison.local.count} articles (avg: ${results.analysis.sourceComparison.local.avgSentiment})`);
                console.log(`   Difference: ${results.analysis.sourceComparison.difference}\n`);
            }
        }

        // Show first 3 articles
        console.log('📄 Sample Articles:\n');
        results.articles.slice(0, 3).forEach((article, i) => {
            console.log(`${i + 1}. ${article.title}`);
            console.log(`   Source: ${article.source} (${article.sourceType})`);
            console.log(`   Sentiment: ${article.sentiment.label} (${article.sentiment.score})`);
            console.log(`   Published: ${article.publishedAt}\n`);
        });

        console.log('✅ News API is working correctly!');
        console.log('\n💡 Next steps:');
        console.log('   1. Deploy to Vercel with NEWS_API_KEY in environment variables');
        console.log('   2. Add players to watchlist');
        console.log('   3. Click "Update All" to fetch news sentiment analysis\n');

    } catch (error) {
        console.error('❌ ERROR:', error.message);

        if (error.message.includes('401')) {
            console.log('\n⚠️  API Key Authentication Failed');
            console.log('   Your API key might be invalid or expired');
            console.log('   Get a new key at: https://newsapi.org/\n');
        } else if (error.message.includes('429')) {
            console.log('\n⚠️  Rate Limit Exceeded');
            console.log('   You have reached the API rate limit');
            console.log('   Free tier: 100 requests/day\n');
        } else {
            console.log('\n⚠️  Unexpected error occurred');
            console.log('   Please check your internet connection and try again\n');
        }

        process.exit(1);
    }
}

// Run the test
testNewsAPI().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

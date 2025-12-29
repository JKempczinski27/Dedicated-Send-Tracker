const LeaderboardManager = require('../../../leaderboard-manager');
const SentimentBatchProcessor = require('../../../sentiment-batch-processor');

/**
 * Cron Job: Process Sentiment Batch
 *
 * This endpoint is called by Vercel Cron every 10-15 minutes
 * It processes a small batch of players (10-20) for sentiment analysis
 *
 * The "Smart Queue" prioritization ensures:
 * - High-priority players (QB/RB/WR) get analyzed more frequently
 * - Breaking news players get immediate attention
 * - All players eventually get analyzed (staleness detection)
 *
 * Schedule: Every 15 minutes
 */
export default async function handler(req, res) {
  // Verify this is a cron request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('⚠️  Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('\n📊 ===== SENTIMENT PROCESSING CRON JOB =====');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  const startTime = Date.now();
  const leaderboard = new LeaderboardManager();
  const processor = new SentimentBatchProcessor();

  try {
    // Step 1: Get next batch of players to process (smart priority queue)
    console.log('\n🎯 Step 1: Fetching next batch from smart queue...');
    const batchSize = 15; // Process 15 players per run (to stay within rate limits)
    const players = await leaderboard.getNextBatch(batchSize);

    if (players.length === 0) {
      console.log('  ℹ️  No players in queue (all up to date)');
      await leaderboard.close();
      return res.status(200).json({
        success: true,
        message: 'No players to process',
        processed: 0
      });
    }

    console.log(`  ✅ Got ${players.length} players from queue`);

    // Step 2: Mark as processing
    const playerIds = players.map(p => p.id);
    await leaderboard.markAsProcessing(playerIds);

    // Step 3: Process sentiment for each player
    console.log('\n🔄 Step 2: Processing sentiment...');
    const batchResult = await processor.processBatch(players, {
      batchSize: batchSize,
      respectRateLimits: true,
      onProgress: (progress) => {
        // Progress callback (optional logging)
      }
    });

    // Step 4: Update database with results
    console.log('\n💾 Step 3: Saving results to database...');
    let successCount = 0;
    let failCount = 0;

    for (const result of batchResult.results) {
      if (result.success) {
        const updated = await leaderboard.updateSentiment(
          result.playerId,
          result.data
        );

        if (updated.success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    }

    // Step 5: Remove from queue (both success and failed - failed will retry later)
    await leaderboard.removeFromQueue(playerIds);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Sentiment processing complete in ${duration}s`);
    console.log(`   Successful: ${successCount}, Failed: ${failCount}`);
    console.log('==========================================\n');

    await leaderboard.close();

    return res.status(200).json({
      success: true,
      message: 'Sentiment processing completed',
      stats: {
        processed: batchResult.results.length,
        succeeded: successCount,
        failed: failCount,
        duration: `${duration}s`
      }
    });

  } catch (error) {
    console.error('\n❌ ERROR during sentiment processing:', error);
    console.error(error.stack);

    await leaderboard.close();

    return res.status(500).json({
      success: false,
      error: error.message,
      duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
    });
  }
}

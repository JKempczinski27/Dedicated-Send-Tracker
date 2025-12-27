const RosterSyncService = require('../../../roster-sync-service');
const LeaderboardManager = require('../../../leaderboard-manager');

/**
 * Cron Job: Sync NFL Rosters
 *
 * This endpoint is called by Vercel Cron (once per day)
 * It fetches ALL active NFL players and syncs them to the database
 *
 * Schedule: Daily at 3:00 AM ET (after roster updates)
 */
export default async function handler(req, res) {
  // Verify this is a cron request (Vercel adds this header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('⚠️  Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('\n🏈 ===== NFL ROSTER SYNC CRON JOB =====');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  const startTime = Date.now();
  const rosterSync = new RosterSyncService();
  const leaderboard = new LeaderboardManager();

  try {
    // Step 1: Fetch all players from NFL API
    console.log('\n📥 Step 1: Fetching all NFL rosters...');
    const allPlayers = await rosterSync.fetchAllPlayers();

    if (allPlayers.length === 0) {
      throw new Error('No players fetched from NFL API');
    }

    // Step 2: Get sync stats
    const syncStats = rosterSync.getSyncStats(allPlayers);
    console.log('\n📊 Roster Stats:');
    console.log(`  Total players: ${syncStats.total}`);
    console.log(`  High priority (QB/RB/WR/TE): ${syncStats.highPriority}`);
    console.log(`  Estimated starters: ${syncStats.starters}`);

    // Step 3: Sync to database
    console.log('\n💾 Step 2: Syncing to database...');
    const result = await leaderboard.syncPlayers(allPlayers);

    if (!result.success) {
      throw new Error(result.error || 'Failed to sync players');
    }

    console.log('  ✅ Database sync complete:');
    console.log(`     Inserted: ${result.inserted}`);
    console.log(`     Updated: ${result.updated}`);
    console.log(`     Total: ${result.total}`);

    // Step 4: Queue high-priority players for sentiment analysis
    console.log('\n📋 Step 3: Queueing high-priority players...');
    const highPriorityCount = await queueHighPriorityPlayers(leaderboard);
    console.log(`  ✅ Queued ${highPriorityCount} high-priority players`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Roster sync complete in ${duration}s`);
    console.log('==========================================\n');

    await leaderboard.close();

    return res.status(200).json({
      success: true,
      message: 'Roster sync completed successfully',
      stats: {
        playersProcessed: result.total,
        inserted: result.inserted,
        updated: result.updated,
        highPriorityQueued: highPriorityCount,
        duration: `${duration}s`
      }
    });

  } catch (error) {
    console.error('\n❌ ERROR during roster sync:', error);
    console.error(error.stack);

    await leaderboard.close();

    return res.status(500).json({
      success: false,
      error: error.message,
      duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
    });
  }
}

/**
 * Queue high-priority players who haven't been analyzed recently
 */
async function queueHighPriorityPlayers(leaderboard) {
  try {
    // Get next batch of high-priority players (first-time or stale)
    const batch = await leaderboard.getNextBatch(50);

    if (batch.length === 0) {
      return 0;
    }

    const playerIds = batch.map(p => p.id);
    await leaderboard.addToQueue(playerIds, 1); // Priority 1

    return batch.length;
  } catch (error) {
    console.error('  ⚠️  Error queueing players:', error.message);
    return 0;
  }
}

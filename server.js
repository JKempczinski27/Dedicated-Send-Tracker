require('dotenv').config();
const express = require('express');
const next = require('next');
const cron = require('node-cron');
const LeaderboardManager = require('./leaderboard-manager');
const SentimentBatchProcessor = require('./sentiment-batch-processor');
const EmailService = require('./lib/email-service');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

// Track cron job status
let jobStatus = {
  sentiment: {
    running: false,
    lastRun: null,
    lastStatus: null
  },
  email: {
    running: false,
    lastRun: null,
    lastStatus: null
  }
};

/**
 * League Sentiment Update Job
 * Runs every 10 minutes to process a batch of players
 */
async function runSentimentUpdate() {
  if (jobStatus.sentiment.running) {
    console.log('⚠️  Sentiment job already running, skipping...');
    return;
  }

  jobStatus.sentiment.running = true;
  jobStatus.sentiment.lastRun = new Date();

  console.log('\n📊 ===== SENTIMENT PROCESSING CRON JOB =====');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  const startTime = Date.now();
  const leaderboard = new LeaderboardManager();
  const processor = new SentimentBatchProcessor();

  try {
    // Step 1: Get next batch of players to process
    console.log('\n🎯 Step 1: Fetching next batch from smart queue...');
    const batchSize = 15;
    const players = await leaderboard.getNextBatch(batchSize);

    if (players.length === 0) {
      console.log('  ℹ️  No players in queue (all up to date)');
      await leaderboard.close();
      jobStatus.sentiment.lastStatus = 'success';
      jobStatus.sentiment.running = false;
      return;
    }

    console.log(`  ✅ Got ${players.length} players from queue`);

    // Step 2: Mark as processing
    const playerIds = players.map(p => p.id);
    await leaderboard.markAsProcessing(playerIds);

    // Step 3: Process sentiment
    console.log('\n🔄 Step 2: Processing sentiment...');
    const batchResult = await processor.processBatch(players, {
      batchSize: batchSize,
      respectRateLimits: true
    });

    // Step 4: Update database
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

    // Step 5: Remove from queue
    await leaderboard.removeFromQueue(playerIds);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Sentiment processing complete in ${duration}s`);
    console.log(`   Successful: ${successCount}, Failed: ${failCount}`);
    console.log('==========================================\n');

    await leaderboard.close();
    jobStatus.sentiment.lastStatus = 'success';

  } catch (error) {
    console.error('\n❌ ERROR during sentiment processing:', error);
    console.error(error.stack);
    await leaderboard.close();
    jobStatus.sentiment.lastStatus = 'error';
  } finally {
    jobStatus.sentiment.running = false;
  }
}

/**
 * Executive Summary Email Job
 * Runs every Monday at 8:00 AM
 */
async function runExecutiveSummary() {
  if (jobStatus.email.running) {
    console.log('⚠️  Email job already running, skipping...');
    return;
  }

  jobStatus.email.running = true;
  jobStatus.email.lastRun = new Date();

  console.log('\n📧 ===== EXECUTIVE SUMMARY EMAIL JOB =====');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  const emailService = new EmailService();

  try {
    const result = await emailService.sendWeeklySummary();

    if (result.success) {
      console.log('✅ Executive summary email sent successfully');
      jobStatus.email.lastStatus = 'success';
    } else {
      console.error('❌ Failed to send executive summary:', result.error);
      jobStatus.email.lastStatus = 'error';
    }
  } catch (error) {
    console.error('❌ ERROR sending executive summary:', error);
    console.error(error.stack);
    jobStatus.email.lastStatus = 'error';
  } finally {
    jobStatus.email.running = false;
    console.log('==========================================\n');
  }
}

app.prepare().then(() => {
  const server = express();

  // Health check endpoint for Railway
  server.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      jobs: jobStatus
    });
  });

  // Cron status endpoint (for monitoring)
  server.get('/api/cron-status', (req, res) => {
    res.status(200).json({
      status: 'active',
      jobs: jobStatus
    });
  });

  // Handle all other requests with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`\n🚀 Server ready on http://localhost:${port}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

    // Schedule cron jobs
    console.log('\n⏰ Scheduling cron jobs...');

    // Every 10 minutes: League Sentiment Update
    cron.schedule('*/10 * * * *', () => {
      runSentimentUpdate();
    });
    console.log('  ✅ Sentiment Update: Every 10 minutes');

    // Monday at 8:00 AM: Executive Summary Email
    cron.schedule('0 8 * * 1', () => {
      runExecutiveSummary();
    }, {
      timezone: 'America/New_York' // Adjust to your timezone
    });
    console.log('  ✅ Executive Summary: Monday at 8:00 AM (EST)');

    console.log('\n✨ NFL Brand Growth Tracker is running!\n');
  });
});

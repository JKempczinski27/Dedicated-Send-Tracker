// Weekly Summary Cron Job
// Sends executive summary email every Monday at 8:00 AM EST
// Secured with CRON_SECRET header to prevent unauthorized access

const PostgresWatchlistManager = require('../../../postgres-watchlist-manager');
const SummaryGenerator = require('../../../lib/summaryGenerator');
const EmailService = require('../../../lib/emailService');

// Increase timeout for this serverless function
export const config = {
  maxDuration: 60, // 60 seconds
};

/**
 * Handler for weekly summary cron job
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret for security
  const cronSecret = req.headers['x-cron-secret'] || req.headers['authorization'];
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('⚠️ CRON_SECRET not configured in environment variables');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'CRON_SECRET not configured'
    });
  }

  if (cronSecret !== expectedSecret) {
    console.warn('⚠️ Unauthorized cron job attempt - invalid secret');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid CRON_SECRET'
    });
  }

  console.log('🚀 Starting weekly summary email generation...');
  console.log(`📅 Triggered at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);

  try {
    // 1. Fetch all players from watchlist
    console.log('📊 Fetching players from database...');
    const watchlist = new PostgresWatchlistManager();
    const players = await watchlist.getPlayers();

    if (players.length === 0) {
      console.log('⚠️ No players in watchlist, skipping email');
      return res.status(200).json({
        success: true,
        message: 'No players in watchlist',
        playerCount: 0,
        emailSent: false
      });
    }

    console.log(`✅ Found ${players.length} players on watchlist`);

    // 2. Generate summary analysis
    console.log('🔍 Analyzing player data...');
    const generator = new SummaryGenerator();
    const htmlContent = generator.generateWeeklySummaryHTML(players);

    console.log('✅ Summary generated successfully');

    // 3. Send email
    console.log('📧 Sending email...');
    const emailService = new EmailService();
    const emailResult = await emailService.sendWeeklySummary(htmlContent);

    if (!emailResult.success) {
      console.error('❌ Email send failed:', emailResult.error);
      return res.status(500).json({
        success: false,
        error: 'Email send failed',
        message: emailResult.error,
        playerCount: players.length
      });
    }

    console.log('✅ Weekly summary email sent successfully!');

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Weekly summary email sent successfully',
      playerCount: players.length,
      emailSent: true,
      timestamp: new Date().toISOString(),
      emailResult: emailResult.data
    });

  } catch (error) {
    console.error('❌ Error generating weekly summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

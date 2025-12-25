// Test Email Endpoint
// Allows manual testing of the email service and weekly summary
// Use this to verify your email configuration before deploying the cron job

const PostgresWatchlistManager = require('../../../postgres-watchlist-manager');
const SummaryGenerator = require('../../../lib/summaryGenerator');
const EmailService = require('../../../lib/emailService');

// Increase timeout for this serverless function
export const config = {
  maxDuration: 60, // 60 seconds
};

/**
 * Handler for test email endpoint
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: Require authentication for test endpoint
  // You can use the same CRON_SECRET or create a separate TEST_SECRET
  const authHeader = req.headers['x-cron-secret'] || req.headers['authorization'];
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== expectedSecret) {
    console.warn('⚠️ Unauthorized test email attempt');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials'
    });
  }

  console.log('🧪 Starting test email...');
  console.log(`📅 Triggered at: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);

  try {
    const emailService = new EmailService();

    // Check if we should send a simple test or full summary
    const testType = req.body?.type || 'simple';

    if (testType === 'simple') {
      // Send simple test email
      console.log('📧 Sending simple test email...');
      const result = await emailService.sendTestEmail();

      if (!result.success) {
        console.error('❌ Test email failed:', result.error);
        return res.status(500).json({
          success: false,
          error: 'Email send failed',
          message: result.error
        });
      }

      console.log('✅ Test email sent successfully!');
      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        type: 'simple',
        emailResult: result.data
      });

    } else if (testType === 'summary') {
      // Send full weekly summary
      console.log('📧 Sending full weekly summary test...');

      // Fetch players
      const watchlist = new PostgresWatchlistManager();
      const players = await watchlist.getPlayers();

      if (players.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No players in watchlist to generate summary',
          playerCount: 0,
          emailSent: false
        });
      }

      // Generate summary
      const generator = new SummaryGenerator();
      const htmlContent = generator.generateWeeklySummaryHTML(players);

      // Send email
      const result = await emailService.sendWeeklySummary(htmlContent);

      if (!result.success) {
        console.error('❌ Summary email failed:', result.error);
        return res.status(500).json({
          success: false,
          error: 'Email send failed',
          message: result.error,
          playerCount: players.length
        });
      }

      console.log('✅ Weekly summary test email sent successfully!');
      return res.status(200).json({
        success: true,
        message: 'Weekly summary test email sent successfully',
        type: 'summary',
        playerCount: players.length,
        emailSent: true,
        emailResult: result.data
      });

    } else {
      return res.status(400).json({
        error: 'Invalid test type',
        message: 'Use type="simple" or type="summary"'
      });
    }

  } catch (error) {
    console.error('❌ Error sending test email:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

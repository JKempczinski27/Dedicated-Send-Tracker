const LeaderboardManager = require('../leaderboard-manager');
const PostgresWatchlistManager = require('../postgres-watchlist-manager');

/**
 * Email Service for Executive Summary
 *
 * This service generates and sends weekly executive summary emails
 * with key metrics and insights from the NFL Brand Growth Tracker.
 *
 * You can integrate this with:
 * - SendGrid (recommended)
 * - AWS SES
 * - Nodemailer + SMTP
 * - Postmark
 */
class EmailService {
  constructor() {
    this.leaderboard = new LeaderboardManager();
    this.watchlist = new PostgresWatchlistManager();
  }

  /**
   * Generate weekly summary data
   */
  async generateSummaryData() {
    try {
      // Get all players from leaderboard
      const leaderboardData = await this.leaderboard.getLeaderboard({
        limit: 100,
        sortBy: 'sentiment_score',
        sortOrder: 'DESC'
      });

      // Get watchlist players
      const watchlistPlayers = await this.watchlist.getPlayers();

      // Get stats
      const stats = await this.watchlist.getStats();

      // Calculate summary metrics
      const summary = {
        totalPlayers: leaderboardData.length,
        watchlistCount: watchlistPlayers.length,
        topPerformers: leaderboardData.slice(0, 10),
        bottomPerformers: leaderboardData.slice(-10).reverse(),
        averageSentiment: this.calculateAverageSentiment(leaderboardData),
        weeklyTrends: await this.getWeeklyTrends(),
        injuredPlayers: stats.injured,
        healthyPlayers: stats.healthy
      };

      return summary;
    } catch (error) {
      console.error('Error generating summary data:', error);
      throw error;
    }
  }

  /**
   * Calculate average sentiment score
   */
  calculateAverageSentiment(players) {
    if (players.length === 0) return 0;

    const total = players.reduce((sum, player) => {
      return sum + (player.sentiment_score || 0);
    }, 0);

    return (total / players.length).toFixed(2);
  }

  /**
   * Get weekly trends (placeholder - implement based on your data structure)
   */
  async getWeeklyTrends() {
    // TODO: Implement actual trend analysis
    // This would compare current week vs previous week
    return {
      sentimentChange: '+5%',
      newInjuries: 3,
      recoveries: 2
    };
  }

  /**
   * Format email HTML
   */
  formatEmailHTML(data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .metric {
      background: #f7fafc;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .player-list {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .player-item {
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sentiment-positive { color: #48bb78; font-weight: bold; }
    .sentiment-negative { color: #f56565; font-weight: bold; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #718096;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏈 NFL Brand Growth Tracker</h1>
    <p>Weekly Executive Summary - ${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</p>
  </div>

  <div class="metric">
    <h3>📊 Key Metrics</h3>
    <ul>
      <li><strong>Total Players Tracked:</strong> ${data.totalPlayers}</li>
      <li><strong>Watchlist Players:</strong> ${data.watchlistCount}</li>
      <li><strong>Average Sentiment:</strong> ${data.averageSentiment}</li>
      <li><strong>Injured Players:</strong> ${data.injuredPlayers}</li>
      <li><strong>Healthy Players:</strong> ${data.healthyPlayers}</li>
    </ul>
  </div>

  <div class="metric">
    <h3>📈 Weekly Trends</h3>
    <ul>
      <li><strong>Sentiment Change:</strong> ${data.weeklyTrends.sentimentChange}</li>
      <li><strong>New Injuries:</strong> ${data.weeklyTrends.newInjuries}</li>
      <li><strong>Recoveries:</strong> ${data.weeklyTrends.recoveries}</li>
    </ul>
  </div>

  <div class="player-list">
    <h3>🌟 Top 10 Performers</h3>
    ${data.topPerformers.map((player, index) => `
      <div class="player-item">
        <span><strong>#${index + 1}</strong> ${player.name} (${player.team})</span>
        <span class="sentiment-positive">+${player.sentiment_score || 'N/A'}</span>
      </div>
    `).join('')}
  </div>

  <div class="player-list">
    <h3>⚠️ Bottom 10 Performers</h3>
    ${data.bottomPerformers.map((player, index) => `
      <div class="player-item">
        <span>${player.name} (${player.team})</span>
        <span class="sentiment-negative">${player.sentiment_score || 'N/A'}</span>
      </div>
    `).join('')}
  </div>

  <div class="footer">
    <p>This is an automated weekly summary from the NFL Brand Growth Tracker.</p>
    <p>For more details, visit your dashboard at ${process.env.APP_URL || 'your-app-url'}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Send weekly summary email
   *
   * IMPLEMENTATION OPTIONS:
   *
   * 1. SendGrid:
   *    npm install @sendgrid/mail
   *    const sgMail = require('@sendgrid/mail');
   *    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   *    await sgMail.send({ to, from, subject, html });
   *
   * 2. Nodemailer (SMTP):
   *    npm install nodemailer
   *    const transporter = nodemailer.createTransport({ host, port, auth });
   *    await transporter.sendMail({ from, to, subject, html });
   *
   * 3. AWS SES:
   *    npm install @aws-sdk/client-ses
   *    const ses = new SESClient({ region });
   *    await ses.send(new SendEmailCommand({ ... }));
   */
  async sendWeeklySummary() {
    try {
      console.log('📧 Generating executive summary...');
      const data = await this.generateSummaryData();
      const html = this.formatEmailHTML(data);

      // TODO: Implement actual email sending
      // For now, just log the summary
      console.log('\n===== EXECUTIVE SUMMARY =====');
      console.log(`Total Players: ${data.totalPlayers}`);
      console.log(`Watchlist: ${data.watchlistCount}`);
      console.log(`Average Sentiment: ${data.averageSentiment}`);
      console.log(`Top Performer: ${data.topPerformers[0]?.name || 'N/A'}`);
      console.log('============================\n');

      // Uncomment and configure your email provider:

      /*
      // Example: SendGrid
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      await sgMail.send({
        to: process.env.SUMMARY_EMAIL_RECIPIENTS?.split(',') || ['admin@example.com'],
        from: process.env.SUMMARY_EMAIL_FROM || 'noreply@nfltracker.com',
        subject: `NFL Brand Growth Tracker - Weekly Summary (${new Date().toLocaleDateString()})`,
        html: html
      });
      */

      await this.leaderboard.close();
      await this.watchlist.close();

      return {
        success: true,
        message: 'Summary generated successfully',
        data: {
          totalPlayers: data.totalPlayers,
          topPerformer: data.topPerformers[0]?.name
        }
      };

    } catch (error) {
      console.error('Error sending weekly summary:', error);
      await this.leaderboard.close();
      await this.watchlist.close();

      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = EmailService;

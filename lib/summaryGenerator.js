// Weekly Summary Generator
// Generates executive summaries for NFL player tracking data

class SummaryGenerator {
  constructor() {
    this.brandColors = {
      navy: '#0a2463',
      red: '#dc2626',
      lightGray: '#f5f7fa',
      darkGray: '#333',
      mediumGray: '#6b7280',
      success: '#155724',
      successBg: '#d4edda',
      error: '#721c24',
      errorBg: '#f8d7da',
      warning: '#856404',
      warningBg: '#fff3cd',
    };
  }

  /**
   * Analyze players to identify crisis alerts (negative sentiment + high volume)
   * @param {Array} players - Array of player objects from database
   * @returns {Array} - Crisis alerts
   */
  analyzeCrisisAlerts(players) {
    const alerts = [];

    for (const player of players) {
      if (!player.cachedData || !player.cachedData.news) continue;

      const { news, injury } = player.cachedData;
      const { analysis } = news || {};

      // Crisis criteria: Negative sentiment (< -0.3) AND high volume (> 5 articles)
      const hasNegativeSentiment = analysis?.avgSentiment < -0.3;
      const hasHighVolume = (analysis?.totalArticles || 0) > 5;
      const isInjured = injury && injury.found && injury.status !== 'Healthy';

      if (hasNegativeSentiment && hasHighVolume) {
        alerts.push({
          name: player.name,
          team: player.team,
          position: player.position,
          sentiment: analysis.avgSentiment,
          articleCount: analysis.totalArticles,
          isInjured,
          injuryStatus: isInjured ? injury.status : null,
          severity: this.calculateSeverity(analysis.avgSentiment, analysis.totalArticles),
        });
      }
    }

    // Sort by severity (most severe first)
    return alerts.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Calculate crisis severity score (0-100)
   * @param {number} sentiment - Average sentiment score
   * @param {number} volume - Article count
   * @returns {number} - Severity score
   */
  calculateSeverity(sentiment, volume) {
    const sentimentScore = Math.abs(sentiment) * 50; // -1 = 50 points
    const volumeScore = Math.min(volume / 20, 1) * 50; // 20+ articles = 50 points
    return Math.round(sentimentScore + volumeScore);
  }

  /**
   * Find top sentiment movers (biggest changes)
   * @param {Array} players - Array of player objects
   * @returns {Array} - Top movers (positive and negative)
   */
  analyzeTopMovers(players) {
    const movers = [];

    for (const player of players) {
      if (!player.cachedData || !player.cachedData.news) continue;

      const { news } = player.cachedData;
      const { analysis } = news || {};

      if (!analysis || !analysis.avgSentiment) continue;

      movers.push({
        name: player.name,
        team: player.team,
        position: player.position,
        sentiment: analysis.avgSentiment,
        articleCount: analysis.totalArticles || 0,
        direction: analysis.avgSentiment > 0 ? 'positive' : 'negative',
      });
    }

    // Sort by absolute sentiment value (most extreme first)
    movers.sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment));

    return {
      topPositive: movers.filter(m => m.direction === 'positive').slice(0, 3),
      topNegative: movers.filter(m => m.direction === 'negative').slice(0, 3),
    };
  }

  /**
   * Find injured players
   * @param {Array} players - Array of player objects
   * @returns {Array} - Injured players
   */
  analyzeInjuries(players) {
    const injured = [];

    for (const player of players) {
      if (!player.cachedData || !player.cachedData.injury) continue;

      const { injury } = player.cachedData;

      if (injury.found && injury.status && injury.status !== 'Healthy') {
        injured.push({
          name: player.name,
          team: player.team,
          position: player.position,
          status: injury.status,
          injuries: injury.injuries,
          practiceStatus: injury.practiceStatus || 'N/A',
        });
      }
    }

    // Sort by status severity (Out > Doubtful > Questionable > Probable)
    const statusOrder = { 'Out': 0, 'Doubtful': 1, 'Questionable': 2, 'Probable': 3 };
    injured.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

    return injured;
  }

  /**
   * Generate overall summary statistics
   * @param {Array} players - Array of player objects
   * @returns {Object} - Summary stats
   */
  generateStats(players) {
    let totalPlayers = players.length;
    let playersWithData = 0;
    let totalArticles = 0;
    let avgSentiment = 0;
    let sentimentCount = 0;

    for (const player of players) {
      if (player.cachedData) {
        playersWithData++;

        if (player.cachedData.news && player.cachedData.news.analysis) {
          totalArticles += player.cachedData.news.analysis.totalArticles || 0;
          if (player.cachedData.news.analysis.avgSentiment !== null) {
            avgSentiment += player.cachedData.news.analysis.avgSentiment;
            sentimentCount++;
          }
        }
      }
    }

    return {
      totalPlayers,
      playersWithData,
      totalArticles,
      avgSentiment: sentimentCount > 0 ? (avgSentiment / sentimentCount) : 0,
    };
  }

  /**
   * Format sentiment score for display
   * @param {number} sentiment - Sentiment score (-1 to 1)
   * @returns {string} - Formatted sentiment with emoji
   */
  formatSentiment(sentiment) {
    if (sentiment === null || sentiment === undefined) return 'N/A';

    const score = (sentiment * 100).toFixed(0);
    const emoji = sentiment > 0.2 ? '📈' : sentiment < -0.2 ? '📉' : '➡️';
    const color = sentiment > 0.2 ? this.brandColors.success : sentiment < -0.2 ? this.brandColors.red : this.brandColors.mediumGray;

    return `<span style="color: ${color};">${emoji} ${score > 0 ? '+' : ''}${score}</span>`;
  }

  /**
   * Generate HTML email for weekly summary
   * @param {Array} players - Array of player objects from database
   * @returns {string} - HTML email content
   */
  generateWeeklySummaryHTML(players) {
    const stats = this.generateStats(players);
    const crisisAlerts = this.analyzeCrisisAlerts(players);
    const movers = this.analyzeTopMovers(players);
    const injuries = this.analyzeInjuries(players);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NFL Brand Growth Tracker - Weekly Executive Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${this.brandColors.lightGray}; color: ${this.brandColors.darkGray};">

  <!-- Main Container -->
  <div style="max-width: 700px; margin: 0 auto; padding: 30px 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${this.brandColors.navy} 0%, #0d2f6e 100%); border-radius: 12px 12px 0 0; padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        📊 Weekly Executive Summary
      </h1>
      <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
        NFL Brand Growth Tracker
      </p>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.7); font-size: 14px;">
        ${dateStr}
      </p>
    </div>

    <!-- Main Content Card -->
    <div style="background: white; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 0;">

      <!-- Key Metrics -->
      <div style="padding: 30px 30px 20px 30px; border-bottom: 2px solid ${this.brandColors.lightGray};">
        <h2 style="margin: 0 0 20px 0; color: ${this.brandColors.navy}; font-size: 20px; font-weight: 600;">
          📈 Overview
        </h2>
        <div style="display: table; width: 100%; border-collapse: collapse;">
          <div style="display: table-row;">
            <div style="display: table-cell; padding: 12px; background: ${this.brandColors.lightGray}; border-radius: 8px; text-align: center; width: 33%;">
              <div style="font-size: 32px; font-weight: 700; color: ${this.brandColors.navy};">${stats.totalPlayers}</div>
              <div style="font-size: 14px; color: ${this.brandColors.mediumGray}; margin-top: 4px;">Players Tracked</div>
            </div>
            <div style="display: table-cell; width: 2%;"></div>
            <div style="display: table-cell; padding: 12px; background: ${this.brandColors.lightGray}; border-radius: 8px; text-align: center; width: 33%;">
              <div style="font-size: 32px; font-weight: 700; color: ${this.brandColors.navy};">${stats.totalArticles}</div>
              <div style="font-size: 14px; color: ${this.brandColors.mediumGray}; margin-top: 4px;">News Articles</div>
            </div>
            <div style="display: table-cell; width: 2%;"></div>
            <div style="display: table-cell; padding: 12px; background: ${this.brandColors.lightGray}; border-radius: 8px; text-align: center; width: 33%;">
              <div style="font-size: 32px; font-weight: 700; color: ${stats.avgSentiment > 0 ? this.brandColors.success : this.brandColors.red};">${(stats.avgSentiment * 100).toFixed(0)}</div>
              <div style="font-size: 14px; color: ${this.brandColors.mediumGray}; margin-top: 4px;">Avg Sentiment</div>
            </div>
          </div>
        </div>
      </div>

      ${this.generateCrisisAlertsSection(crisisAlerts)}
      ${this.generateInjuriesSection(injuries)}
      ${this.generateMoversSection(movers)}

      <!-- Footer -->
      <div style="padding: 30px; background: ${this.brandColors.lightGray}; text-align: center; border-radius: 0 0 12px 12px;">
        <p style="margin: 0; font-size: 14px; color: ${this.brandColors.mediumGray};">
          Generated by <strong>NFL Brand Growth Tracker</strong>
        </p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: ${this.brandColors.mediumGray};">
          Automated weekly summary • ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
        </p>
      </div>

    </div>
  </div>

</body>
</html>
    `.trim();
  }

  /**
   * Generate Crisis Alerts section HTML
   * @param {Array} alerts - Crisis alerts
   * @returns {string} - HTML section
   */
  generateCrisisAlertsSection(alerts) {
    if (alerts.length === 0) {
      return `
      <div style="padding: 30px; border-bottom: 2px solid ${this.brandColors.lightGray};">
        <h2 style="margin: 0 0 16px 0; color: ${this.brandColors.navy}; font-size: 20px; font-weight: 600;">
          🚨 Crisis Alerts
        </h2>
        <div style="padding: 20px; background: ${this.brandColors.successBg}; border-left: 4px solid ${this.brandColors.success}; border-radius: 6px;">
          <p style="margin: 0; color: ${this.brandColors.success}; font-weight: 500;">
            ✅ No crisis situations detected this week
          </p>
        </div>
      </div>
      `;
    }

    const alertsHTML = alerts.map(alert => `
      <div style="margin-bottom: 16px; padding: 16px; background: ${this.brandColors.errorBg}; border-left: 4px solid ${this.brandColors.red}; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div>
            <strong style="color: ${this.brandColors.error}; font-size: 16px;">${alert.name}</strong>
            <span style="color: ${this.brandColors.mediumGray}; font-size: 14px; margin-left: 8px;">${alert.team} • ${alert.position}</span>
          </div>
          <span style="background: ${this.brandColors.red}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            Severity: ${alert.severity}
          </span>
        </div>
        <div style="color: ${this.brandColors.error}; font-size: 14px; line-height: 1.5;">
          ${this.formatSentiment(alert.sentiment)} sentiment • ${alert.articleCount} articles
          ${alert.isInjured ? `<br>⚕️ <strong>Injured:</strong> ${alert.injuryStatus}` : ''}
        </div>
      </div>
    `).join('');

    return `
      <div style="padding: 30px; border-bottom: 2px solid ${this.brandColors.lightGray};">
        <h2 style="margin: 0 0 16px 0; color: ${this.brandColors.navy}; font-size: 20px; font-weight: 600;">
          🚨 Crisis Alerts
          <span style="background: ${this.brandColors.red}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; margin-left: 10px;">
            ${alerts.length}
          </span>
        </h2>
        ${alertsHTML}
      </div>
    `;
  }

  /**
   * Generate Injuries section HTML
   * @param {Array} injuries - Injured players
   * @returns {string} - HTML section
   */
  generateInjuriesSection(injuries) {
    if (injuries.length === 0) {
      return `
      <div style="padding: 30px; border-bottom: 2px solid ${this.brandColors.lightGray};">
        <h2 style="margin: 0 0 16px 0; color: ${this.brandColors.navy}; font-size: 20px; font-weight: 600;">
          ⚕️ Injury Report
        </h2>
        <div style="padding: 20px; background: ${this.brandColors.successBg}; border-left: 4px solid ${this.brandColors.success}; border-radius: 6px;">
          <p style="margin: 0; color: ${this.brandColors.success}; font-weight: 500;">
            ✅ No active injuries on watchlist
          </p>
        </div>
      </div>
      `;
    }

    const injuriesHTML = injuries.map(player => {
      const statusColor = player.status === 'Out' ? this.brandColors.red :
                         player.status === 'Doubtful' ? this.brandColors.warning :
                         this.brandColors.mediumGray;

      return `
      <div style="margin-bottom: 12px; padding: 14px; background: ${this.brandColors.lightGray}; border-left: 4px solid ${statusColor}; border-radius: 6px;">
        <div style="margin-bottom: 6px;">
          <strong style="color: ${this.brandColors.navy}; font-size: 15px;">${player.name}</strong>
          <span style="color: ${this.brandColors.mediumGray}; font-size: 13px; margin-left: 8px;">${player.team} • ${player.position}</span>
        </div>
        <div style="color: ${this.brandColors.darkGray}; font-size: 14px;">
          <span style="color: ${statusColor}; font-weight: 600;">${player.status}</span> • ${player.injuries}
          ${player.practiceStatus !== 'N/A' ? ` • Practice: ${player.practiceStatus}` : ''}
        </div>
      </div>
      `;
    }).join('');

    return `
      <div style="padding: 30px; border-bottom: 2px solid ${this.brandColors.lightGray};">
        <h2 style="margin: 0 0 16px 0; color: ${this.brandColors.navy}; font-size: 20px; font-weight: 600;">
          ⚕️ Injury Report
          <span style="background: ${this.brandColors.red}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; margin-left: 10px;">
            ${injuries.length}
          </span>
        </h2>
        ${injuriesHTML}
      </div>
    `;
  }

  /**
   * Generate Top Movers section HTML
   * @param {Object} movers - Top positive and negative movers
   * @returns {string} - HTML section
   */
  generateMoversSection(movers) {
    if (movers.topPositive.length === 0 && movers.topNegative.length === 0) {
      return `
      <div style="padding: 30px;">
        <h2 style="margin: 0 0 16px 0; color: ${this.brandColors.navy}; font-size: 20px; font-weight: 600;">
          📊 Top Sentiment Movers
        </h2>
        <div style="padding: 20px; background: ${this.brandColors.lightGray}; border-radius: 6px; text-align: center;">
          <p style="margin: 0; color: ${this.brandColors.mediumGray};">
            No significant sentiment movements this week
          </p>
        </div>
      </div>
      `;
    }

    const positiveHTML = movers.topPositive.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; color: ${this.brandColors.success}; font-size: 16px; font-weight: 600;">
          📈 Most Positive
        </h3>
        ${movers.topPositive.map(player => `
          <div style="margin-bottom: 10px; padding: 12px; background: ${this.brandColors.successBg}; border-left: 4px solid ${this.brandColors.success}; border-radius: 6px;">
            <div style="margin-bottom: 4px;">
              <strong style="color: ${this.brandColors.navy}; font-size: 15px;">${player.name}</strong>
              <span style="color: ${this.brandColors.mediumGray}; font-size: 13px; margin-left: 8px;">${player.team} • ${player.position}</span>
            </div>
            <div style="color: ${this.brandColors.success}; font-size: 14px;">
              ${this.formatSentiment(player.sentiment)} • ${player.articleCount} articles
            </div>
          </div>
        `).join('')}
      </div>
    ` : '';

    const negativeHTML = movers.topNegative.length > 0 ? `
      <div>
        <h3 style="margin: 0 0 12px 0; color: ${this.brandColors.red}; font-size: 16px; font-weight: 600;">
          📉 Most Negative
        </h3>
        ${movers.topNegative.map(player => `
          <div style="margin-bottom: 10px; padding: 12px; background: ${this.brandColors.errorBg}; border-left: 4px solid ${this.brandColors.red}; border-radius: 6px;">
            <div style="margin-bottom: 4px;">
              <strong style="color: ${this.brandColors.navy}; font-size: 15px;">${player.name}</strong>
              <span style="color: ${this.brandColors.mediumGray}; font-size: 13px; margin-left: 8px;">${player.team} • ${player.position}</span>
            </div>
            <div style="color: ${this.brandColors.red}; font-size: 14px;">
              ${this.formatSentiment(player.sentiment)} • ${player.articleCount} articles
            </div>
          </div>
        `).join('')}
      </div>
    ` : '';

    return `
      <div style="padding: 30px;">
        <h2 style="margin: 0 0 16px 0; color: ${this.brandColors.navy}; font-size: 20px; font-weight: 600;">
          📊 Top Sentiment Movers
        </h2>
        ${positiveHTML}
        ${negativeHTML}
      </div>
    `;
  }
}

module.exports = SummaryGenerator;

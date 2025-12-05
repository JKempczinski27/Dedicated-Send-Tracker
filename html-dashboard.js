const fs = require('fs');
const path = require('path');
const WatchlistManager = require('./watchlist-manager');

class HTMLDashboard {
    constructor() {
        this.watchlist = new WatchlistManager();
        this.outputFile = path.join(__dirname, 'dashboard.html');
    }

    generateHTML() {
        const players = this.watchlist.getPlayers();
        const stats = this.watchlist.getStats();

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NFL Player Tracking Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        .header h1 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 2.5em;
        }

        .stats {
            display: flex;
            gap: 20px;
            margin-top: 20px;
        }

        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            flex: 1;
            text-align: center;
        }

        .stat-card h3 {
            font-size: 2em;
            margin-bottom: 5px;
        }

        .stat-card p {
            opacity: 0.9;
            font-size: 0.9em;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
            gap: 20px;
        }

        .player-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .player-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 50px rgba(0,0,0,0.15);
        }

        .player-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
        }

        .player-name {
            font-size: 1.5em;
            font-weight: bold;
            color: #2d3748;
        }

        .injury-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.85em;
        }

        .injury-badge.healthy {
            background: #48bb78;
            color: white;
        }

        .injury-badge.injured {
            background: #f56565;
            color: white;
        }

        .section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 0.9em;
            font-weight: bold;
            color: #718096;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .injury-details {
            background: #fff5f5;
            border-left: 4px solid #f56565;
            padding: 12px;
            border-radius: 5px;
        }

        .injury-details p {
            margin: 5px 0;
            color: #2d3748;
        }

        .sentiment-bar {
            display: flex;
            height: 30px;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        .sentiment-positive {
            background: #48bb78;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.8em;
            font-weight: bold;
        }

        .sentiment-neutral {
            background: #ecc94b;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.8em;
            font-weight: bold;
        }

        .sentiment-negative {
            background: #f56565;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.8em;
            font-weight: bold;
        }

        .sentiment-score {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .sentiment-score.positive {
            color: #48bb78;
        }

        .sentiment-score.neutral {
            color: #ecc94b;
        }

        .sentiment-score.negative {
            color: #f56565;
        }

        .comparison {
            display: flex;
            gap: 15px;
            margin-top: 10px;
        }

        .comparison-item {
            flex: 1;
            background: #f7fafc;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }

        .comparison-item strong {
            display: block;
            color: #4a5568;
            font-size: 0.8em;
            margin-bottom: 5px;
        }

        .comparison-item span {
            font-size: 1.3em;
            font-weight: bold;
            color: #2d3748;
        }

        .mentions {
            display: flex;
            gap: 10px;
        }

        .mention-badge {
            background: #edf2f7;
            padding: 10px 15px;
            border-radius: 5px;
            text-align: center;
            flex: 1;
        }

        .mention-badge strong {
            display: block;
            font-size: 1.5em;
            color: #667eea;
            margin-bottom: 3px;
        }

        .mention-badge span {
            font-size: 0.8em;
            color: #718096;
        }

        .last-updated {
            text-align: center;
            color: #718096;
            margin-top: 20px;
            font-size: 0.9em;
        }

        .no-data {
            text-align: center;
            padding: 40px;
            color: #718096;
        }

        .empty-state {
            background: white;
            border-radius: 15px;
            padding: 60px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }

        .empty-state h2 {
            color: #2d3748;
            margin-bottom: 10px;
        }

        .empty-state p {
            color: #718096;
            line-height: 1.6;
        }

        .empty-state code {
            background: #edf2f7;
            padding: 2px 6px;
            border-radius: 3px;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏈 NFL Player Tracking Dashboard</h1>
            <p style="color: #718096; margin-top: 10px;">Monitor injury status, news sentiment, and social media mentions</p>
            <div class="stats">
                <div class="stat-card">
                    <h3>${stats.total}</h3>
                    <p>Total Players</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.injured}</h3>
                    <p>Currently Injured</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.healthy}</h3>
                    <p>Healthy</p>
                </div>
            </div>
        </div>

        ${players.length === 0 ? this._generateEmptyState() : this._generatePlayerCards(players)}

        <div class="last-updated">
            Last Updated: ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    _generateEmptyState() {
        return `
        <div class="empty-state">
            <h2>Your watchlist is empty</h2>
            <p>Add players to start tracking their injury status and media coverage.</p>
            <p style="margin-top: 20px;">
                Run: <code>npm run dashboard add "Player Name"</code>
            </p>
        </div>
        `;
    }

    _generatePlayerCards(players) {
        return `<div class="grid">\n${players.map(player => this._generatePlayerCard(player)).join('\n')}\n</div>`;
    }

    _generatePlayerCard(player) {
        const data = player.cachedData;
        const hasData = data && player.lastChecked;

        if (!hasData) {
            return `
            <div class="player-card">
                <div class="player-header">
                    <div class="player-name">${player.name}</div>
                </div>
                <div class="no-data">
                    ⚠️ No data available<br>
                    <small>Run dashboard update to fetch data</small>
                </div>
            </div>
            `;
        }

        const isInjured = !!data.injury;
        const injurySection = this._generateInjurySection(data.injury);
        const newsSection = this._generateNewsSection(data.news);
        const mentionsSection = this._generateMentionsSection(data);

        return `
        <div class="player-card">
            <div class="player-header">
                <div class="player-name">${player.name}</div>
                <div class="injury-badge ${isInjured ? 'injured' : 'healthy'}">
                    ${isInjured ? '⚠️ INJURED' : '✅ HEALTHY'}
                </div>
            </div>

            ${injurySection}
            ${newsSection}
            ${mentionsSection}

            <p style="color: #718096; font-size: 0.85em; margin-top: 15px;">
                Last checked: ${new Date(player.lastChecked).toLocaleString()}
            </p>
        </div>
        `;
    }

    _generateInjurySection(injury) {
        if (!injury) return '';

        return `
        <div class="section">
            <div class="section-title">🏥 Injury Details</div>
            <div class="injury-details">
                <p><strong>Team:</strong> ${injury.Team}</p>
                <p><strong>Position:</strong> ${injury.Position}</p>
                <p><strong>Injury:</strong> ${injury.BodyPart || 'N/A'}</p>
                <p><strong>Status:</strong> ${injury.Status || 'Unknown'}</p>
                ${injury.Updated ? `<p><strong>Updated:</strong> ${injury.Updated}</p>` : ''}
            </div>
        </div>
        `;
    }

    _generateNewsSection(newsData) {
        if (!newsData || !newsData.analysis) {
            return '<div class="section"><div class="section-title">📰 News Sentiment</div><p style="color: #718096;">No news data available</p></div>';
        }

        const analysis = newsData.analysis;
        const sentimentClass = analysis.overallSentiment.score > 0 ? 'positive' : analysis.overallSentiment.score < 0 ? 'negative' : 'neutral';

        let comparisonHTML = '';
        if (analysis.sourceComparison.national.count > 0 && analysis.sourceComparison.local.count > 0) {
            comparisonHTML = `
            <div class="comparison">
                <div class="comparison-item">
                    <strong>National</strong>
                    <span>${analysis.sourceComparison.national.avgSentiment}</span>
                </div>
                <div class="comparison-item">
                    <strong>Local</strong>
                    <span>${analysis.sourceComparison.local.avgSentiment}</span>
                </div>
                <div class="comparison-item">
                    <strong>Difference</strong>
                    <span>${analysis.sourceComparison.difference}</span>
                </div>
            </div>
            `;
        }

        return `
        <div class="section">
            <div class="section-title">📰 News Sentiment Analysis</div>
            <div class="sentiment-score ${sentimentClass}">
                ${analysis.overallSentiment.label} (${analysis.overallSentiment.score})
            </div>
            <div class="sentiment-bar">
                ${analysis.breakdown.positive.percentage > 0 ? `<div class="sentiment-positive" style="width: ${analysis.breakdown.positive.percentage}%">${analysis.breakdown.positive.percentage}%</div>` : ''}
                ${analysis.breakdown.neutral.percentage > 0 ? `<div class="sentiment-neutral" style="width: ${analysis.breakdown.neutral.percentage}%">${analysis.breakdown.neutral.percentage}%</div>` : ''}
                ${analysis.breakdown.negative.percentage > 0 ? `<div class="sentiment-negative" style="width: ${analysis.breakdown.negative.percentage}%">${analysis.breakdown.negative.percentage}%</div>` : ''}
            </div>
            <p style="color: #718096; font-size: 0.9em; margin-bottom: 10px;">${analysis.total} articles analyzed</p>
            ${comparisonHTML}
        </div>
        `;
    }

    _generateMentionsSection(data) {
        const podcastCount = data.podcasts ? data.podcasts.length : 0;
        const youtubeCount = data.youtube ? data.youtube.length : 0;
        const redditCount = data.reddit ? data.reddit.length : 0;

        return `
        <div class="section">
            <div class="section-title">💬 Social Media Mentions</div>
            <div class="mentions">
                <div class="mention-badge">
                    <strong>${podcastCount}</strong>
                    <span>Podcasts</span>
                </div>
                <div class="mention-badge">
                    <strong>${youtubeCount}</strong>
                    <span>YouTube</span>
                </div>
                <div class="mention-badge">
                    <strong>${redditCount}</strong>
                    <span>Reddit</span>
                </div>
            </div>
        </div>
        `;
    }

    saveHTML() {
        const html = this.generateHTML();
        fs.writeFileSync(this.outputFile, html);
        return this.outputFile;
    }
}

// Main execution
function main() {
    const dashboard = new HTMLDashboard();
    const outputFile = dashboard.saveHTML();
    console.log(`\n✅ HTML Dashboard generated: ${outputFile}`);
    console.log('\nOpen this file in your browser to view the dashboard.\n');
}

if (require.main === module) {
    main();
}

module.exports = HTMLDashboard;

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
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            padding: 15px;
            font-size: 12px;
            color: #333;
        }

        .container {
            max-width: 100%;
            margin: 0 auto;
            background: white;
            border: 1px solid #dee2e6;
        }

        .header {
            background: #0a2463;
            color: white;
            padding: 12px 20px;
            border-bottom: 3px solid #dc2626;
        }

        .header h1 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }

        .header-subtitle {
            font-size: 11px;
            opacity: 0.9;
        }

        .stats-bar {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            padding: 8px 20px;
            gap: 30px;
        }

        .stat-item {
            font-size: 11px;
        }

        .stat-item strong {
            color: #0a2463;
            font-weight: 600;
        }

        .table-container {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }

        thead {
            background: #f1f3f5;
            border-bottom: 2px solid #0a2463;
        }

        th {
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
            color: #0a2463;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border-right: 1px solid #dee2e6;
        }

        th:last-child {
            border-right: none;
        }

        tbody tr {
            border-bottom: 1px solid #e9ecef;
        }

        tbody tr:hover {
            background: #f8f9fa;
        }

        tbody tr:nth-child(even) {
            background: #fafbfc;
        }

        tbody tr:nth-child(even):hover {
            background: #f1f3f5;
        }

        td {
            padding: 6px 10px;
            border-right: 1px solid #e9ecef;
            vertical-align: top;
        }

        td:last-child {
            border-right: none;
        }

        .player-name {
            font-weight: 600;
            color: #0a2463;
            font-size: 12px;
        }

        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-healthy {
            background: #d4edda;
            color: #155724;
        }

        .status-injured {
            background: #f8d7da;
            color: #721c24;
        }

        .injury-detail {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
        }

        .sentiment-score {
            font-weight: 600;
            font-size: 11px;
        }

        .sentiment-positive {
            color: #28a745;
        }

        .sentiment-neutral {
            color: #6c757d;
        }

        .sentiment-negative {
            color: #dc2626;
        }

        .sentiment-breakdown {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
        }

        .comparison {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
        }

        .mentions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .mention-item {
            font-size: 10px;
        }

        .mention-count {
            font-weight: 600;
            color: #dc2626;
        }

        .timestamp {
            font-size: 10px;
            color: #6c757d;
        }

        .no-data {
            color: #6c757d;
            font-style: italic;
            font-size: 10px;
        }

        .footer {
            padding: 8px 20px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            font-size: 10px;
            color: #6c757d;
            text-align: right;
        }

        .empty-state {
            padding: 40px;
            text-align: center;
            color: #6c757d;
        }

        .empty-state h2 {
            font-size: 14px;
            color: #0a2463;
            margin-bottom: 8px;
        }

        .empty-state p {
            font-size: 11px;
        }

        @media print {
            body {
                padding: 0;
            }
            .container {
                border: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>NFL Player Tracking Dashboard</h1>
            <div class="header-subtitle">Real-time injury status, news sentiment analysis, and social media monitoring</div>
        </div>

        <div class="stats-bar">
            <div class="stat-item"><strong>Total Players:</strong> ${stats.total}</div>
            <div class="stat-item"><strong>Currently Injured:</strong> ${stats.injured}</div>
            <div class="stat-item"><strong>Healthy:</strong> ${stats.healthy}</div>
            <div class="stat-item"><strong>Last Updated:</strong> ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}</div>
        </div>

        ${players.length === 0 ? this._generateEmptyState() : this._generateTable(players)}

        <div class="footer">
            Generated: ${new Date().toLocaleString()} | NFL Player Tracking System
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    _generateEmptyState() {
        return `
        <div class="empty-state">
            <h2>No Players on Watchlist</h2>
            <p>Add players using: <code>npm run dashboard add "Player Name"</code></p>
        </div>
        `;
    }

    _generateTable(players) {
        return `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%;">Player Name</th>
                        <th style="width: 12%;">Injury Status</th>
                        <th style="width: 18%;">Injury Details</th>
                        <th style="width: 20%;">News Sentiment</th>
                        <th style="width: 15%;">Source Comparison</th>
                        <th style="width: 12%;">Social Media</th>
                        <th style="width: 8%;">Last Updated</th>
                    </tr>
                </thead>
                <tbody>
                    ${players.map(player => this._generateTableRow(player)).join('')}
                </tbody>
            </table>
        </div>
        `;
    }

    _generateTableRow(player) {
        const data = player.cachedData;
        const hasData = data && player.lastChecked;

        if (!hasData) {
            return `
            <tr>
                <td class="player-name">${player.name}</td>
                <td colspan="6" class="no-data">No data available - run dashboard update</td>
            </tr>
            `;
        }

        const isInjured = !!data.injury;
        const injury = data.injury;
        const newsAnalysis = data.news?.analysis;
        const podcastCount = data.podcasts ? data.podcasts.length : 0;
        const youtubeCount = data.youtube ? data.youtube.length : 0;
        const redditCount = data.reddit ? data.reddit.length : 0;

        // Injury Status
        const statusBadge = isInjured
            ? '<span class="status-badge status-injured">Injured</span>'
            : '<span class="status-badge status-healthy">Healthy</span>';

        // Injury Details
        const injuryDetails = isInjured
            ? `<div><strong>${injury.Team} ${injury.Position}</strong></div>
               <div class="injury-detail">Body Part: ${injury.BodyPart || 'N/A'}</div>
               <div class="injury-detail">Status: ${injury.Status || 'Unknown'}</div>`
            : '<span class="no-data">None</span>';

        // News Sentiment
        let newsSentiment = '<span class="no-data">No data</span>';
        if (newsAnalysis) {
            const sentimentClass = newsAnalysis.overallSentiment.score > 0 ? 'positive' : newsAnalysis.overallSentiment.score < 0 ? 'negative' : 'neutral';
            newsSentiment = `
                <div class="sentiment-score sentiment-${sentimentClass}">${newsAnalysis.overallSentiment.label} (${newsAnalysis.overallSentiment.score})</div>
                <div class="sentiment-breakdown">${newsAnalysis.total} articles: ${newsAnalysis.breakdown.positive.percentage}% pos, ${newsAnalysis.breakdown.neutral.percentage}% neu, ${newsAnalysis.breakdown.negative.percentage}% neg</div>
            `;
        }

        // Source Comparison
        let sourceComparison = '<span class="no-data">N/A</span>';
        if (newsAnalysis && newsAnalysis.sourceComparison.national.count > 0 && newsAnalysis.sourceComparison.local.count > 0) {
            sourceComparison = `
                <div class="comparison">National: ${newsAnalysis.sourceComparison.national.avgSentiment} (${newsAnalysis.sourceComparison.national.count})</div>
                <div class="comparison">Local: ${newsAnalysis.sourceComparison.local.avgSentiment} (${newsAnalysis.sourceComparison.local.count})</div>
                <div class="comparison">Diff: ${newsAnalysis.sourceComparison.difference}</div>
            `;
        }

        // Social Media
        const socialMedia = `
            <div class="mentions">
                <div class="mention-item">Pod: <span class="mention-count">${podcastCount}</span></div>
                <div class="mention-item">YT: <span class="mention-count">${youtubeCount}</span></div>
                <div class="mention-item">Reddit: <span class="mention-count">${redditCount}</span></div>
            </div>
        `;

        // Timestamp
        const timestamp = `<div class="timestamp">${new Date(player.lastChecked).toLocaleDateString()}<br>${new Date(player.lastChecked).toLocaleTimeString()}</div>`;

        return `
        <tr>
            <td class="player-name">${player.name}</td>
            <td>${statusBadge}</td>
            <td>${injuryDetails}</td>
            <td>${newsSentiment}</td>
            <td>${sourceComparison}</td>
            <td>${socialMedia}</td>
            <td>${timestamp}</td>
        </tr>
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

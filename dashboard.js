require('dotenv').config();
const WatchlistManager = require('./watchlist-manager');
const EnhancedTracker = require('./enhanced-tracker');

class Dashboard {
    constructor() {
        this.watchlist = new WatchlistManager();
        this.tracker = new EnhancedTracker();
    }

    // Update all players on watchlist
    async updateAll() {
        const players = this.watchlist.getPlayers();

        if (players.length === 0) {
            console.log('Watchlist is empty. Add players with: npm run dashboard add "Player Name"');
            return;
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`UPDATING WATCHLIST (${players.length} players)`);
        console.log(`${'='.repeat(80)}\n`);

        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            console.log(`[${i + 1}/${players.length}] Fetching data for ${player.name}...`);

            try {
                const data = await this.tracker.trackPlayer(player.name);
                this.watchlist.updatePlayerData(player.name, data);

                // Add delay to avoid rate limiting
                if (i < players.length - 1) {
                    await this._delay(2000);
                }
            } catch (error) {
                console.error(`Error updating ${player.name}:`, error.message);
            }
        }

        console.log('\n✅ Watchlist updated successfully!\n');
    }

    // Display dashboard
    async showDashboard(forceUpdate = false) {
        const players = this.watchlist.getPlayers();

        if (players.length === 0) {
            console.log('\n📋 Your watchlist is empty!');
            console.log('\nAdd players with:');
            console.log('  npm run dashboard add "Patrick Mahomes"\n');
            return;
        }

        // Update data if forced or if any player hasn't been checked
        if (forceUpdate || players.some(p => !p.lastChecked)) {
            await this.updateAll();
        }

        this.displayDashboard();
    }

    // Display the dashboard with cached data
    displayDashboard() {
        const players = this.watchlist.getPlayers();
        const stats = this.watchlist.getStats();

        console.log('\n' + '═'.repeat(80));
        console.log('🏈 NFL PLAYER TRACKING DASHBOARD');
        console.log('═'.repeat(80));
        console.log(`Total Players: ${stats.total} | Injured: ${stats.injured} | Healthy: ${stats.healthy}`);
        console.log(`Last Updated: ${stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}`);
        console.log('═'.repeat(80) + '\n');

        players.forEach((player, index) => {
            this._displayPlayerCard(player, index + 1);
        });

        // Display analytics section
        this._displayAnalyticsSection(players);

        console.log('═'.repeat(80));
        console.log('Commands:');
        console.log('  Update dashboard:     npm run dashboard');
        console.log('  Add player:           npm run dashboard add "Player Name"');
        console.log('  Remove player:        npm run dashboard remove "Player Name"');
        console.log('  Log creative usage:   npm run dashboard creative "Player Name" [interactions]');
        console.log('  Update analytics:     npm run dashboard analytics "Player Name"');
        console.log('  Show analytics:       npm run dashboard analytics-only');
        console.log('═'.repeat(80) + '\n');
    }

    _displayPlayerCard(player, index) {
        const data = player.cachedData;
        const hasData = data && player.lastChecked;

        console.log(`┌─ [${index}] ${player.name.toUpperCase()} ${'─'.repeat(70 - player.name.length)}`);

        if (!hasData) {
            console.log('│ ⚠️  No data available - run dashboard update');
            console.log('└' + '─'.repeat(78) + '\n');
            return;
        }

        // Injury Status
        const isInjured = data.injury && data.injury.found && data.injury.status && data.injury.status !== 'ACT';
        if (isInjured) {
            const injury = data.injury;
            console.log('│ 🏥 INJURY STATUS: ⚠️  INJURED');
            console.log(`│    Team: ${injury.team} | Position: ${injury.position}`);
            console.log(`│    Status: ${injury.status}`);
            console.log(`│    Jersey: #${injury.jersey || 'N/A'}`);
        } else {
            console.log('│ 🏥 INJURY STATUS: ✅ HEALTHY');
        }

        console.log('│');

        // News Sentiment
        if (data.news && data.news.analysis) {
            const analysis = data.news.analysis;
            const sentimentEmoji = this._getSentimentEmoji(analysis.overallSentiment.score);

            console.log(`│ 📰 NEWS SENTIMENT: ${sentimentEmoji} ${analysis.overallSentiment.label} (${analysis.overallSentiment.score})`);
            console.log(`│    Articles: ${analysis.total} | ➕${analysis.breakdown.positive.percentage}% ➡️${analysis.breakdown.neutral.percentage}% ➖${analysis.breakdown.negative.percentage}%`);

            if (analysis.sourceComparison.national.count > 0 && analysis.sourceComparison.local.count > 0) {
                console.log(`│    National: ${analysis.sourceComparison.national.avgSentiment} | Local: ${analysis.sourceComparison.local.avgSentiment} | Diff: ${analysis.sourceComparison.difference}`);
            }
        } else {
            console.log('│ 📰 NEWS SENTIMENT: No data');
        }

        console.log('│');

        // Social Media Activity
        const podcastCount = data.podcasts ? data.podcasts.length : 0;
        const youtubeCount = data.youtube ? data.youtube.length : 0;
        const redditCount = data.reddit ? data.reddit.length : 0;

        console.log('│ 💬 SOCIAL MEDIA MENTIONS:');
        console.log(`│    Podcasts: ${podcastCount} | YouTube: ${youtubeCount} | Reddit: ${redditCount}`);

        console.log('│');
        console.log(`│ 🕐 Last Checked: ${new Date(player.lastChecked).toLocaleString()}`);
        console.log('└' + '─'.repeat(78) + '\n');
    }

    _getSentimentEmoji(score) {
        if (score > 2) return '😊';
        if (score > 0) return '🙂';
        if (score === 0) return '😐';
        if (score > -2) return '😟';
        return '😞';
    }

    // Display analytics section
    _displayAnalyticsSection(players) {
        console.log('═'.repeat(80));
        console.log('📊 CREATIVE ANALYTICS TRACKER');
        console.log('═'.repeat(80) + '\n');

        if (players.length === 0) {
            console.log('No players to track.\n');
            return;
        }

        // Table header
        console.log('┌────────────────────────────────┬─────────────────┬─────────────────────┬──────────────┐');
        console.log('│ Player Name                    │ Creative Posts  │ Last Creative       │ Interactions │');
        console.log('├────────────────────────────────┼─────────────────┼─────────────────────┼──────────────┤');

        players.forEach(player => {
            // Initialize analytics if it doesn't exist
            if (!player.analytics) {
                player.analytics = {
                    creativeUsageCount: 0,
                    lastCreativeDate: null,
                    postInteractions: 0
                };
            }

            const name = player.name.padEnd(30).substring(0, 30);
            const usageCount = String(player.analytics.creativeUsageCount).padEnd(15);
            const lastDate = player.analytics.lastCreativeDate
                ? new Date(player.analytics.lastCreativeDate).toLocaleDateString().padEnd(19)
                : 'Never'.padEnd(19);
            const interactions = String(player.analytics.postInteractions).padEnd(12);

            console.log(`│ ${name} │ ${usageCount} │ ${lastDate} │ ${interactions} │`);
        });

        console.log('└────────────────────────────────┴─────────────────┴─────────────────────┴──────────────┘\n');
    }

    // Display only analytics
    displayAnalyticsOnly() {
        const players = this.watchlist.getPlayers();

        console.log('\n' + '═'.repeat(80));
        console.log('📊 CREATIVE ANALYTICS TRACKER');
        console.log('═'.repeat(80) + '\n');

        if (players.length === 0) {
            console.log('No players to track.\n');
            return;
        }

        // Detailed analytics for each player
        players.forEach((player, index) => {
            if (!player.analytics) {
                player.analytics = {
                    creativeUsageCount: 0,
                    lastCreativeDate: null,
                    postInteractions: 0
                };
            }

            console.log(`┌─ [${index + 1}] ${player.name.toUpperCase()} ${'─'.repeat(70 - player.name.length)}`);
            console.log(`│ 📈 Creative Posts: ${player.analytics.creativeUsageCount}`);
            console.log(`│ 📅 Last Creative: ${player.analytics.lastCreativeDate ? new Date(player.analytics.lastCreativeDate).toLocaleString() : 'Never'}`);
            console.log(`│ 💬 Last Post Interactions: ${player.analytics.postInteractions}`);
            console.log('└' + '─'.repeat(78) + '\n');
        });

        console.log('═'.repeat(80));
        console.log('Commands:');
        console.log('  Log creative usage:   npm run dashboard creative "Player Name" [interactions]');
        console.log('  Update analytics:     npm run dashboard analytics "Player Name"');
        console.log('═'.repeat(80) + '\n');
    }

    // Add player to watchlist
    addPlayer(playerName) {
        const result = this.watchlist.addPlayer(playerName);
        console.log(`\n${result.success ? '✅' : '❌'} ${result.message}\n`);

        if (result.success) {
            console.log('Run "npm run dashboard" to update and view your watchlist.\n');
        }
    }

    // Remove player from watchlist
    removePlayer(playerName) {
        const result = this.watchlist.removePlayer(playerName);
        console.log(`\n${result.success ? '✅' : '❌'} ${result.message}\n`);
    }

    // List all players
    listPlayers() {
        const players = this.watchlist.getPlayers();

        if (players.length === 0) {
            console.log('\n📋 Your watchlist is empty!\n');
            return;
        }

        console.log('\n📋 WATCHLIST:\n');
        players.forEach((player, index) => {
            const injury = player.cachedData?.injury;
            const isInjured = injury && injury.found && injury.status && injury.status !== 'ACT';
            const status = isInjured ? '⚠️  Injured' : '✅ Healthy';
            console.log(`  ${index + 1}. ${player.name} - ${status}`);
        });
        console.log('');
    }

    // Clear watchlist
    clearAll() {
        const result = this.watchlist.clearWatchlist();
        console.log(`\n${result.success ? '✅' : '❌'} ${result.message}\n`);
    }

    // Log creative usage
    logCreativeUsage(playerName, interactions) {
        const result = this.watchlist.incrementCreativeUsage(playerName, interactions);
        console.log(`\n${result.success ? '✅' : '❌'} ${result.message}\n`);
    }

    // Update player analytics
    updateAnalytics(playerName) {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const analytics = this.watchlist.getPlayerAnalytics(playerName);
        if (!analytics) {
            console.log(`\n❌ Player "${playerName}" not found on watchlist\n`);
            rl.close();
            return;
        }

        console.log(`\n📊 Update Analytics for ${playerName}`);
        console.log(`Current values:`);
        console.log(`  Creative Posts: ${analytics.creativeUsageCount}`);
        console.log(`  Last Creative: ${analytics.lastCreativeDate ? new Date(analytics.lastCreativeDate).toLocaleString() : 'Never'}`);
        console.log(`  Post Interactions: ${analytics.postInteractions}\n`);

        rl.question('Creative Posts Count (press Enter to skip): ', (usageCount) => {
            rl.question('Last Creative Date (YYYY-MM-DD, press Enter to skip): ', (lastDate) => {
                rl.question('Post Interactions (press Enter to skip): ', (interactions) => {
                    const analyticsData = {};

                    if (usageCount.trim() !== '') {
                        const count = parseInt(usageCount);
                        if (!isNaN(count)) {
                            analyticsData.creativeUsageCount = count;
                        }
                    }

                    if (lastDate.trim() !== '') {
                        const date = new Date(lastDate);
                        if (!isNaN(date.getTime())) {
                            analyticsData.lastCreativeDate = date.toISOString();
                        }
                    }

                    if (interactions.trim() !== '') {
                        const count = parseInt(interactions);
                        if (!isNaN(count)) {
                            analyticsData.postInteractions = count;
                        }
                    }

                    const result = this.watchlist.updatePlayerAnalytics(playerName, analyticsData);
                    console.log(`\n${result.success ? '✅' : '❌'} ${result.message}\n`);

                    rl.close();
                });
            });
        });
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const dashboard = new Dashboard();

    if (args.length === 0) {
        // Show dashboard with update
        await dashboard.showDashboard(true);
        return;
    }

    const command = args[0].toLowerCase();

    switch (command) {
        case 'add':
            if (args.length < 2) {
                console.log('\nUsage: npm run dashboard add "Player Name"\n');
                process.exit(1);
            }
            dashboard.addPlayer(args.slice(1).join(' '));
            break;

        case 'remove':
            if (args.length < 2) {
                console.log('\nUsage: npm run dashboard remove "Player Name"\n');
                process.exit(1);
            }
            dashboard.removePlayer(args.slice(1).join(' '));
            break;

        case 'list':
            dashboard.listPlayers();
            break;

        case 'clear':
            dashboard.clearAll();
            break;

        case 'show':
            dashboard.displayDashboard();
            break;

        case 'update':
            await dashboard.updateAll();
            dashboard.displayDashboard();
            break;

        case 'creative':
            if (args.length < 2) {
                console.log('\nUsage: npm run dashboard creative "Player Name" [interactions]\n');
                process.exit(1);
            }
            const playerName = args.slice(1, args.length - 1).join(' ');
            const lastArg = args[args.length - 1];
            const interactions = !isNaN(parseInt(lastArg)) ? parseInt(lastArg) : 0;
            const creativePlayerName = !isNaN(parseInt(lastArg)) ? playerName : args.slice(1).join(' ');
            dashboard.logCreativeUsage(creativePlayerName, interactions);
            break;

        case 'analytics':
            if (args.length < 2) {
                console.log('\nUsage: npm run dashboard analytics "Player Name"\n');
                process.exit(1);
            }
            dashboard.updateAnalytics(args.slice(1).join(' '));
            break;

        case 'analytics-only':
            dashboard.displayAnalyticsOnly();
            break;

        default:
            console.log('\nUnknown command. Available commands:');
            console.log('  npm run dashboard                     - Update and show dashboard');
            console.log('  npm run dashboard add "Name"          - Add player to watchlist');
            console.log('  npm run dashboard remove "Name"       - Remove player from watchlist');
            console.log('  npm run dashboard list                - List all players');
            console.log('  npm run dashboard show                - Show cached dashboard (no update)');
            console.log('  npm run dashboard update              - Force update all players');
            console.log('  npm run dashboard clear               - Clear entire watchlist');
            console.log('  npm run dashboard creative "Name" [#] - Log creative usage (optional interactions)');
            console.log('  npm run dashboard analytics "Name"    - Update player analytics');
            console.log('  npm run dashboard analytics-only      - Show only analytics data\n');
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
}

module.exports = Dashboard;

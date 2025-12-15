const fs = require('fs');
const path = require('path');

class WatchlistManager {
    constructor() {
        // Use /tmp directory on Vercel (serverless), project directory locally
        const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
        const baseDir = isVercel ? '/tmp' : __dirname;
        this.watchlistFile = path.join(baseDir, 'watchlist.json');
        this.watchlist = this.loadWatchlist();
    }

    // Load watchlist from file
    loadWatchlist() {
        try {
            if (fs.existsSync(this.watchlistFile)) {
                const data = fs.readFileSync(this.watchlistFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading watchlist:', error.message);
        }
        return { players: [], lastUpdated: null };
    }

    // Save watchlist to file
    saveWatchlist() {
        try {
            this.watchlist.lastUpdated = new Date().toISOString();
            fs.writeFileSync(this.watchlistFile, JSON.stringify(this.watchlist, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving watchlist:', error.message);
            return false;
        }
    }

    // Add player to watchlist
    addPlayer(playerName, team = null, position = null) {
        // Check if player already exists
        const exists = this.watchlist.players.find(
            p => p.name.toLowerCase() === playerName.toLowerCase()
        );

        if (exists) {
            return { success: false, message: 'Player already on watchlist' };
        }

        const player = {
            name: playerName,
            team: team,
            position: position,
            addedAt: new Date().toISOString(),
            lastChecked: null,
            cachedData: null,
            analytics: {
                creativeUsageCount: 0,
                lastCreativeDate: null,
                postInteractions: 0
            }
        };

        this.watchlist.players.push(player);
        this.saveWatchlist();

        return { success: true, message: `Added ${playerName} to watchlist` };
    }

    // Remove player from watchlist
    removePlayer(playerName) {
        const initialLength = this.watchlist.players.length;
        this.watchlist.players = this.watchlist.players.filter(
            p => p.name.toLowerCase() !== playerName.toLowerCase()
        );

        if (this.watchlist.players.length === initialLength) {
            return { success: false, message: 'Player not found on watchlist' };
        }

        this.saveWatchlist();
        return { success: true, message: `Removed ${playerName} from watchlist` };
    }

    // Update player data
    updatePlayerData(playerName, data) {
        const player = this.watchlist.players.find(
            p => p.name.toLowerCase() === playerName.toLowerCase()
        );

        if (player) {
            player.cachedData = data;
            player.lastChecked = new Date().toISOString();
            this.saveWatchlist();
            return true;
        }

        return false;
    }

    // Get all players
    getPlayers() {
        return this.watchlist.players;
    }

    // Get player by name
    getPlayer(playerName) {
        return this.watchlist.players.find(
            p => p.name.toLowerCase() === playerName.toLowerCase()
        );
    }

    // Clear all players
    clearWatchlist() {
        this.watchlist.players = [];
        this.saveWatchlist();
        return { success: true, message: 'Watchlist cleared' };
    }

    // Get watchlist stats
    getStats() {
        const players = this.watchlist.players;
        // A player is injured if they have injury data AND their status is not "ACT" (Active/Healthy)
        const injured = players.filter(p => {
            const injury = p.cachedData?.injury;
            return injury && injury.found && injury.status && injury.status !== 'ACT';
        }).length;
        const healthy = players.length - injured;

        return {
            total: players.length,
            injured: injured,
            healthy: healthy,
            lastUpdated: this.watchlist.lastUpdated
        };
    }

    // Update player analytics
    updatePlayerAnalytics(playerName, analyticsData) {
        const player = this.watchlist.players.find(
            p => p.name.toLowerCase() === playerName.toLowerCase()
        );

        if (!player) {
            return { success: false, message: 'Player not found on watchlist' };
        }

        // Initialize analytics if it doesn't exist (for backwards compatibility)
        if (!player.analytics) {
            player.analytics = {
                creativeUsageCount: 0,
                lastCreativeDate: null,
                postInteractions: 0
            };
        }

        // Update analytics fields
        if (analyticsData.creativeUsageCount !== undefined) {
            player.analytics.creativeUsageCount = analyticsData.creativeUsageCount;
        }
        if (analyticsData.lastCreativeDate !== undefined) {
            player.analytics.lastCreativeDate = analyticsData.lastCreativeDate;
        }
        if (analyticsData.postInteractions !== undefined) {
            player.analytics.postInteractions = analyticsData.postInteractions;
        }

        this.saveWatchlist();
        return { success: true, message: `Updated analytics for ${playerName}` };
    }

    // Increment creative usage count
    incrementCreativeUsage(playerName, interactions = 0) {
        const player = this.watchlist.players.find(
            p => p.name.toLowerCase() === playerName.toLowerCase()
        );

        if (!player) {
            return { success: false, message: 'Player not found on watchlist' };
        }

        // Initialize analytics if it doesn't exist
        if (!player.analytics) {
            player.analytics = {
                creativeUsageCount: 0,
                lastCreativeDate: null,
                postInteractions: 0
            };
        }

        player.analytics.creativeUsageCount++;
        player.analytics.lastCreativeDate = new Date().toISOString();
        if (interactions > 0) {
            player.analytics.postInteractions = interactions;
        }

        this.saveWatchlist();
        return {
            success: true,
            message: `Recorded creative usage for ${playerName} (Total: ${player.analytics.creativeUsageCount})`
        };
    }

    // Get player analytics
    getPlayerAnalytics(playerName) {
        const player = this.watchlist.players.find(
            p => p.name.toLowerCase() === playerName.toLowerCase()
        );

        if (!player) {
            return null;
        }

        // Initialize analytics if it doesn't exist
        if (!player.analytics) {
            player.analytics = {
                creativeUsageCount: 0,
                lastCreativeDate: null,
                postInteractions: 0
            };
        }

        return player.analytics;
    }
}

module.exports = WatchlistManager;

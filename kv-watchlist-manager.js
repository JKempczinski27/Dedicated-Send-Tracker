const { kv } = require('@vercel/kv');

const WATCHLIST_KEY = 'nfl-tracker:watchlist';

class KVWatchlistManager {
    constructor() {
        // KV is serverless - no file operations needed
    }

    // Load watchlist from KV
    async loadWatchlist() {
        try {
            const data = await kv.get(WATCHLIST_KEY);
            if (data) {
                return data;
            }
        } catch (error) {
            console.error('Error loading watchlist from KV:', error.message);
        }
        return { players: [], lastUpdated: null };
    }

    // Save watchlist to KV
    async saveWatchlist(watchlist) {
        try {
            watchlist.lastUpdated = new Date().toISOString();
            await kv.set(WATCHLIST_KEY, watchlist);
            return true;
        } catch (error) {
            console.error('Error saving watchlist to KV:', error.message);
            return false;
        }
    }

    // Add player to watchlist
    async addPlayer(playerName, team = null, position = null) {
        const watchlist = await this.loadWatchlist();

        // Check if player already exists
        const exists = watchlist.players.find(
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
            cachedData: null
        };

        watchlist.players.push(player);
        await this.saveWatchlist(watchlist);

        return { success: true, message: `Added ${playerName} to watchlist` };
    }

    // Remove player from watchlist
    async removePlayer(playerName) {
        const watchlist = await this.loadWatchlist();
        const initialLength = watchlist.players.length;

        watchlist.players = watchlist.players.filter(
            p => p.name.toLowerCase() !== playerName.toLowerCase()
        );

        if (watchlist.players.length === initialLength) {
            return { success: false, message: 'Player not found on watchlist' };
        }

        await this.saveWatchlist(watchlist);
        return { success: true, message: `Removed ${playerName} from watchlist` };
    }

    // Update player data
    async updatePlayerData(playerName, data) {
        const watchlist = await this.loadWatchlist();
        const player = watchlist.players.find(
            p => p.name.toLowerCase() === playerName.toLowerCase()
        );

        if (player) {
            player.cachedData = data;
            player.lastChecked = new Date().toISOString();
            await this.saveWatchlist(watchlist);
            return true;
        }

        return false;
    }

    // Get all players
    async getPlayers() {
        const watchlist = await this.loadWatchlist();
        return watchlist.players;
    }

    // Get player by name
    async getPlayer(playerName) {
        const watchlist = await this.loadWatchlist();
        return watchlist.players.find(
            p => p.name.toLowerCase() === playerName.toLowerCase()
        );
    }

    // Clear all players
    async clearWatchlist() {
        const watchlist = { players: [], lastUpdated: new Date().toISOString() };
        await this.saveWatchlist(watchlist);
        return { success: true, message: 'Watchlist cleared' };
    }

    // Get watchlist stats
    async getStats() {
        const watchlist = await this.loadWatchlist();
        const players = watchlist.players;
        const injured = players.filter(p => p.cachedData?.injury).length;
        const healthy = players.length - injured;

        return {
            total: players.length,
            injured: injured,
            healthy: healthy,
            lastUpdated: watchlist.lastUpdated
        };
    }
}

module.exports = KVWatchlistManager;

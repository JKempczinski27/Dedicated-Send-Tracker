const { Pool } = require('pg');

class PostgresWatchlistManager {
    constructor() {
        // Works with any PostgreSQL database via connection string
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        this.initDatabase();
    }

    // Initialize database table if it doesn't exist
    async initDatabase() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS watchlist_players (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                team VARCHAR(100),
                position VARCHAR(50),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_checked TIMESTAMP,
                cached_data JSONB
            );

            CREATE INDEX IF NOT EXISTS idx_player_name ON watchlist_players(name);
        `;

        try {
            await this.pool.query(createTableQuery);
        } catch (error) {
            console.error('Error initializing database:', error.message);
        }
    }

    // Add player to watchlist
    async addPlayer(playerName, team = null, position = null) {
        try {
            const query = `
                INSERT INTO watchlist_players (name, team, position, added_at)
                VALUES ($1, $2, $3, NOW())
                RETURNING *
            `;

            await this.pool.query(query, [playerName, team, position]);
            return { success: true, message: `Added ${playerName} to watchlist` };
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                return { success: false, message: 'Player already on watchlist' };
            }
            console.error('Error adding player:', error);
            return { success: false, message: 'Error adding player to database' };
        }
    }

    // Remove player from watchlist
    async removePlayer(playerName) {
        try {
            const query = 'DELETE FROM watchlist_players WHERE name = $1 RETURNING *';
            const result = await this.pool.query(query, [playerName]);

            if (result.rowCount === 0) {
                return { success: false, message: 'Player not found on watchlist' };
            }

            return { success: true, message: `Removed ${playerName} from watchlist` };
        } catch (error) {
            console.error('Error removing player:', error);
            return { success: false, message: 'Error removing player from database' };
        }
    }

    // Update player data
    async updatePlayerData(playerName, data) {
        try {
            const query = `
                UPDATE watchlist_players
                SET cached_data = $1, last_checked = NOW()
                WHERE name = $2
                RETURNING *
            `;

            const result = await this.pool.query(query, [JSON.stringify(data), playerName]);
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error updating player data:', error);
            return false;
        }
    }

    // Get all players
    async getPlayers() {
        try {
            const query = 'SELECT * FROM watchlist_players ORDER BY added_at DESC';
            const result = await this.pool.query(query);

            return result.rows.map(row => ({
                name: row.name,
                team: row.team,
                position: row.position,
                addedAt: row.added_at.toISOString(),
                lastChecked: row.last_checked ? row.last_checked.toISOString() : null,
                cachedData: row.cached_data
            }));
        } catch (error) {
            console.error('Error getting players:', error);
            return [];
        }
    }

    // Get player by name
    async getPlayer(playerName) {
        try {
            const query = 'SELECT * FROM watchlist_players WHERE name = $1';
            const result = await this.pool.query(query, [playerName]);

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];
            return {
                name: row.name,
                team: row.team,
                position: row.position,
                addedAt: row.added_at.toISOString(),
                lastChecked: row.last_checked ? row.last_checked.toISOString() : null,
                cachedData: row.cached_data
            };
        } catch (error) {
            console.error('Error getting player:', error);
            return null;
        }
    }

    // Clear all players
    async clearWatchlist() {
        try {
            await this.pool.query('DELETE FROM watchlist_players');
            return { success: true, message: 'Watchlist cleared' };
        } catch (error) {
            console.error('Error clearing watchlist:', error);
            return { success: false, message: 'Error clearing watchlist' };
        }
    }

    // Get watchlist stats
    async getStats() {
        try {
            const query = `
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN cached_data->>'injury' IS NOT NULL THEN 1 END) as injured,
                    MAX(last_checked) as last_updated
                FROM watchlist_players
            `;

            const result = await this.pool.query(query);
            const row = result.rows[0];

            return {
                total: parseInt(row.total),
                injured: parseInt(row.injured),
                healthy: parseInt(row.total) - parseInt(row.injured),
                lastUpdated: row.last_updated ? row.last_updated.toISOString() : null
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                total: 0,
                injured: 0,
                healthy: 0,
                lastUpdated: null
            };
        }
    }

    // Close connection pool (for cleanup)
    async close() {
        await this.pool.end();
    }
}

module.exports = PostgresWatchlistManager;

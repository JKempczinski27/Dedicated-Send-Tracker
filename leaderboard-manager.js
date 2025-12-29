const { Pool } = require('pg');

/**
 * LeaderboardManager - Manages league-wide player sentiment tracking
 *
 * Database Schema:
 * - all_players: Stores ALL NFL players with their basic info
 * - sentiment_scores: Stores sentiment analysis results for each player
 */
class LeaderboardManager {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        this.initDatabase();
    }

    // Initialize database tables
    async initDatabase() {
        const createTablesQuery = `
            -- Table for ALL NFL players (roster sync)
            CREATE TABLE IF NOT EXISTS all_players (
                id SERIAL PRIMARY KEY,
                nfl_id VARCHAR(100) UNIQUE,
                name VARCHAR(255) NOT NULL,
                team VARCHAR(100),
                position VARCHAR(50),
                status VARCHAR(50),
                is_starter BOOLEAN DEFAULT false,
                priority_tier INTEGER DEFAULT 3,
                last_sentiment_update TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Table for sentiment scores
            CREATE TABLE IF NOT EXISTS sentiment_scores (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES all_players(id) ON DELETE CASCADE,
                sentiment_score DECIMAL(5,2),
                article_count INTEGER DEFAULT 0,
                positive_count INTEGER DEFAULT 0,
                neutral_count INTEGER DEFAULT 0,
                negative_count INTEGER DEFAULT 0,
                has_breaking_news BOOLEAN DEFAULT false,
                news_data JSONB,
                analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_id)
            );

            -- Table for processing queue
            CREATE TABLE IF NOT EXISTS sentiment_queue (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES all_players(id) ON DELETE CASCADE,
                priority INTEGER DEFAULT 3,
                status VARCHAR(50) DEFAULT 'pending',
                retry_count INTEGER DEFAULT 0,
                last_attempt TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(player_id)
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_all_players_name ON all_players(name);
            CREATE INDEX IF NOT EXISTS idx_all_players_team ON all_players(team);
            CREATE INDEX IF NOT EXISTS idx_all_players_position ON all_players(position);
            CREATE INDEX IF NOT EXISTS idx_all_players_priority ON all_players(priority_tier);
            CREATE INDEX IF NOT EXISTS idx_sentiment_scores_score ON sentiment_scores(sentiment_score DESC);
            CREATE INDEX IF NOT EXISTS idx_sentiment_scores_player ON sentiment_scores(player_id);
            CREATE INDEX IF NOT EXISTS idx_queue_priority ON sentiment_queue(priority, status, created_at);
        `;

        try {
            await this.pool.query(createTablesQuery);
            console.log('✅ Leaderboard database tables initialized');
        } catch (error) {
            console.error('❌ Error initializing leaderboard database:', error.message);
        }
    }

    // ============================================================
    // ROSTER SYNC METHODS
    // ============================================================

    /**
     * Bulk insert or update players from NFL roster API
     * @param {Array} players - Array of player objects from NFL API
     */
    async syncPlayers(players) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            let inserted = 0;
            let updated = 0;

            for (const player of players) {
                const query = `
                    INSERT INTO all_players (nfl_id, name, team, position, status, is_starter, priority_tier, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    ON CONFLICT (nfl_id)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        team = EXCLUDED.team,
                        position = EXCLUDED.position,
                        status = EXCLUDED.status,
                        is_starter = EXCLUDED.is_starter,
                        priority_tier = EXCLUDED.priority_tier,
                        updated_at = NOW()
                    RETURNING (xmax = 0) AS is_insert
                `;

                const result = await client.query(query, [
                    player.nfl_id,
                    player.name,
                    player.team,
                    player.position,
                    player.status || 'ACT',
                    player.is_starter || false,
                    this.calculatePriorityTier(player),
                ]);

                if (result.rows[0].is_insert) {
                    inserted++;
                } else {
                    updated++;
                }
            }

            await client.query('COMMIT');
            return { success: true, inserted, updated, total: players.length };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error syncing players:', error);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    /**
     * Calculate priority tier based on position and status
     * Tier 1 (Highest): QB, WR1, RB1, Star players
     * Tier 2 (Medium): Other starters, notable backups
     * Tier 3 (Low): Bench players, practice squad
     */
    calculatePriorityTier(player) {
        const highPriorityPositions = ['QB', 'RB', 'WR', 'TE'];

        // Tier 1: Starters in high-value positions
        if (player.is_starter && highPriorityPositions.includes(player.position)) {
            return 1;
        }

        // Tier 2: All other starters or high-value positions
        if (player.is_starter || highPriorityPositions.includes(player.position)) {
            return 2;
        }

        // Tier 3: Everyone else
        return 3;
    }

    // ============================================================
    // QUEUE MANAGEMENT
    // ============================================================

    /**
     * Get next batch of players to process based on smart priority
     * Priority factors:
     * 1. Priority tier (1-3)
     * 2. Players with breaking news detected
     * 3. Staleness (haven't been updated in X days)
     * 4. Never analyzed before
     */
    async getNextBatch(batchSize = 20) {
        const query = `
            WITH player_priorities AS (
                SELECT
                    p.id,
                    p.name,
                    p.team,
                    p.position,
                    p.priority_tier,
                    s.sentiment_score,
                    s.has_breaking_news,
                    s.analyzed_at,
                    CASE
                        -- Never analyzed: highest priority
                        WHEN s.analyzed_at IS NULL THEN 1000
                        -- Breaking news: very high priority
                        WHEN s.has_breaking_news = true THEN 900
                        -- Priority tier 1 players
                        WHEN p.priority_tier = 1 THEN 800 - EXTRACT(EPOCH FROM (NOW() - s.analyzed_at)) / 3600
                        -- Priority tier 2 players
                        WHEN p.priority_tier = 2 THEN 500 - EXTRACT(EPOCH FROM (NOW() - s.analyzed_at)) / 3600
                        -- Priority tier 3 players
                        ELSE 200 - EXTRACT(EPOCH FROM (NOW() - s.analyzed_at)) / 3600
                    END as calculated_priority
                FROM all_players p
                LEFT JOIN sentiment_scores s ON p.id = s.player_id
                LEFT JOIN sentiment_queue q ON p.id = q.player_id AND q.status = 'processing'
                WHERE
                    p.status IN ('ACT', 'RES', 'PRA')
                    AND q.id IS NULL
                    AND (s.analyzed_at IS NULL OR s.analyzed_at < NOW() - INTERVAL '6 hours')
            )
            SELECT id, name, team, position, priority_tier, sentiment_score, analyzed_at
            FROM player_priorities
            ORDER BY calculated_priority DESC
            LIMIT $1
        `;

        try {
            const result = await this.pool.query(query, [batchSize]);
            return result.rows;
        } catch (error) {
            console.error('Error getting next batch:', error);
            return [];
        }
    }

    /**
     * Add players to processing queue
     */
    async addToQueue(playerIds, priority = 3) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            for (const playerId of playerIds) {
                await client.query(`
                    INSERT INTO sentiment_queue (player_id, priority, status)
                    VALUES ($1, $2, 'pending')
                    ON CONFLICT (player_id)
                    DO UPDATE SET
                        priority = EXCLUDED.priority,
                        status = 'pending',
                        created_at = NOW()
                `, [playerId, priority]);
            }

            await client.query('COMMIT');
            return { success: true, count: playerIds.length };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error adding to queue:', error);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    /**
     * Mark queue items as processing
     */
    async markAsProcessing(playerIds) {
        try {
            const query = `
                UPDATE sentiment_queue
                SET status = 'processing', last_attempt = NOW()
                WHERE player_id = ANY($1)
            `;
            await this.pool.query(query, [playerIds]);
            return { success: true };
        } catch (error) {
            console.error('Error marking as processing:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove from queue after successful processing
     */
    async removeFromQueue(playerIds) {
        try {
            const query = `DELETE FROM sentiment_queue WHERE player_id = ANY($1)`;
            await this.pool.query(query, [playerIds]);
            return { success: true };
        } catch (error) {
            console.error('Error removing from queue:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // SENTIMENT TRACKING
    // ============================================================

    /**
     * Update sentiment score for a player
     */
    async updateSentiment(playerId, sentimentData) {
        try {
            const query = `
                INSERT INTO sentiment_scores
                    (player_id, sentiment_score, article_count, positive_count, neutral_count,
                     negative_count, has_breaking_news, news_data, analyzed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (player_id)
                DO UPDATE SET
                    sentiment_score = EXCLUDED.sentiment_score,
                    article_count = EXCLUDED.article_count,
                    positive_count = EXCLUDED.positive_count,
                    neutral_count = EXCLUDED.neutral_count,
                    negative_count = EXCLUDED.negative_count,
                    has_breaking_news = EXCLUDED.has_breaking_news,
                    news_data = EXCLUDED.news_data,
                    analyzed_at = NOW()
                RETURNING *
            `;

            const result = await this.pool.query(query, [
                playerId,
                sentimentData.overallScore || 0,
                sentimentData.articleCount || 0,
                sentimentData.positiveCount || 0,
                sentimentData.neutralCount || 0,
                sentimentData.negativeCount || 0,
                sentimentData.hasBreakingNews || false,
                JSON.stringify(sentimentData.rawData || {})
            ]);

            // Update last_sentiment_update timestamp on player
            await this.pool.query(
                'UPDATE all_players SET last_sentiment_update = NOW() WHERE id = $1',
                [playerId]
            );

            return { success: true, data: result.rows[0] };
        } catch (error) {
            console.error('Error updating sentiment:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================
    // LEADERBOARD QUERIES
    // ============================================================

    /**
     * Get top/bottom players by sentiment
     */
    async getLeaderboard(limit = 5) {
        const query = `
            SELECT
                p.id,
                p.name,
                p.team,
                p.position,
                s.sentiment_score,
                s.article_count,
                s.positive_count,
                s.neutral_count,
                s.negative_count,
                s.has_breaking_news,
                s.analyzed_at
            FROM all_players p
            INNER JOIN sentiment_scores s ON p.id = s.player_id
            WHERE s.article_count > 0
            ORDER BY s.sentiment_score DESC
        `;

        try {
            const result = await this.pool.query(query);
            const allPlayers = result.rows;

            return {
                topPositive: allPlayers.slice(0, limit),
                topNegative: allPlayers.slice(-limit).reverse(),
                totalTracked: allPlayers.length,
                lastUpdated: allPlayers[0]?.analyzed_at || null
            };
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return {
                topPositive: [],
                topNegative: [],
                totalTracked: 0,
                lastUpdated: null
            };
        }
    }

    /**
     * Get stats for dashboard
     */
    async getStats() {
        try {
            const statsQuery = `
                SELECT
                    COUNT(DISTINCT p.id) as total_players,
                    COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN p.id END) as tracked_players,
                    COUNT(DISTINCT CASE WHEN s.sentiment_score > 0 THEN p.id END) as positive_players,
                    COUNT(DISTINCT CASE WHEN s.sentiment_score < 0 THEN p.id END) as negative_players,
                    AVG(s.sentiment_score) as avg_sentiment,
                    MAX(s.analyzed_at) as last_update
                FROM all_players p
                LEFT JOIN sentiment_scores s ON p.id = s.player_id
                WHERE p.status IN ('ACT', 'RES', 'PRA')
            `;

            const result = await this.pool.query(statsQuery);
            const stats = result.rows[0];

            return {
                totalPlayers: parseInt(stats.total_players) || 0,
                trackedPlayers: parseInt(stats.tracked_players) || 0,
                positiveCount: parseInt(stats.positive_players) || 0,
                negativeCount: parseInt(stats.negative_players) || 0,
                avgSentiment: parseFloat(stats.avg_sentiment) || 0,
                lastUpdate: stats.last_update
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                totalPlayers: 0,
                trackedPlayers: 0,
                positiveCount: 0,
                negativeCount: 0,
                avgSentiment: 0,
                lastUpdate: null
            };
        }
    }

    /**
     * Get player by ID or name
     */
    async getPlayer(identifier) {
        try {
            const query = `
                SELECT p.*, s.*
                FROM all_players p
                LEFT JOIN sentiment_scores s ON p.id = s.player_id
                WHERE p.id = $1 OR p.name ILIKE $2
                LIMIT 1
            `;

            const result = await this.pool.query(query, [
                isNaN(identifier) ? -1 : identifier,
                `%${identifier}%`
            ]);

            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting player:', error);
            return null;
        }
    }

    // Close connection pool
    async close() {
        await this.pool.end();
    }
}

module.exports = LeaderboardManager;

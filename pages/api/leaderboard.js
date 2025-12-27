const LeaderboardManager = require('../../leaderboard-manager');

/**
 * API Route: /api/leaderboard
 *
 * Returns the league-wide sentiment leaderboard
 * - Top 5 players with best sentiment
 * - Top 5 players with worst sentiment
 * - Overall stats
 *
 * Method: GET
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const leaderboard = new LeaderboardManager();

    // Get top/bottom players
    const limit = parseInt(req.query.limit) || 5;
    const data = await leaderboard.getLeaderboard(limit);

    // Get overall stats
    const stats = await leaderboard.getStats();

    await leaderboard.close();

    return res.status(200).json({
      success: true,
      leaderboard: {
        topPositive: data.topPositive,
        topNegative: data.topNegative,
        totalTracked: data.totalTracked
      },
      stats: {
        totalPlayers: stats.totalPlayers,
        trackedPlayers: stats.trackedPlayers,
        positiveCount: stats.positiveCount,
        negativeCount: stats.negativeCount,
        avgSentiment: stats.avgSentiment.toFixed(2),
        lastUpdate: stats.lastUpdate
      },
      lastUpdated: data.lastUpdated
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

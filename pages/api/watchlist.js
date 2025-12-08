const PostgresWatchlistManager = require('../../postgres-watchlist-manager');
const { verifyAuthFromRequest } = require('../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const authPayload = verifyAuthFromRequest(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const watchlist = new PostgresWatchlistManager();
    const players = await watchlist.getPlayers();
    const stats = await watchlist.getStats();

    res.status(200).json({
      players,
      stats,
      lastUpdated: stats.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

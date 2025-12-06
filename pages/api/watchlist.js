const WatchlistManager = require('../../watchlist-manager');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const watchlist = new WatchlistManager();
    const players = watchlist.getPlayers();
    const stats = watchlist.getStats();

    res.status(200).json({
      players,
      stats,
      lastUpdated: watchlist.watchlist.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

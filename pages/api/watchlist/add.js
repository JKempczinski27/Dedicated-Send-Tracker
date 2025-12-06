const KVWatchlistManager = require('../../../kv-watchlist-manager');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerName } = req.body;

    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const watchlist = new KVWatchlistManager();
    const result = await watchlist.addPlayer(playerName.trim());

    if (result.success) {
      const players = await watchlist.getPlayers();
      res.status(200).json({ message: result.message, players });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error('Error adding player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

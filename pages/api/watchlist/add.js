const PostgresWatchlistManager = require('../../../postgres-watchlist-manager');
const { verifyAuthFromRequest } = require('../../../lib/auth');

// Increase timeout for Vercel serverless function
export const config = {
  maxDuration: 60, // 60 seconds to allow for API calls
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const authPayload = verifyAuthFromRequest(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { playerName, deploymentDate } = req.body;

    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const watchlist = new PostgresWatchlistManager();
    const result = await watchlist.addPlayer(playerName.trim(), null, null, deploymentDate || null);

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

const PostgresWatchlistManager = require('../../../postgres-watchlist-manager');
const { verifyAuthFromRequest } = require('../../../lib/auth');

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
    const success = await watchlist.updateDeploymentDate(playerName.trim(), deploymentDate || null);

    if (success) {
      const players = await watchlist.getPlayers();
      res.status(200).json({ message: 'Deployment date updated', players });
    } else {
      res.status(400).json({ error: 'Failed to update deployment date' });
    }
  } catch (error) {
    console.error('Error updating deployment date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

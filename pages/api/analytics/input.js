const PostgresWatchlistManager = require('../../../postgres-watchlist-manager');

// Increase timeout for Vercel serverless function
export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerName, deploymentUsage, moduleViews } = req.body;

    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ message: 'Player name is required' });
    }

    const watchlist = new PostgresWatchlistManager();

    // Check if player exists
    const player = await watchlist.getPlayer(playerName.trim());
    if (!player) {
      return res.status(404).json({ message: `Player "${playerName}" not found in watchlist. Please add them first.` });
    }

    // Update analytics data
    const result = await watchlist.updateAnalytics(
      playerName.trim(),
      deploymentUsage,
      moduleViews
    );

    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error('Error updating analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

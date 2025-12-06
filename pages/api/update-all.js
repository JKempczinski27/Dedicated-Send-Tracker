const KVWatchlistManager = require('../../kv-watchlist-manager');
const EnhancedTracker = require('../../enhanced-tracker');

// Increase timeout for Vercel serverless function
export const config = {
  maxDuration: 60, // 60 seconds
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const watchlist = new KVWatchlistManager();
    const players = await watchlist.getPlayers();

    if (players.length === 0) {
      return res.status(200).json({
        message: 'Watchlist is empty',
        players: []
      });
    }

    const tracker = new EnhancedTracker();
    const updatedPlayers = [];

    // Update players sequentially to avoid rate limiting
    for (const player of players) {
      try {
        console.log(`Tracking ${player.name}...`);
        const data = await tracker.trackPlayer(player.name);
        await watchlist.updatePlayerData(player.name, data);
        updatedPlayers.push(player.name);

        // Add delay to avoid rate limiting (except for last player)
        if (updatedPlayers.length < players.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Error tracking ${player.name}:`, error.message);
        // Continue with next player even if one fails
      }
    }

    const updatedPlayersList = await watchlist.getPlayers();
    res.status(200).json({
      message: `Updated ${updatedPlayers.length} of ${players.length} players`,
      players: updatedPlayersList,
      updatedPlayers
    });
  } catch (error) {
    console.error('Error updating players:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

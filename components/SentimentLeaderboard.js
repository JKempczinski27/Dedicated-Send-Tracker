import { useState, useEffect } from 'react';

/**
 * SentimentLeaderboard Component
 *
 * Displays league-wide sentiment analysis:
 * - Top 5 players with best sentiment (green bars)
 * - Top 5 players with worst sentiment (red bars)
 * - Overall league statistics
 *
 * Auto-refreshes every 5 minutes
 */
export default function SentimentLeaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    fetchLeaderboard();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchLeaderboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/leaderboard');
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch leaderboard');
      }

      setData(json);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="leaderboard-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading league-wide sentiment data...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="error-state">
          <h3>Error Loading Leaderboard</h3>
          <p>{error}</p>
          <button onClick={fetchLeaderboard} className="retry-btn">
            Retry
          </button>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!data || !data.leaderboard) {
    return (
      <div className="leaderboard-container">
        <div className="empty-state">
          <h3>No Data Available</h3>
          <p>Sentiment data is being collected. Check back soon!</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  const { leaderboard, stats } = data;

  return (
    <div className="leaderboard-container">
      {/* Header */}
      <div className="leaderboard-header">
        <div>
          <h2>League-Wide Sentiment Leaderboard</h2>
          <p className="subtitle">
            Tracking sentiment for {stats.trackedPlayers} of {stats.totalPlayers} NFL players
          </p>
        </div>
        <button onClick={fetchLeaderboard} className="refresh-btn" disabled={loading}>
          {loading ? '↻ Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.trackedPlayers}</h3>
            <p>Players Tracked</p>
          </div>
        </div>
        <div className="stat-card positive">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{stats.positiveCount}</h3>
            <p>Positive Sentiment</p>
          </div>
        </div>
        <div className="stat-card negative">
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <h3>{stats.negativeCount}</h3>
            <p>Negative Sentiment</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{stats.avgSentiment}</h3>
            <p>Average Score</p>
          </div>
        </div>
      </div>

      {/* Leaderboard Grid */}
      <div className="leaderboard-grid">
        {/* Top 5 Best Sentiment */}
        <div className="leaderboard-section positive-section">
          <h3 className="section-title">
            <span className="icon">📈</span>
            Top 5 Best Sentiment
          </h3>
          <div className="players-list">
            {leaderboard.topPositive.map((player, index) => (
              <PlayerBar
                key={player.id}
                player={player}
                rank={index + 1}
                type="positive"
                maxScore={leaderboard.topPositive[0]?.sentiment_score || 10}
              />
            ))}
            {leaderboard.topPositive.length === 0 && (
              <p className="no-data">No data available yet</p>
            )}
          </div>
        </div>

        {/* Top 5 Worst Sentiment */}
        <div className="leaderboard-section negative-section">
          <h3 className="section-title">
            <span className="icon">📉</span>
            Top 5 Worst Sentiment
          </h3>
          <div className="players-list">
            {leaderboard.topNegative.map((player, index) => (
              <PlayerBar
                key={player.id}
                player={player}
                rank={index + 1}
                type="negative"
                maxScore={Math.abs(leaderboard.topNegative[0]?.sentiment_score || -10)}
              />
            ))}
            {leaderboard.topNegative.length === 0 && (
              <p className="no-data">No data available yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="leaderboard-footer">
        <p>
          Last updated: {data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleString()
            : 'Never'}
        </p>
        {lastRefresh && (
          <p className="refresh-time">
            Refreshed: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

/**
 * Individual Player Bar Component
 */
function PlayerBar({ player, rank, type, maxScore }) {
  const score = parseFloat(player.sentiment_score) || 0;
  const absScore = Math.abs(score);
  const percentage = maxScore > 0 ? (absScore / maxScore) * 100 : 0;

  return (
    <div className="player-bar">
      <div className="player-info">
        <span className="rank">#{rank}</span>
        <div className="player-details">
          <div className="player-name">{player.name}</div>
          <div className="player-meta">
            {player.team} • {player.position} • {player.article_count} articles
          </div>
        </div>
      </div>
      <div className="bar-container">
        <div
          className={`bar ${type}`}
          style={{ width: `${percentage}%` }}
        >
          <span className="score-label">{score.toFixed(1)}</span>
        </div>
      </div>
      <style jsx>{`
        .player-bar {
          margin-bottom: 16px;
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .player-bar:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .player-info {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .rank {
          font-size: 1.2em;
          font-weight: bold;
          color: #6b7280;
          min-width: 35px;
        }

        .player-details {
          flex: 1;
        }

        .player-name {
          font-weight: 600;
          color: #0a2463;
          font-size: 1em;
        }

        .player-meta {
          font-size: 0.85em;
          color: #6b7280;
          margin-top: 2px;
        }

        .bar-container {
          position: relative;
          width: 100%;
          height: 32px;
          background: #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }

        .bar {
          height: 100%;
          transition: width 0.8s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 12px;
          border-radius: 6px;
        }

        .bar.positive {
          background: linear-gradient(90deg, #10b981, #059669);
        }

        .bar.negative {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .score-label {
          color: white;
          font-weight: bold;
          font-size: 0.95em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

// Main styles
const styles = `
  .leaderboard-container {
    background: white;
    border-radius: 0 0 15px 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    padding: 30px;
    min-height: 600px;
  }

  .leaderboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e5e7eb;
  }

  .leaderboard-header h2 {
    color: #0a2463;
    margin: 0 0 8px 0;
    font-size: 2em;
  }

  .subtitle {
    color: #6b7280;
    margin: 0;
    font-size: 0.95em;
  }

  .refresh-btn {
    padding: 10px 20px;
    background: #0a2463;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 0.95em;
  }

  .refresh-btn:hover:not(:disabled) {
    background: #1e40af;
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
  }

  .stat-card {
    background: #f9fafb;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    border-left: 4px solid #0a2463;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stat-card.positive {
    border-left-color: #10b981;
  }

  .stat-card.negative {
    border-left-color: #ef4444;
  }

  .stat-icon {
    font-size: 2.5em;
  }

  .stat-content h3 {
    margin: 0;
    color: #0a2463;
    font-size: 2em;
  }

  .stat-content p {
    margin: 4px 0 0 0;
    color: #6b7280;
    font-size: 0.9em;
  }

  .leaderboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    margin-bottom: 30px;
  }

  .leaderboard-section {
    background: #f9fafb;
    border-radius: 12px;
    padding: 24px;
  }

  .positive-section {
    border-top: 4px solid #10b981;
  }

  .negative-section {
    border-top: 4px solid #ef4444;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #0a2463;
    margin: 0 0 20px 0;
    font-size: 1.3em;
  }

  .section-title .icon {
    font-size: 1.2em;
  }

  .players-list {
    /* Player bars will be rendered here */
  }

  .no-data {
    text-align: center;
    color: #6b7280;
    padding: 40px;
    font-style: italic;
  }

  .leaderboard-footer {
    text-align: center;
    padding-top: 20px;
    border-top: 2px solid #e5e7eb;
    color: #6b7280;
    font-size: 0.9em;
  }

  .refresh-time {
    margin-top: 5px;
    font-size: 0.85em;
  }

  .loading-state,
  .error-state,
  .empty-state {
    text-align: center;
    padding: 80px 20px;
  }

  .loading-state p,
  .error-state p,
  .empty-state p {
    color: #6b7280;
    margin: 20px 0;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #e5e7eb;
    border-top-color: #0a2463;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state h3,
  .empty-state h3 {
    color: #0a2463;
    margin-bottom: 10px;
  }

  .retry-btn {
    padding: 10px 24px;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 15px;
    transition: background 0.2s;
  }

  .retry-btn:hover {
    background: #b91c1c;
  }

  @media (max-width: 1024px) {
    .leaderboard-grid {
      grid-template-columns: 1fr;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .leaderboard-container {
      padding: 20px;
    }

    .leaderboard-header {
      flex-direction: column;
      gap: 15px;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .leaderboard-header h2 {
      font-size: 1.5em;
    }
  }
`;

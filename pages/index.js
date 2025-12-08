import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Home() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [username, setUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/verify');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUsername(data.username);
      fetchWatchlist();
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/watchlist');
      const data = await res.json();
      setWatchlist(data.players || []);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAllPlayers = async () => {
    try {
      setUpdating(true);
      const res = await fetch('/api/update-all', { method: 'POST' });
      const data = await res.json();
      setWatchlist(data.players || []);
    } catch (error) {
      console.error('Error updating players:', error);
      alert('Error updating players');
    } finally {
      setUpdating(false);
    }
  };

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    try {
      setAddingPlayer(true);
      const res = await fetch('/api/watchlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: newPlayerName })
      });

      if (res.ok) {
        setNewPlayerName('');
        await fetchWatchlist();
      } else {
        const error = await res.json();
        alert(error.message || 'Error adding player');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      alert('Error adding player');
    } finally {
      setAddingPlayer(false);
    }
  };

  const removePlayer = async (playerName) => {
    if (!confirm(`Remove ${playerName} from watchlist?`)) return;

    try {
      const res = await fetch('/api/watchlist/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName })
      });

      if (res.ok) {
        await fetchWatchlist();
      } else {
        alert('Error removing player');
      }
    } catch (error) {
      console.error('Error removing player:', error);
      alert('Error removing player');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  const stats = {
    total: watchlist.length,
    injured: watchlist.filter(p => p.cachedData?.injury).length,
    healthy: watchlist.filter(p => !p.cachedData?.injury).length
  };

  return (
    <>
      <Head>
        <title>NFL Player Tracking Dashboard</title>
        <meta name="description" content="Track NFL player injuries and media coverage" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div>
              <h1>🏈 NFL Player Tracking Dashboard</h1>
              <p className="subtitle">Monitor injury status, news sentiment, and social media mentions</p>
            </div>
            <div className="user-section">
              <span className="username">👤 {username}</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats">
            <div className="stat-card">
              <h3>{stats.total}</h3>
              <p>Total Players</p>
            </div>
            <div className="stat-card">
              <h3>{stats.injured}</h3>
              <p>Currently Injured</p>
            </div>
            <div className="stat-card">
              <h3>{stats.healthy}</h3>
              <p>Healthy</p>
            </div>
          </div>

          {/* Add Player Form */}
          <form onSubmit={addPlayer} className="add-form">
            <input
              type="text"
              placeholder="Enter player name (e.g., Patrick Mahomes)"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              disabled={addingPlayer}
            />
            <button type="submit" disabled={addingPlayer || !newPlayerName.trim()}>
              {addingPlayer ? 'Adding...' : 'Add Player'}
            </button>
            <button
              type="button"
              onClick={updateAllPlayers}
              disabled={updating || watchlist.length === 0}
              className="update-btn"
            >
              {updating ? 'Updating...' : 'Update All'}
            </button>
          </form>
        </div>

        {/* Player Cards */}
        {loading ? (
          <div className="loading">Loading watchlist...</div>
        ) : watchlist.length === 0 ? (
          <div className="empty-state">
            <h2>Your watchlist is empty</h2>
            <p>Add players above to start tracking their injury status and media coverage.</p>
          </div>
        ) : (
          <div className="grid">
            {watchlist.map((player) => (
              <PlayerCard
                key={player.name}
                player={player}
                onRemove={removePlayer}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          background: white;
          border-radius: 15px;
          padding: 30px;
          margin-bottom: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-top: 4px solid #0a2463;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .username {
          color: #0a2463;
          font-weight: 600;
          font-size: 14px;
        }

        .logout-btn {
          padding: 8px 16px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .logout-btn:hover {
          background: #b91c1c;
        }

        h1 {
          color: #0a2463;
          margin-bottom: 10px;
          font-size: 2.5em;
        }

        .subtitle {
          color: #6b7280;
          margin-top: 10px;
        }

        .stats {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }

        .stat-card {
          background: #0a2463;
          color: white;
          padding: 20px;
          border-radius: 10px;
          flex: 1;
          text-align: center;
          box-shadow: 0 2px 10px rgba(10,36,99,0.15);
        }

        .stat-card h3 {
          font-size: 2em;
          margin-bottom: 5px;
        }

        .stat-card p {
          opacity: 0.9;
          font-size: 0.9em;
        }

        .add-form {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        .add-form input {
          flex: 1;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1em;
        }

        .add-form input:focus {
          outline: none;
          border-color: #0a2463;
        }

        .add-form button {
          padding: 12px 24px;
          background: #0a2463;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }

        .add-form button:hover:not(:disabled) {
          background: #1e40af;
        }

        .add-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .update-btn {
          background: #dc2626 !important;
        }

        .update-btn:hover:not(:disabled) {
          background: #b91c1c !important;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
          gap: 20px;
        }

        .loading, .empty-state {
          background: white;
          border-radius: 15px;
          padding: 60px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-top: 4px solid #0a2463;
        }

        .empty-state h2 {
          color: #0a2463;
          margin-bottom: 10px;
        }

        .empty-state p {
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .header-top {
            flex-direction: column;
            gap: 15px;
          }

          .user-section {
            align-self: flex-end;
          }

          .stats {
            flex-direction: column;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .add-form {
            flex-direction: column;
          }

          h1 {
            font-size: 1.8em;
          }
        }
      `}</style>
    </>
  );
}

function PlayerCard({ player, onRemove }) {
  const data = player.cachedData;
  const hasData = data && player.lastChecked;
  const isInjured = hasData && data.injury;

  if (!hasData) {
    return (
      <div className="player-card">
        <div className="player-header">
          <div className="player-name">{player.name}</div>
          <button onClick={() => onRemove(player.name)} className="remove-btn">Remove</button>
        </div>
        <div className="no-data">⚠️ No data available - click "Update All" to fetch data</div>

        <style jsx>{`
          .player-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border-left: 4px solid #0a2463;
          }

          .player-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
          }

          .player-name {
            font-size: 1.5em;
            font-weight: bold;
            color: #0a2463;
          }

          .remove-btn {
            padding: 6px 12px;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85em;
          }

          .no-data {
            text-align: center;
            padding: 40px;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  const injury = data.injury;
  const newsAnalysis = data.news?.analysis;
  const podcastCount = data.podcasts ? data.podcasts.length : 0;
  const youtubeCount = data.youtube ? data.youtube.length : 0;
  const redditCount = data.reddit ? data.reddit.length : 0;

  return (
    <div className="player-card">
      <div className="player-header">
        <div className="player-name">{player.name}</div>
        <div className="header-right">
          <span className={`injury-badge ${isInjured ? 'injured' : 'healthy'}`}>
            {isInjured ? '⚠️ INJURED' : '✅ HEALTHY'}
          </span>
          <button onClick={() => onRemove(player.name)} className="remove-btn">×</button>
        </div>
      </div>

      {/* Injury Details */}
      {injury && (
        <div className="section">
          <div className="section-title">🏥 Injury Details</div>
          <div className="injury-details">
            <p><strong>Team:</strong> {injury.Team}</p>
            <p><strong>Position:</strong> {injury.Position}</p>
            <p><strong>Injury:</strong> {injury.BodyPart || 'N/A'}</p>
            <p><strong>Status:</strong> {injury.Status || 'Unknown'}</p>
          </div>
        </div>
      )}

      {/* News Sentiment */}
      {newsAnalysis && (
        <div className="section">
          <div className="section-title">📰 News Sentiment Analysis</div>
          <div className={`sentiment-score ${newsAnalysis.overallSentiment.score > 0 ? 'positive' : newsAnalysis.overallSentiment.score < 0 ? 'negative' : 'neutral'}`}>
            {newsAnalysis.overallSentiment.label} ({newsAnalysis.overallSentiment.score})
          </div>
          <div className="sentiment-bar">
            {newsAnalysis.breakdown.positive.percentage > 0 && (
              <div className="sentiment-positive" style={{width: `${newsAnalysis.breakdown.positive.percentage}%`}}>
                {newsAnalysis.breakdown.positive.percentage}%
              </div>
            )}
            {newsAnalysis.breakdown.neutral.percentage > 0 && (
              <div className="sentiment-neutral" style={{width: `${newsAnalysis.breakdown.neutral.percentage}%`}}>
                {newsAnalysis.breakdown.neutral.percentage}%
              </div>
            )}
            {newsAnalysis.breakdown.negative.percentage > 0 && (
              <div className="sentiment-negative" style={{width: `${newsAnalysis.breakdown.negative.percentage}%`}}>
                {newsAnalysis.breakdown.negative.percentage}%
              </div>
            )}
          </div>
          <p className="article-count">{newsAnalysis.total} articles analyzed</p>

          {newsAnalysis.sourceComparison.national.count > 0 && newsAnalysis.sourceComparison.local.count > 0 && (
            <div className="comparison">
              <div className="comparison-item">
                <strong>National</strong>
                <span>{newsAnalysis.sourceComparison.national.avgSentiment}</span>
              </div>
              <div className="comparison-item">
                <strong>Local</strong>
                <span>{newsAnalysis.sourceComparison.local.avgSentiment}</span>
              </div>
              <div className="comparison-item">
                <strong>Difference</strong>
                <span>{newsAnalysis.sourceComparison.difference}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Social Media Mentions */}
      <div className="section">
        <div className="section-title">💬 Social Media Mentions</div>
        <div className="mentions">
          <div className="mention-badge">
            <strong>{podcastCount}</strong>
            <span>Podcasts</span>
          </div>
          <div className="mention-badge">
            <strong>{youtubeCount}</strong>
            <span>YouTube</span>
          </div>
          <div className="mention-badge">
            <strong>{redditCount}</strong>
            <span>Reddit</span>
          </div>
        </div>
      </div>

      <p className="last-checked">Last checked: {new Date(player.lastChecked).toLocaleString()}</p>

      <style jsx>{`
        .player-card {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-left: 4px solid #0a2463;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .player-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 30px rgba(10,36,99,0.15);
          border-left-color: #dc2626;
        }

        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e5e7eb;
        }

        .player-name {
          font-size: 1.5em;
          font-weight: bold;
          color: #0a2463;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .injury-badge {
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.85em;
        }

        .injury-badge.healthy {
          background: #10b981;
          color: white;
        }

        .injury-badge.injured {
          background: #dc2626;
          color: white;
        }

        .remove-btn {
          padding: 4px 10px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1.2em;
          line-height: 1;
        }

        .remove-btn:hover {
          background: #dc2626;
        }

        .section {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 0.9em;
          font-weight: bold;
          color: #0a2463;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .injury-details {
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 12px;
          border-radius: 5px;
        }

        .injury-details p {
          margin: 5px 0;
          color: #374151;
        }

        .sentiment-score {
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .sentiment-score.positive { color: #10b981; }
        .sentiment-score.neutral { color: #6b7280; }
        .sentiment-score.negative { color: #dc2626; }

        .sentiment-bar {
          display: flex;
          height: 30px;
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .sentiment-positive {
          background: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.8em;
          font-weight: bold;
        }

        .sentiment-neutral {
          background: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.8em;
          font-weight: bold;
        }

        .sentiment-negative {
          background: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.8em;
          font-weight: bold;
        }

        .article-count {
          color: #6b7280;
          font-size: 0.9em;
          margin-bottom: 10px;
        }

        .comparison {
          display: flex;
          gap: 15px;
          margin-top: 10px;
        }

        .comparison-item {
          flex: 1;
          background: #f9fafb;
          padding: 10px;
          border-radius: 5px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }

        .comparison-item strong {
          display: block;
          color: #6b7280;
          font-size: 0.8em;
          margin-bottom: 5px;
        }

        .comparison-item span {
          font-size: 1.3em;
          font-weight: bold;
          color: #0a2463;
        }

        .mentions {
          display: flex;
          gap: 10px;
        }

        .mention-badge {
          background: #f9fafb;
          padding: 10px 15px;
          border-radius: 5px;
          text-align: center;
          flex: 1;
          border: 1px solid #e5e7eb;
        }

        .mention-badge strong {
          display: block;
          font-size: 1.5em;
          color: #dc2626;
          margin-bottom: 3px;
        }

        .mention-badge span {
          font-size: 0.8em;
          color: #6b7280;
        }

        .last-checked {
          color: #6b7280;
          font-size: 0.85em;
          margin-top: 15px;
        }
      `}</style>
    </div>
  );
}

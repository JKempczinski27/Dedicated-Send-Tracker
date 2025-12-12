import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Home() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerDeploymentDate, setNewPlayerDeploymentDate] = useState('');
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
        body: JSON.stringify({ 
          playerName: newPlayerName,
          deploymentDate: newPlayerDeploymentDate || null
        })
      });

      if (res.ok) {
        setNewPlayerName('');
        setNewPlayerDeploymentDate('');
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
            <input
              type="date"
              placeholder="Deployment Date (optional)"
              value={newPlayerDeploymentDate}
              onChange={(e) => setNewPlayerDeploymentDate(e.target.value)}
              disabled={addingPlayer}
              title="Select deployment date"
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
          flex-wrap: wrap;
        }

        .add-form input {
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1em;
          flex: 1;
          min-width: 200px;
        }

        .add-form input[type="date"] {
          flex: 0.8;
          min-width: 160px;
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

function DeploymentDateSection({ player }) {
  const [deploymentDate, setDeploymentDate] = useState(player.deploymentDate || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch('/api/watchlist/update-deployment-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerName: player.name,
          deploymentDate: deploymentDate || null
        })
      });

      if (!res.ok) {
        alert('Error updating deployment date');
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating deployment date:', error);
      alert('Error updating deployment date');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDeploymentDate(player.deploymentDate || '');
    setIsEditing(false);
  };

  return (
    <div className="section">
      <div className="deployment-header">
        <div className="section-title">📅 Deployment Date</div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="edit-btn"
          >
            Edit
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div className="deployment-edit">
          <input
            type="date"
            value={deploymentDate}
            onChange={(e) => setDeploymentDate(e.target.value)}
            disabled={isSaving}
          />
          <div className="deployment-buttons">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="save-btn"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={handleCancel}
              disabled={isSaving}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="deployment-display">
          {deploymentDate ? (
            <p className="deployment-date">
              {new Date(deploymentDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          ) : (
            <p className="no-deployment-date">No deployment date set</p>
          )}
        </div>
      )}

      <style jsx>{`
        .deployment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .edit-btn {
          padding: 6px 12px;
          background: #0a2463;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85em;
          font-weight: 600;
          transition: background 0.2s;
        }

        .edit-btn:hover {
          background: #1e40af;
        }

        .deployment-edit {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .deployment-edit input {
          padding: 8px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 1em;
          flex: 1;
        }

        .deployment-edit input:focus {
          outline: none;
          border-color: #0a2463;
        }

        .deployment-buttons {
          display: flex;
          gap: 8px;
        }

        .save-btn, .cancel-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85em;
          font-weight: 600;
          transition: background 0.2s;
        }

        .save-btn {
          background: #10b981;
          color: white;
        }

        .save-btn:hover:not(:disabled) {
          background: #059669;
        }

        .cancel-btn {
          background: #6b7280;
          color: white;
        }

        .cancel-btn:hover:not(:disabled) {
          background: #4b5563;
        }

        .save-btn:disabled, .cancel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .deployment-display {
          padding: 10px 0;
        }

        .deployment-date {
          font-size: 1.05em;
          color: #0a2463;
          font-weight: 600;
          margin: 0;
        }

        .no-deployment-date {
          color: #9ca3af;
          font-style: italic;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

function PlayerCard({ player, onRemove }) {
  const data = player.cachedData;
  const hasData = data && player.lastChecked;
  // Check if player is injured (works with both old and new API formats)
  const injury = data?.injury;
  const isInjured = injury && injury.found !== false && 
                    injury.status && injury.status !== 'ACT' && injury.status !== 'Active';

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

  const newsAnalysis = data.news?.analysis;
  const podcastCount = data.podcasts ? data.podcasts.length : 0;
  const youtubeCount = data.youtube ? data.youtube.length : 0;
  const redditCount = data.reddit ? data.reddit.length : 0;

  // Status display mapping for Sportradar API
  const getStatusDisplay = (status) => {
    const statusMap = {
      'ACT': '✅ Active (Healthy)',
      'IR': '🚑 Injured Reserve',
      'PRA': '📋 Practice Squad',
      'PUP': '⚕️ Physically Unable to Perform',
      'IRD': '🔄 IR - Designated for Return',
      'SUS': '⛔ Suspended',
      'PRA_IR': '📋 Practice Squad - Injured',
      'NON': '❌ Non-Football Injury List',
      'Active': '✅ Active (Healthy)'
    };
    return statusMap[status] || status || 'Unknown';
  };

  // Check for breaking injury alert
  const injuryAlert = data.news?.injuryAlert;

  return (
    <div className="player-card">
      <div className="player-header">
        <div className="player-name">{player.name}</div>
        <div className="header-right">
          <span className={`injury-badge ${isInjured ? 'injured' : 'healthy'}`}>
            {isInjured ? '⚠️ INJURED' : '✅ HEALTHY'}
          </span>
          {newsAnalysis && (
            <span className={`sentiment-badge ${
              newsAnalysis.overallSentiment.score > 2 ? 'very-positive' :
              newsAnalysis.overallSentiment.score > 0 ? 'positive' :
              newsAnalysis.overallSentiment.score < -2 ? 'very-negative' :
              newsAnalysis.overallSentiment.score < 0 ? 'negative' : 'neutral'
            }`}>
              {newsAnalysis.overallSentiment.score > 0 ? '📈' : 
               newsAnalysis.overallSentiment.score < 0 ? '📉' : '➖'} 
              {newsAnalysis.overallSentiment.label}
            </span>
          )}
          <button onClick={() => onRemove(player.name)} className="remove-btn">×</button>
        </div>
      </div>

      {/* Breaking Injury Alert */}
      {injuryAlert && injuryAlert.detected && (
        <div className="injury-alert">
          <div className="alert-header">
            <span className="alert-icon">🚨</span>
            <span className="alert-title">BREAKING INJURY NEWS</span>
          </div>
          <div className="alert-content">
            <p className="alert-message">
              ⚠️ {injuryAlert.count} recent {injuryAlert.count === 1 ? 'article' : 'articles'} with injury keywords detected in the last 48 hours.
              Official roster status may not be updated yet.
            </p>
            <div className="alert-article">
              <p className="alert-article-title">{injuryAlert.mostRecentArticle.title}</p>
              <p className="alert-article-meta">
                {injuryAlert.mostRecentArticle.source} • {injuryAlert.mostRecentArticle.hoursAgo}h ago
              </p>
              <a href={injuryAlert.mostRecentArticle.url} target="_blank" rel="noopener noreferrer" className="alert-link">
                Read Article →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Injury Details */}
      {injury && injury.found && (
        <div className="section">
          <div className="section-title">🏥 Player Status</div>
          <div className="injury-details">
            <p><strong>Name:</strong> {injury.name}</p>
            <p><strong>Team:</strong> {injury.team || injury.Team} {injury.teamAlias ? `(${injury.teamAlias})` : ''}</p>
            <p><strong>Position:</strong> {injury.position || injury.Position}</p>
            {injury.jersey && <p><strong>Jersey:</strong> #{injury.jersey}</p>}
            <p><strong>Status:</strong> {getStatusDisplay(injury.status || injury.Status)}</p>
            {injury.BodyPart && <p><strong>Injury:</strong> {injury.BodyPart}</p>}
          </div>
        </div>
      )}
      
      {injury && !injury.found && (
        <div className="section">
          <div className="section-title">🏥 Player Status</div>
          <div className="injury-details">
            <p>⚠️ Player not found in Sportradar database</p>
          </div>
        </div>
      )}

      {/* Deployment Date */}
      <DeploymentDateSection player={player} />

      {/* News Sentiment */}
      {newsAnalysis && (
        <div className="section">
          <div className="section-title">📰 News Sentiment Analysis</div>
          <div className={`sentiment-score ${newsAnalysis.overallSentiment.score > 0 ? 'positive' : newsAnalysis.overallSentiment.score < 0 ? 'negative' : 'neutral'}`}>
            {newsAnalysis.overallSentiment.label} ({newsAnalysis.overallSentiment.score})
          </div>
          <p className="article-count">{newsAnalysis.total} articles analyzed (last 7 days)</p>
          
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

          {newsAnalysis.sourceComparison.national.count > 0 && newsAnalysis.sourceComparison.local.count > 0 && (
            <div className="media-comparison">
              <div className="comparison-header">
                <strong>📊 Media Perception</strong>
              </div>
              <div className="comparison-grid">
                <div className="comparison-card">
                  <div className="comparison-label">🌐 National Media</div>
                  <div className={`comparison-value ${
                    parseFloat(newsAnalysis.sourceComparison.national.avgSentiment) > 0 ? 'positive' :
                    parseFloat(newsAnalysis.sourceComparison.national.avgSentiment) < 0 ? 'negative' : 'neutral'
                  }`}>
                    {newsAnalysis.sourceComparison.national.avgSentiment}
                  </div>
                  <div className="comparison-label-small">{newsAnalysis.sourceComparison.national.label}</div>
                  <div className="comparison-count">{newsAnalysis.sourceComparison.national.count} articles</div>
                </div>
                <div className="comparison-card">
                  <div className="comparison-label">🏠 Local Media</div>
                  <div className={`comparison-value ${
                    parseFloat(newsAnalysis.sourceComparison.local.avgSentiment) > 0 ? 'positive' :
                    parseFloat(newsAnalysis.sourceComparison.local.avgSentiment) < 0 ? 'negative' : 'neutral'
                  }`}>
                    {newsAnalysis.sourceComparison.local.avgSentiment}
                  </div>
                  <div className="comparison-label-small">{newsAnalysis.sourceComparison.local.label}</div>
                  <div className="comparison-count">{newsAnalysis.sourceComparison.local.count} articles</div>
                </div>
                <div className="comparison-card highlight">
                  <div className="comparison-label">📈 Difference</div>
                  <div className={`comparison-value ${
                    parseFloat(newsAnalysis.sourceComparison.difference) > 2 ? 'very-positive' :
                    parseFloat(newsAnalysis.sourceComparison.difference) > 0 ? 'positive' :
                    parseFloat(newsAnalysis.sourceComparison.difference) < -2 ? 'very-negative' :
                    parseFloat(newsAnalysis.sourceComparison.difference) < 0 ? 'negative' : 'neutral'
                  }`}>
                    {newsAnalysis.sourceComparison.difference > 0 ? '+' : ''}{newsAnalysis.sourceComparison.difference}
                  </div>
                  <div className="comparison-info">
                    {parseFloat(newsAnalysis.sourceComparison.difference) > 0 
                      ? 'Local media more positive' 
                      : parseFloat(newsAnalysis.sourceComparison.difference) < 0 
                      ? 'National media more positive' 
                      : 'Similar coverage'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top News Articles */}
      {newsAnalysis && newsAnalysis.total > 0 && (
        <div className="section">
          <div className="section-title">📰 Recent News Articles</div>
          <div className="articles-list">
            {data.news?.articles?.slice(0, 5).map((article, idx) => (
              <div key={idx} className="article-item">
                <div className="article-header">
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="article-title">
                    {article.title}
                  </a>
                  <span className={`article-sentiment ${
                    article.sentiment.score > 2 ? 'very-positive' :
                    article.sentiment.score > 0 ? 'positive' :
                    article.sentiment.score < -2 ? 'very-negative' :
                    article.sentiment.score < 0 ? 'negative' : 'neutral'
                  }`}>
                    {article.sentiment.label}
                  </span>
                </div>
                <div className="article-meta">
                  <span className="article-source">{article.source}</span>
                  <span className="article-source-type">{article.sourceType === 'national' ? '🌐 National' : article.sourceType === 'local' ? '🏠 Local' : '📰 Other'}</span>
                  <span className="article-date">{article.publishedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

        .sentiment-badge {
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.85em;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .sentiment-badge.very-positive {
          background: #10b981;
          color: white;
        }

        .sentiment-badge.positive {
          background: #34d399;
          color: white;
        }

        .sentiment-badge.neutral {
          background: #6b7280;
          color: white;
        }

        .sentiment-badge.negative {
          background: #f59e0b;
          color: white;
        }

        .sentiment-badge.very-negative {
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

        .injury-alert {
          background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
          border: 2px solid #dc2626;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 15px;
          box-shadow: 0 4px 15px rgba(220, 38, 38, 0.2);
          animation: pulse-border 2s infinite;
        }

        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.2);
          }
          50% {
            box-shadow: 0 4px 25px rgba(220, 38, 38, 0.4);
          }
        }

        .alert-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .alert-icon {
          font-size: 1.5em;
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.4; }
        }

        .alert-title {
          font-weight: bold;
          color: #dc2626;
          font-size: 1.1em;
          letter-spacing: 0.5px;
        }

        .alert-content {
          margin-left: 35px;
        }

        .alert-message {
          color: #991b1b;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .alert-article {
          background: white;
          padding: 12px;
          border-radius: 6px;
          border-left: 3px solid #dc2626;
        }

        .alert-article-title {
          font-weight: 600;
          color: #0a2463;
          margin-bottom: 5px;
          font-size: 0.95em;
        }

        .alert-article-meta {
          color: #6b7280;
          font-size: 0.85em;
          margin-bottom: 8px;
        }

        .alert-link {
          color: #dc2626;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9em;
          display: inline-block;
          transition: color 0.2s;
        }

        .alert-link:hover {
          color: #991b1b;
          text-decoration: underline;
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

        .media-comparison {
          margin-top: 15px;
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .comparison-header {
          margin-bottom: 15px;
          font-size: 1em;
          color: #0a2463;
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .comparison-card {
          background: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 2px solid #e5e7eb;
          transition: transform 0.2s;
        }

        .comparison-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .comparison-card.highlight {
          border-color: #0a2463;
          background: linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%);
        }

        .comparison-label {
          font-size: 0.85em;
          color: #6b7280;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .comparison-label-small {
          font-size: 0.75em;
          color: #9ca3af;
          margin-top: 5px;
          font-weight: 500;
        }

        .comparison-value {
          font-size: 2em;
          font-weight: bold;
          margin: 8px 0;
        }

        .comparison-value.very-positive {
          color: #10b981;
        }

        .comparison-value.positive {
          color: #34d399;
        }

        .comparison-value.neutral {
          color: #6b7280;
        }

        .comparison-value.negative {
          color: #f59e0b;
        }

        .comparison-value.very-negative {
          color: #dc2626;
        }

        .comparison-count {
          font-size: 0.75em;
          color: #9ca3af;
          margin-top: 5px;
        }

        .comparison-info {
          font-size: 0.75em;
          color: #6b7280;
          margin-top: 8px;
          padding: 6px;
          background: rgba(10, 36, 99, 0.05);
          border-radius: 4px;
          font-weight: 500;
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

        .articles-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .article-item {
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          border-left: 3px solid #0a2463;
          transition: all 0.2s;
        }

        .article-item:hover {
          background: #f3f4f6;
          border-left-color: #dc2626;
          transform: translateX(3px);
        }

        .article-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
        }

        .article-title {
          color: #0a2463;
          font-weight: 600;
          font-size: 0.95em;
          text-decoration: none;
          flex: 1;
          line-height: 1.4;
        }

        .article-title:hover {
          color: #dc2626;
          text-decoration: underline;
        }

        .article-sentiment {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75em;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .article-sentiment.very-positive {
          background: #d1fae5;
          color: #065f46;
        }

        .article-sentiment.positive {
          background: #dbeafe;
          color: #1e40af;
        }

        .article-sentiment.neutral {
          background: #e5e7eb;
          color: #374151;
        }

        .article-sentiment.negative {
          background: #fed7aa;
          color: #92400e;
        }

        .article-sentiment.very-negative {
          background: #fecaca;
          color: #991b1b;
        }

        .article-meta {
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 0.8em;
          color: #6b7280;
        }

        .article-source {
          font-weight: 600;
          color: #374151;
        }

        .article-source-type {
          padding: 2px 8px;
          background: white;
          border-radius: 4px;
          font-size: 0.9em;
          border: 1px solid #e5e7eb;
        }

        .article-date {
          margin-left: auto;
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

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
  const router = useRouter();

  useEffect(() => {
    fetchWatchlist();
  }, []);

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
      const res = await fetch('/api/update-all', { method: 'POST', credentials: 'include' });
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
        credentials: 'include',
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
        credentials: 'include',
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


  const stats = {
    total: watchlist.length,
    injured: watchlist.filter(p => {
      const injury = p.cachedData?.injury;
      return injury && injury.found && injury.status && injury.status !== 'ACT';
    }).length,
    healthy: watchlist.filter(p => {
      const injury = p.cachedData?.injury;
      return !injury || !injury.found || !injury.status || injury.status === 'ACT';
    }).length
  };

  return (
    <>
      <Head>
        <title>NFL Brand Growth Dedicated Send Tracking Dashboard</title>
        <meta name="description" content="Track NFL player injuries and media coverage" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div>
              <h1>NFL Brand Growth Dedicated Send Tracking Dashboard</h1>
              <p className="subtitle">Monitor injuries, media sentiment, social media mentions and deployment date</p>
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
              <p>Injured</p>
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

        {/* Player Table */}
        {loading ? (
          <div className="loading">Loading watchlist...</div>
        ) : watchlist.length === 0 ? (
          <div className="empty-state">
            <h2>Your watchlist is empty</h2>
            <p>Add players above to start tracking their injury status and media coverage.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="players-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Roster</th>
                  <th>Status</th>
                  <th>Team / Position</th>
                  <th>Deployment</th>
                  <th>Sentiment</th>
                  <th>Articles</th>
                  <th>News Alert</th>
                  <th>Last Checked</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((player) => (
                  <PlayerRow
                    key={player.name}
                    player={player}
                    onRemove={removePlayer}
                  />
                ))}
              </tbody>
            </table>
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

        .table-container {
          background: white;
          border-radius: 15px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-top: 4px solid #0a2463;
          overflow-x: auto;
        }

        .players-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9em;
        }

        .players-table thead {
          background: #0a2463;
          color: white;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .players-table th {
          padding: 15px 12px;
          text-align: left;
          font-weight: 600;
          white-space: nowrap;
          font-size: 0.85em;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .players-table tbody tr {
          border-bottom: 1px solid #e5e7eb;
          transition: background 0.2s;
        }

        .players-table tbody tr:hover {
          background: #f9fafb;
        }

        .players-table td {
          padding: 12px;
          vertical-align: middle;
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

          .add-form {
            flex-direction: column;
          }

          h1 {
            font-size: 1.8em;
          }

          .players-table {
            font-size: 0.8em;
          }

          .players-table th,
          .players-table td {
            padding: 8px 6px;
          }
        }
      `}</style>
    </>
  );
}

function PlayerRow({ player, onRemove }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deploymentDate, setDeploymentDate] = useState(player.deploymentDate || '');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const data = player.cachedData;
  const hasData = data && player.lastChecked;
  const injury = data?.injury;
  const playerInfo = data?.playerInfo;
  const isInjured = injury && injury.found !== false &&
                    injury.status && injury.status !== 'ACT' && injury.status !== 'Active';
  
  // Check roster status from playerInfo
  const rosterStatus = playerInfo?.status;
  const isOnActiveRoster = rosterStatus === 'ACT';
  const isOnReserve = rosterStatus === 'RES';

  const newsAnalysis = data?.news?.analysis;
  const injuryAlert = data?.news?.injuryAlert;

  const handleSaveDate = async () => {
    try {
      setIsSaving(true);
      const res = await fetch('/api/watchlist/update-deployment-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          playerName: player.name,
          deploymentDate: deploymentDate || null
        })
      });

      if (!res.ok) {
        alert('Error updating deployment date');
      } else {
        setIsEditingDate(false);
      }
    } catch (error) {
      console.error('Error updating deployment date:', error);
      alert('Error updating deployment date');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelDate = () => {
    setDeploymentDate(player.deploymentDate || '');
    setIsEditingDate(false);
  };

  if (!hasData) {
    return (
      <tr>
        <td><strong>{player.name}</strong></td>
        <td colSpan="7" style={{color: '#6b7280', fontStyle: 'italic'}}>No data - click "Update All"</td>
        <td>
          <button onClick={() => onRemove(player.name)} className="remove-btn">×</button>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className={isInjured ? 'injured-row' : ''}>
        <td>
          <div className="player-name-cell">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="expand-btn"
              title={isExpanded ? "Collapse details" : "Expand details"}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            <strong>{player.name}</strong>
          </div>
        </td>
        <td>
          {playerInfo && playerInfo.found ? (
            <div className="roster-status-cell">
              {isOnActiveRoster && <span className="status-badge healthy">✅ Active</span>}
              {isOnReserve && <span className="status-badge injured">🚑 Reserve/IR</span>}
              {rosterStatus === 'PRA' && <span className="status-badge" style={{background: '#fbbf24', color: '#78350f'}}>📋 Practice Squad</span>}
              {rosterStatus === 'PUP' && <span className="status-badge injured">⚕️ PUP</span>}
              {rosterStatus === 'RET' && <span className="status-badge" style={{background: '#6b7280', color: '#fff'}}>👋 Retired</span>}
              {!['ACT', 'RES', 'PRA', 'PUP', 'RET'].includes(rosterStatus) && <span style={{color: '#9ca3af'}}>{rosterStatus || '—'}</span>}
            </div>
          ) : (
            <span style={{color: '#9ca3af'}}>—</span>
          )}
        </td>
        <td>
          <span className={`status-badge ${isInjured ? 'injured' : 'healthy'}`}>
            {isInjured ? '⚠️ INJURED' : '✅ HEALTHY'}
          </span>
        </td>
        <td>
          {injury && injury.found ? (
            <div className="team-info">
              <div><strong>{injury.team}</strong></div>
              <div className="position">{injury.position} {injury.jersey ? `#${injury.jersey}` : ''}</div>
            </div>
          ) : (
            <span style={{color: '#9ca3af'}}>—</span>
          )}
        </td>
        <td>
          {isEditingDate ? (
            <div className="date-edit-cell">
              <input
                type="date"
                value={deploymentDate}
                onChange={(e) => setDeploymentDate(e.target.value)}
                disabled={isSaving}
                className="date-input"
              />
              <button onClick={handleSaveDate} disabled={isSaving} className="save-btn-sm">✓</button>
              <button onClick={handleCancelDate} disabled={isSaving} className="cancel-btn-sm">✗</button>
            </div>
          ) : (
            <div className="date-display-cell" onClick={() => setIsEditingDate(true)} title="Click to edit">
              {deploymentDate ? (
                new Date(deploymentDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              ) : (
                <span style={{color: '#9ca3af', cursor: 'pointer'}}>Set date</span>
              )}
            </div>
          )}
        </td>
        <td>
          {newsAnalysis ? (
            <div className="sentiment-cell">
              <span className={`sentiment-badge-sm ${
                newsAnalysis.overallSentiment.score > 2 ? 'very-positive' :
                newsAnalysis.overallSentiment.score > 0 ? 'positive' :
                newsAnalysis.overallSentiment.score < -2 ? 'very-negative' :
                newsAnalysis.overallSentiment.score < 0 ? 'negative' : 'neutral'
              }`}>
                {newsAnalysis.overallSentiment.score > 0 ? '📈' :
                 newsAnalysis.overallSentiment.score < 0 ? '📉' : '➖'}
                {newsAnalysis.overallSentiment.score}
              </span>
            </div>
          ) : (
            <span style={{color: '#9ca3af'}}>—</span>
          )}
        </td>
        <td>
          {newsAnalysis ? (
            <div className="articles-cell">
              <strong>{newsAnalysis.total}</strong>
              <div className="sentiment-mini-bar">
                {newsAnalysis.breakdown.positive.percentage > 0 && (
                  <div className="bar-positive" style={{width: `${newsAnalysis.breakdown.positive.percentage}%`}} title={`${newsAnalysis.breakdown.positive.percentage}% positive`}></div>
                )}
                {newsAnalysis.breakdown.neutral.percentage > 0 && (
                  <div className="bar-neutral" style={{width: `${newsAnalysis.breakdown.neutral.percentage}%`}} title={`${newsAnalysis.breakdown.neutral.percentage}% neutral`}></div>
                )}
                {newsAnalysis.breakdown.negative.percentage > 0 && (
                  <div className="bar-negative" style={{width: `${newsAnalysis.breakdown.negative.percentage}%`}} title={`${newsAnalysis.breakdown.negative.percentage}% negative`}></div>
                )}
              </div>
            </div>
          ) : (
            <span style={{color: '#9ca3af'}}>—</span>
          )}
        </td>
        <td>
          {injuryAlert && injuryAlert.detected ? (
            <span className="alert-badge" title={`${injuryAlert.count} recent injury articles`}>
              🚨 {injuryAlert.count}
            </span>
          ) : (
            <span style={{color: '#9ca3af'}}>—</span>
          )}
        </td>
        <td>
          <div className="timestamp">
            {new Date(player.lastChecked).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            <div className="time">{new Date(player.lastChecked).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </td>
        <td>
          <button onClick={() => onRemove(player.name)} className="remove-btn" title="Remove player">×</button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="expanded-row">
          <td colSpan="9">
            <div className="expanded-content">
              {/* Injury Details */}
              {injury && injury.found && (
                <div className="detail-section">
                  <h4>🏥 Player Status</h4>
                  <div className="detail-grid">
                    <div><strong>Status:</strong> {injury.status}</div>
                    {injury.BodyPart && <div><strong>Injury:</strong> {injury.BodyPart}</div>}
                  </div>
                </div>
              )}

              {/* Breaking Injury Alert */}
              {injuryAlert && injuryAlert.detected && (
                <div className="detail-section alert-section">
                  <h4>🚨 BREAKING INJURY NEWS</h4>
                  <p>⚠️ {injuryAlert.count} recent article{injuryAlert.count !== 1 ? 's' : ''} with injury keywords detected in the last 48 hours.</p>
                  {injuryAlert.mostRecentArticle && (
                    <div className="alert-article">
                      <a href={injuryAlert.mostRecentArticle.url} target="_blank" rel="noopener noreferrer">
                        {injuryAlert.mostRecentArticle.title}
                      </a>
                      <div className="article-meta-sm">
                        {injuryAlert.mostRecentArticle.source} • {injuryAlert.mostRecentArticle.hoursAgo}h ago
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sentiment Analysis */}
              {newsAnalysis && (
                <div className="detail-section">
                  <h4>📰 News Sentiment Analysis</h4>
                  <div className="detail-grid">
                    <div>
                      <strong>Overall:</strong> {newsAnalysis.overallSentiment.label} ({newsAnalysis.overallSentiment.score})
                    </div>
                    <div>
                      <strong>Breakdown:</strong> {newsAnalysis.breakdown.positive.percentage}% pos, {newsAnalysis.breakdown.neutral.percentage}% neutral, {newsAnalysis.breakdown.negative.percentage}% neg
                    </div>
                    {newsAnalysis.sourceComparison && newsAnalysis.sourceComparison.national.count > 0 && (
                      <>
                        <div>
                          <strong>National:</strong> {newsAnalysis.sourceComparison.national.avgSentiment} ({newsAnalysis.sourceComparison.national.count} articles)
                        </div>
                        <div>
                          <strong>Local:</strong> {newsAnalysis.sourceComparison.local.avgSentiment} ({newsAnalysis.sourceComparison.local.count} articles)
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Articles */}
              {newsAnalysis && newsAnalysis.total > 0 && data.news?.articles && (
                <div className="detail-section">
                  <h4>📰 Recent Articles</h4>
                  <div className="articles-list-compact">
                    {data.news.articles.slice(0, 5).map((article, idx) => (
                      <div key={idx} className="article-compact">
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                          {article.title}
                        </a>
                        <div className="article-meta-sm">
                          <span className={`sentiment-label ${article.sentiment.score > 0 ? 'positive' : article.sentiment.score < 0 ? 'negative' : 'neutral'}`}>
                            {article.sentiment.label}
                          </span>
                          <span>{article.source}</span>
                          <span>{article.publishedAt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}

      <style jsx>{`
        .injured-row {
          background: #fef2f2;
        }

        .player-name-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .expand-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.8em;
          color: #6b7280;
          padding: 4px;
          transition: color 0.2s;
        }

        .expand-btn:hover {
          color: #0a2463;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.75em;
          white-space: nowrap;
        }

        .status-badge.healthy {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.injured {
          background: #fecaca;
          color: #991b1b;
        }

        .team-info {
          line-height: 1.4;
        }

        .position {
          font-size: 0.85em;
          color: #6b7280;
        }

        .date-edit-cell {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .date-input {
          padding: 4px 6px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 0.85em;
          width: 130px;
        }

        .save-btn-sm, .cancel-btn-sm {
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
          font-weight: bold;
        }

        .save-btn-sm {
          background: #10b981;
          color: white;
        }

        .cancel-btn-sm {
          background: #6b7280;
          color: white;
        }

        .save-btn-sm:hover:not(:disabled) {
          background: #059669;
        }

        .cancel-btn-sm:hover:not(:disabled) {
          background: #4b5563;
        }

        .date-display-cell {
          cursor: pointer;
          transition: color 0.2s;
        }

        .date-display-cell:hover {
          color: #0a2463;
          text-decoration: underline;
        }

        .sentiment-cell {
          text-align: center;
        }

        .sentiment-badge-sm {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.75em;
          white-space: nowrap;
        }

        .sentiment-badge-sm.very-positive {
          background: #d1fae5;
          color: #065f46;
        }

        .sentiment-badge-sm.positive {
          background: #dbeafe;
          color: #1e40af;
        }

        .sentiment-badge-sm.neutral {
          background: #e5e7eb;
          color: #374151;
        }

        .sentiment-badge-sm.negative {
          background: #fed7aa;
          color: #92400e;
        }

        .sentiment-badge-sm.very-negative {
          background: #fecaca;
          color: #991b1b;
        }

        .articles-cell {
          text-align: center;
        }

        .sentiment-mini-bar {
          display: flex;
          height: 4px;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 4px;
          background: #e5e7eb;
        }

        .bar-positive {
          background: #10b981;
        }

        .bar-neutral {
          background: #6b7280;
        }

        .bar-negative {
          background: #dc2626;
        }

        .alert-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 10px;
          background: #fecaca;
          color: #991b1b;
          font-weight: 600;
          font-size: 0.75em;
          white-space: nowrap;
        }

        .timestamp {
          font-size: 0.85em;
          line-height: 1.3;
        }

        .time {
          color: #6b7280;
          font-size: 0.9em;
        }

        .remove-btn {
          padding: 4px 8px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1.2em;
          line-height: 1;
          transition: background 0.2s;
        }

        .remove-btn:hover {
          background: #b91c1c;
        }

        .expanded-row {
          background: #f9fafb;
        }

        .expanded-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .detail-section {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border-left: 3px solid #0a2463;
        }

        .detail-section h4 {
          margin: 0 0 12px 0;
          color: #0a2463;
          font-size: 1em;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 8px;
          font-size: 0.9em;
        }

        .alert-section {
          border-left-color: #dc2626;
          background: #fef2f2;
        }

        .alert-article {
          margin-top: 10px;
          padding: 10px;
          background: white;
          border-radius: 4px;
        }

        .alert-article a {
          color: #0a2463;
          font-weight: 600;
          text-decoration: none;
        }

        .alert-article a:hover {
          text-decoration: underline;
        }

        .article-meta-sm {
          font-size: 0.85em;
          color: #6b7280;
          margin-top: 4px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .articles-list-compact {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .article-compact {
          padding: 10px;
          background: #f9fafb;
          border-radius: 4px;
          border-left: 2px solid #0a2463;
        }

        .article-compact a {
          color: #0a2463;
          font-weight: 600;
          text-decoration: none;
          font-size: 0.9em;
        }

        .article-compact a:hover {
          text-decoration: underline;
        }

        .sentiment-label {
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.9em;
        }

        .sentiment-label.positive {
          background: #d1fae5;
          color: #065f46;
        }

        .sentiment-label.neutral {
          background: #e5e7eb;
          color: #374151;
        }

        .sentiment-label.negative {
          background: #fecaca;
          color: #991b1b;
        }
      `}</style>
    </>
  );
}


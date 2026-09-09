import React, { useState, useEffect } from 'react';
import { leaderboardApi, adminApi } from '../../services/api';
import { Trophy, RefreshCw, Loader2, FileDown, Award } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminLeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchStandings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await leaderboardApi.getLeaderboard();
      setLeaderboard(data);
      if (silent) toast.info('Leaderboard updated.');
    } catch (err) {
      if (!silent) toast.error('Failed to load leaderboard.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
    const interval = setInterval(() => fetchStandings(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCsv = async () => {
    try {
      const blob = await adminApi.exportCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'defendx-results.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('defendx-results.csv successfully downloaded.');
    } catch (err) {
      toast.error('Export download failed.');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-violet">ADMINISTRATION</span>
            <span className="badge badge-cyan">GLOBAL TEAM RANKINGS</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', color: '#fff' }}>Competition Leaderboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Live authoritative scores and operational efficiency across all squads.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => fetchStandings(false)}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="btn btn-primary"
          >
            <FileDown size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Loader2 size={36} className="spin" color="var(--cyan-primary)" style={{ margin: '0 auto 1rem auto' }} />
          <div style={{ color: 'var(--text-muted)' }}>Calculating Standings...</div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Trophy size={40} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No leaderboard results available yet.</h3>
        </div>
      ) : (
        <div className="cyber-table-container">
          <table className="cyber-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Rank</th>
                <th>Team Name</th>
                <th>Scenario</th>
                <th>Score</th>
                <th>Accuracy</th>
                <th>Efficiency</th>
                <th>Stage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => {
                const isTop1 = entry.rank === 1;
                const isTop3 = entry.rank <= 3;
                return (
                  <tr key={entry.team_code} style={{ background: isTop1 ? 'rgba(0, 240, 255, 0.04)' : 'transparent' }}>
                    <td>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        background: isTop1 ? 'linear-gradient(135deg, #fbbf24, #d97706)' : isTop3 ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        color: isTop1 ? '#000' : '#fff'
                      }}>
                        {entry.rank}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{entry.team_name}</div>
                      <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{entry.team_code}</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{entry.scenario_name}</td>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)', fontSize: '1.05rem' }}>
                        {Math.round(entry.score)}
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ color: entry.accuracy_percentage >= 70 ? 'var(--emerald-success)' : 'var(--text-muted)' }}>
                        {entry.accuracy_percentage}%
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ color: entry.efficiency_score < 0 ? 'var(--rose-danger)' : 'var(--text-muted)' }}>
                        {entry.efficiency_score} pts
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                        {entry.current_stage}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        entry.status === 'COMPLETED' ? 'badge-emerald' :
                        entry.status === 'ACTIVE' ? 'badge-cyan' :
                        entry.status === 'PAUSED' ? 'badge-amber' : 'badge-violet'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

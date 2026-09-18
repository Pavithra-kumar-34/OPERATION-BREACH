import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import {
  BarChart3,
  Users,
  Award,
  GraduationCap,
  PieChart,
  RefreshCw,
  Loader2,
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);
  const toast = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    setAnalyticsError(null);
    try {
      const data = await adminApi.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(err.message || 'Failed to load analytics metrics.');
      toast.error(err.message || 'Failed to load analytics metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <Loader2 size={36} className="spin" color="var(--cyan-primary)" style={{ margin: '0 auto 1rem auto' }} />
        <div style={{ color: 'var(--text-muted)' }}>Aggregating Platform Performance Telemetry...</div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <div style={{ color: 'var(--rose-danger)', marginBottom: '1rem' }}>{analyticsError}</div>
        <button type="button" onClick={fetchAnalytics} className="btn btn-secondary">
          <RefreshCw size={15} />
          <span>Retry Analytics</span>
        </button>
      </div>
    );
  }

  const stageKeys = ['DETECT', 'INVESTIGATE', 'ANALYZE', 'IDENTIFY', 'RESPOND', 'REPORT'];
  const scoreKeys = ['0-250', '251-500', '501-750', '751-1000'];
  const stageDistribution = analytics?.stage_distribution || {};
  const scoreDistribution = analytics?.score_distribution || {};
  const stageEntries = stageKeys.map((stage) => [stage, stageDistribution[stage] ?? null]);
  const scoreEntries = scoreKeys.map((tier) => [tier, scoreDistribution[tier] ?? null]);
  const numericValues = (entries) => entries.map(([, value]) => Number(value) || 0);
  const maxStageCount = Math.max(...numericValues(stageEntries), 1);
  const maxScoreCount = Math.max(...numericValues(scoreEntries), 1);
  const displayValue = (value, suffix = '') => value === null || value === undefined ? '—' : `${value}${suffix}`;
  const displayNumber = (value, suffix = '') => value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}${suffix}`;
  const totalTeams = analytics?.total_teams;
  const completedTeams = analytics?.completed_teams;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-violet">ADMINISTRATION</span>
            <span className="badge badge-cyan">TELEMETRY & ANALYTICS</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', color: '#fff' }}>Platform Performance Analytics</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Aggregated operational statistics across Blue Team participants, completion rates, and scoring tiers.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="btn btn-secondary"
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Total Teams</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--cyan-primary)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>{displayValue(analytics?.total_teams)}</div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Active Teams</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--emerald-success)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>{displayValue(analytics?.active_teams)}</div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Completed Teams</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--violet-primary)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>{displayValue(analytics?.completed_teams)}</div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Total Participants</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>{displayValue(analytics?.total_participants)}</div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Average Squad Score
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--cyan-primary)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            {displayNumber(analytics?.average_score)} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>/ 1000</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--emerald-success)', marginTop: '0.35rem' }}>
            Normalized 1000-pt Formula
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Average Accuracy Rate
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--emerald-success)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            {displayNumber(analytics?.average_accuracy, '%')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Across all investigation decisions
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Operation Completion Rate
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--violet-primary)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            {displayNumber(analytics?.operation_completion_rate, '%')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {displayValue(completedTeams)} of {displayValue(totalTeams)} teams finished
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Training Platform Completion (Afternoon Event)
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
            {displayNumber(analytics?.academy_average_completion, '%')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Across 14 training modules
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Average Completion</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--cyan-primary)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>{displayNumber(analytics?.average_completion, '%')}</div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Average Efficiency</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--violet-primary)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>{displayNumber(analytics?.average_efficiency)}</div>
        </div>

      </div>

      {/* Visual Chart Bars Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* 1. Stage Distribution Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Activity size={20} color="var(--cyan-primary)" />
            <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Teams by Current Operation Stage</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {stageEntries.map(([stage, count]) => {
              const pct = ((Number(count) || 0) / maxStageCount) * 100;
              return (
                <div key={stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{stage}</span>
                    <span className="mono" style={{ color: '#fff' }}>{displayValue(count)} Teams</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '8px' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '9999px',
                        background: 'linear-gradient(90deg, var(--cyan-primary), var(--cyan-dark))',
                        width: `${pct}%`,
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Score Tier Distribution Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <BarChart3 size={20} color="var(--violet-primary)" />
            <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Score Tier Distribution</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {scoreEntries.map(([tier, count]) => {
              const pct = ((Number(count) || 0) / maxScoreCount) * 100;
              return (
                <div key={tier}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{tier} PTS</span>
                    <span className="mono" style={{ color: '#fff' }}>{displayValue(count)} Teams</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '8px' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '9999px',
                        background: 'linear-gradient(90deg, var(--violet-primary), #6366f1)',
                        width: `${pct}%`,
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

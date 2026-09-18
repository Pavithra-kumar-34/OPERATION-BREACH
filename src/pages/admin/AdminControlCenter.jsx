import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Modal } from '../../components/Modal';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Users,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Award,
  Download,
  Loader2,
  CheckCircle2,
  FileDown
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminControlCenter = ({ onNavigate }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'START', 'PAUSE', 'RESUME', 'END', 'RESET'
  const [competitionStatus, setCompetitionStatus] = useState('LOCKED');
  const toast = useToast();

  const fetchOverview = async () => {
    setLoading(true);
    setAnalyticsError(null);
    try {
      const data = await adminApi.getAnalytics();
      setAnalytics(data);
      if (data.active_teams > 0) {
        setCompetitionStatus('ACTIVE');
      } else if (data.completed_teams === data.total_teams && data.total_teams > 0) {
        setCompetitionStatus('COMPLETED');
      }
    } catch (err) {
      setAnalyticsError(err.message || 'Failed to load control center analytics.');
      toast.error(err.message || 'Failed to load control center analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleExecuteControl = async () => {
    if (!confirmAction) return;

    setActionLoading(true);
    try {
      const res = await adminApi.controlCompetition(confirmAction);
      toast.success(res.message);
      setCompetitionStatus(res.competition_status);
      setConfirmAction(null);
      fetchOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to execute competition action.');
    } finally {
      setActionLoading(false);
    }
  };

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
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.95) 0%, rgba(26, 16, 48, 0.95) 100%)',
        border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-violet">DEFENDX MASTER CONTROL</span>
            <span className="badge badge-cyan">SERVER-AUTHORITATIVE</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', color: '#fff', marginBottom: '0.3rem' }}>
            Competition Control Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Global command authority to initiate, freeze, resume, terminate, and export cyber operation competitions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCsv}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem' }}
          >
            <FileDown size={18} color="var(--cyan-primary)" />
            <span>Export CSV Results</span>
          </button>

          <button
            onClick={() => onNavigate('teams')}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.25rem' }}
          >
            <Users size={18} />
            <span>Manage Teams</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {loading ? (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <Loader2 size={20} className="spin" color="var(--cyan-primary)" />
          <span style={{ color: 'var(--text-muted)' }}>Loading platform analytics...</span>
        </div>
      ) : analyticsError ? (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ color: 'var(--rose-danger)', marginBottom: '0.75rem' }}>{analyticsError}</div>
          <button type="button" onClick={fetchOverview} className="btn btn-secondary">
            <RotateCcw size={15} />
            <span>Retry Analytics</span>
          </button>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Competition Status
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cyan-primary)', marginTop: '0.25rem' }}>
            {competitionStatus}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Registration: <strong style={{ color: '#34d399' }}>OPEN</strong>
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Total 2-Person Teams
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>
            {analytics?.total_teams || 0} Teams
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {analytics?.total_participants || 0} Registered Analysts
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Active Operations
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--emerald-success)', marginTop: '0.25rem' }}>
            {analytics?.active_teams || 0} Active
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {analytics?.completed_teams || 0} Finished Reports
          </div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Average Squad Score
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--violet-primary)', marginTop: '0.25rem' }}>
            {analytics?.average_score || 0} / 1000
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Accuracy: {analytics?.average_accuracy || 0}%
          </div>
        </div>
      </div>
      )}

      {/* Primary Competition Action Bar */}
      <div className="card" style={{ marginBottom: '2rem', borderColor: 'var(--border-glow)' }}>
        <h3 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.5rem' }}>
          Master Competition Triggers
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Server-enforced lifecycle transitions. Actions propagate instantly across all active connected Blue Team analyst terminals via WebSocket.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Start */}
          <button
            onClick={() => setConfirmAction('START')}
            className="btn btn-emerald"
            style={{ padding: '1rem', flexDirection: 'column', gap: '0.4rem', height: '100px' }}
          >
            <Play size={24} />
            <span style={{ fontSize: '0.95rem' }}>START COMPETITION</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Activates all team operations</span>
          </button>

          {/* Pause */}
          <button
            onClick={() => setConfirmAction('PAUSE')}
            className="btn btn-secondary"
            style={{
              padding: '1rem',
              flexDirection: 'column',
              gap: '0.4rem',
              height: '100px',
              borderColor: 'rgba(245, 158, 11, 0.4)',
              color: '#fbbf24'
            }}
          >
            <Pause size={24} color="#fbbf24" />
            <span style={{ fontSize: '0.95rem' }}>PAUSE COMPETITION</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Freezes timers and submissions</span>
          </button>

          {/* Resume */}
          <button
            onClick={() => setConfirmAction('RESUME')}
            className="btn btn-primary"
            style={{ padding: '1rem', flexDirection: 'column', gap: '0.4rem', height: '100px' }}
          >
            <RotateCcw size={24} />
            <span style={{ fontSize: '0.95rem' }}>RESUME COMPETITION</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Unfreezes paused timers</span>
          </button>

          {/* End */}
          <button
            onClick={() => setConfirmAction('END')}
            className="btn btn-danger"
            style={{ padding: '1rem', flexDirection: 'column', gap: '0.4rem', height: '100px' }}
          >
            <Square size={24} />
            <span style={{ fontSize: '0.95rem' }}>END COMPETITION</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Locks all investigations & scores</span>
          </button>

          {/* Reset */}
          <button
            onClick={() => setConfirmAction('RESET')}
            className="btn btn-secondary"
            style={{ padding: '1rem', flexDirection: 'column', gap: '0.4rem', height: '100px' }}
          >
            <RotateCcw size={24} color="var(--text-dim)" />
            <span style={{ fontSize: '0.95rem' }}>RESET ALL TEAMS</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Clears evidence & findings</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          title={`Confirm Action: ${confirmAction} COMPETITION`}
          maxWidth="500px"
          footer={
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="btn btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteControl}
                className={`btn ${confirmAction === 'END' || confirmAction === 'RESET' ? 'btn-danger' : 'btn-primary'}`}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                <span>Execute {confirmAction}</span>
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={28} color={confirmAction === 'END' || confirmAction === 'RESET' ? 'var(--rose-danger)' : 'var(--cyan-primary)'} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              Are you sure you want to <strong>{confirmAction}</strong> the competition for all registered 2-person Blue Teams?
              {confirmAction === 'RESET' && (
                <div style={{ marginTop: '0.5rem', color: '#fb7185' }}>
                  Warning: This will clear all viewed evidence links, IOC searches, findings, reports, and reset all team scores to 0.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

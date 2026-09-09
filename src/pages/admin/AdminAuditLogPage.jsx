import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import { Modal } from '../../components/Modal';
import { ScrollText, RefreshCw, Filter, Search, Loader2, Eye, Shield, Activity, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminAuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [teamCodeFilter, setTeamCodeFilter] = useState('');
  const [selectedPayload, setSelectedPayload] = useState(null);
  const toast = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (teamCodeFilter) params.team_code = teamCodeFilter.trim().toUpperCase();
      params.limit = 100;

      const data = await adminApi.getAuditLogs(params);
      setLogs(data);
    } catch (err) {
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleClearAuditLogs = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all audit logs?')) {
      return;
    }
    try {
      const res = await adminApi.clearAuditLogs();
      toast.success(res.message || 'Audit logs cleared.');
      fetchLogs();
    } catch (err) {
      toast.error(err.message || 'Failed to clear audit logs.');
    }
  };


  const actionOptions = [
    '',
    'ADMIN_LOGIN',
    'PARTICIPANT_LOGIN',
    'TEAM_CREATED',
    'TEAM_UPDATED',
    'TEAM_REASSIGNED',
    'COMPETITION_STARTED',
    'COMPETITION_PAUSED',
    'COMPETITION_RESUMED',
    'COMPETITION_ENDED',
    'COMPETITION_RESET',
    'DETECT',
    'VIEW_EVIDENCE',
    'MARK_EVIDENCE',
    'IOC_SEARCH',
    'CREATE_FINDING',
    'HINT_REQUESTED',
    'IDENTIFY',
    'RESPONSE',
    'REPORT_UPDATE',
    'REPORT_SUBMIT',
    'TAB_SWITCH',
    'EXPORT_RESULTS'
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-violet">SECURITY AUDIT TRAIL</span>
            <span className="badge badge-cyan">IMMUTABLE LOGS</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', color: '#fff' }}>Authoritative Audit Trail</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Full chronological record of administrative actions, participant submissions, and integrity events.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchLogs}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh Logs</span>
          </button>

          {logs.length > 0 && (
            <button
              onClick={handleClearAuditLogs}
              className="btn btn-secondary"
              style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              title="Permanently clear audit trail logs"
            >
              <Trash2 size={16} color="#fb7185" />
              <span>Clear Audit Logs</span>
            </button>
          )}
        </div>
      </div>


      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <form onSubmit={handleApplyFilter} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ minWidth: '220px', flex: 1 }}>
            <select
              className="form-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Action Types...</option>
              {actionOptions.filter(Boolean).map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '200px', flex: 1 }}>
            <input
              type="text"
              className="form-input mono"
              placeholder="Filter by Team Code (e.g. DX-ALPHA1)"
              value={teamCodeFilter}
              onChange={(e) => setTeamCodeFilter(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
            <Filter size={15} />
            <span>Filter</span>
          </button>
        </form>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Loader2 size={36} className="spin" color="var(--cyan-primary)" style={{ margin: '0 auto 1rem auto' }} />
          <div style={{ color: 'var(--text-muted)' }}>Querying System Audit Database...</div>
        </div>
      ) : logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <ScrollText size={40} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No audit events found.</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Events will appear as actions occur across the platform.</p>
        </div>
      ) : (
        <div className="cyber-table-container">
          <table className="cyber-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Timestamp (UTC)</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Team</th>
                <th>IP Address</th>
                <th style={{ textAlign: 'right' }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                  </td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{log.actor}</td>
                  <td>
                    <span className={`badge ${log.role === 'ADMIN' ? 'badge-violet' : 'badge-cyan'}`} style={{ fontSize: '0.65rem' }}>
                      {log.role}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{
                      fontWeight: 700,
                      color: log.action.includes('LOGIN') ? '#34d399' :
                             log.action.includes('COMPETITION') ? '#fbbf24' :
                             log.action === 'TAB_SWITCH' ? '#fb7185' : 'var(--cyan-primary)',
                      fontSize: '0.8rem'
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ color: log.team_code ? 'var(--cyan-primary)' : 'var(--text-dim)' }}>
                      {log.team_code || '—'}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedPayload(log)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payload Modal */}
      {selectedPayload && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPayload(null)}
          title={`Audit Payload: ${selectedPayload.action} (#${selectedPayload.id})`}
          maxWidth="600px"
          footer={
            <button onClick={() => setSelectedPayload(null)} className="btn btn-primary">
              Done
            </button>
          }
        >
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-dim)' }}>Actor: </span><strong style={{ color: '#fff' }}>{selectedPayload.actor}</strong></div>
              <div><span style={{ color: 'var(--text-dim)' }}>Role: </span><strong style={{ color: 'var(--cyan-primary)' }}>{selectedPayload.role}</strong></div>
              <div><span style={{ color: 'var(--text-dim)' }}>Team Code: </span><strong style={{ color: '#fff' }}>{selectedPayload.team_code || 'N/A'}</strong></div>
              <div><span style={{ color: 'var(--text-dim)' }}>Time: </span><span className="mono" style={{ color: '#fff' }}>{selectedPayload.timestamp}</span></div>
            </div>

            <div style={{
              background: '#040711',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--cyan-primary)',
              whiteSpace: 'pre-wrap',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {JSON.stringify(selectedPayload.payload, null, 2)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

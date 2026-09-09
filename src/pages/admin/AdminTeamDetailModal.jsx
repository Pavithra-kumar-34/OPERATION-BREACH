import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { adminApi } from '../../services/api';
import { Users, Award, Search, Clock, FileText, Loader2, ShieldCheck, Activity } from 'lucide-react';
import { ScoreCard } from '../../components/ScoreCard';

export const AdminTeamDetailModal = ({ isOpen, onClose, teamId }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !teamId) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await adminApi.getTeamDetail(teamId);
        setDetail(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, teamId]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} color="var(--cyan-primary)" />
          <span>Team Operations Dossier: {detail?.team.team_name || 'Loading...'}</span>
        </div>
      }
      maxWidth="850px"
      footer={
        <button onClick={onClose} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
          Close Dossier
        </button>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <Loader2 size={32} className="spin" color="var(--cyan-primary)" style={{ margin: '0 auto 1rem auto' }} />
          <div style={{ color: 'var(--text-muted)' }}>Retrieving Team State & Audit Telemetry...</div>
        </div>
      ) : !detail ? (
        <div style={{ color: 'var(--rose-danger)' }}>Could not load team dossier.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Summary Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Team Code
              </div>
              <div className="mono" style={{ color: 'var(--cyan-primary)', fontWeight: 700, fontSize: '1.1rem' }}>
                {detail.team.team_code}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Scenario Access
              </div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                All 3 Scenarios Open
              </div>
            </div>


            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Analysts
              </div>
              <div style={{ color: '#fff', fontSize: '0.85rem' }}>
                1. {detail.team.analyst_1_name}<br />
                2. {detail.team.analyst_2_name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                Current Stage & Status
              </div>
              <div style={{ marginTop: '0.2rem' }}>
                <span className="badge badge-cyan" style={{ marginRight: '0.35rem' }}>{detail.team.current_stage}</span>
                <span className="badge badge-emerald">{detail.team.status}</span>
              </div>
            </div>
          </div>

          {/* Score & Inspection Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <ScoreCard
              score={detail.team.score}
              breakdown={{
                detection: detail.score_breakdown?.detection_score || 0,
                investigation: detail.score_breakdown?.investigation_score || 0,
                analysis: detail.score_breakdown?.analysis_score || 0,
                identification: detail.score_breakdown?.identification_score || 0,
                response: detail.score_breakdown?.response_score || 0,
                evidence: detail.score_breakdown?.evidence_score || 0,
                report: detail.score_breakdown?.report_score || 0,
                efficiency: detail.score_breakdown?.efficiency_score || 0,
              }}
            />

            <div className="card">
              <h4 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '1rem' }}>Operational Telemetry</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Evidence Inspected:</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>
                    {detail.viewed_evidence_count} / {detail.total_evidence_count}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Tactical Hints Used:</span>
                  <span style={{ fontWeight: 600, color: detail.hints_used > 0 ? 'var(--amber-warning)' : '#fff' }}>
                    {detail.hints_used} / {detail.max_hints}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Documented Findings:</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>
                    {detail.findings.length}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>IOC Searches:</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>
                    {detail.ioc_searches.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity History Audit Stream */}
          <div>
            <h4 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={16} color="var(--cyan-primary)" />
              <span>Live Team Activity Stream (Last 20 Events)</span>
            </h4>

            <div style={{
              maxHeight: '220px',
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.25)'
            }}>
              {detail.recent_activity.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  No activity events recorded yet.
                </div>
              ) : (
                detail.recent_activity.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 1rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{act.action}</span>
                      <span style={{ color: '#fff' }}>{act.actor}</span>
                    </div>
                    <span className="mono" style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                      {new Date(act.time).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

import React, { useState } from 'react';
import {
  FileText,
  Mail,
  Shield,
  Activity,
  Globe,
  Terminal,
  Hash,
  Eye,
  Lock,
  Flag,
  CheckCircle2,
  XCircle,
  Copy,
  Check
} from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from '../context/ToastContext';

export const EvidenceViewer = ({ evidences = [], onView, onFlag }) => {
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const getEvidenceIcon = (type) => {
    switch (type) {
      case 'Email': return <Mail size={16} color="var(--cyan-primary)" />;
      case 'Authentication log': return <Shield size={16} color="#fbbf24" />;
      case 'Network log': return <Globe size={16} color="#60a5fa" />;
      case 'Endpoint event': return <Activity size={16} color="#c084fc" />;
      case 'Process event': return <Terminal size={16} color="#34d399" />;
      case 'File hash': return <Hash size={16} color="#fb7185" />;
      default: return <FileText size={16} color="var(--text-muted)" />;
    }
  };

  const handleOpenEvidence = (ev) => {
    if (ev.is_locked) {
      toast.warning(`Evidence ${ev.evidence_code} is locked. Inspect prerequisite ${ev.prerequisite_evidence_code} first.`);
      return;
    }
    setSelectedEvidence(ev);
    if (!ev.viewed && onView) {
      onView(ev.id);
    }
  };

  const handleCopyContent = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.info('Evidence content copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {evidences.map((ev) => (
          <div
            key={ev.id}
            onClick={() => handleOpenEvidence(ev)}
            className="card card-glow"
            style={{
              cursor: ev.is_locked ? 'not-allowed' : 'pointer',
              opacity: ev.is_locked ? 0.6 : 1,
              borderColor: ev.is_flagged_suspicious
                ? 'rgba(244, 63, 94, 0.4)'
                : ev.is_flagged_benign
                ? 'rgba(16, 185, 129, 0.4)'
                : 'var(--border-subtle)',
              position: 'relative',
              padding: '1.25rem'
            }}
          >
            {/* Top row: Code and Type */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {getEvidenceIcon(ev.evidence_type)}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan-primary)' }}>
                  {ev.evidence_code}
                </span>
              </div>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                {ev.evidence_type}
              </span>
            </div>

            {/* Title */}
            <h4 style={{ fontSize: '0.95rem', color: '#f8fafc', marginBottom: '0.75rem', lineHeight: 1.3 }}>
              {ev.title}
            </h4>

            {/* Bottom Status badges */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <div>
                {ev.is_locked ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--amber-warning)' }}>
                    <Lock size={13} /> Requires {ev.prerequisite_evidence_code}
                  </span>
                ) : ev.viewed ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--emerald-success)' }}>
                    <Eye size={13} /> Viewed {ev.viewed_by ? `by ${ev.viewed_by}` : ''}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-dim)' }}>Unopened</span>
                )}
              </div>

              <div>
                {ev.is_flagged_suspicious && <span className="badge badge-rose">Suspicious</span>}
                {ev.is_flagged_benign && <span className="badge badge-emerald">Benign</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Evidence Detail Modal */}
      {selectedEvidence && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvidence(null)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {getEvidenceIcon(selectedEvidence.evidence_type)}
              <span>{selectedEvidence.evidence_code}: {selectedEvidence.title}</span>
            </div>
          }
          maxWidth="750px"
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              {/* Classification flags */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => onFlag(selectedEvidence.id, 'suspicious')}
                  className={`btn ${selectedEvidence.is_flagged_suspicious ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <Flag size={14} />
                  <span>Flag Suspicious</span>
                </button>
                <button
                  onClick={() => onFlag(selectedEvidence.id, 'benign')}
                  className={`btn ${selectedEvidence.is_flagged_benign ? 'btn-emerald' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <CheckCircle2 size={14} />
                  <span>Flag Benign</span>
                </button>
                <button
                  onClick={() => onFlag(selectedEvidence.id, 'clear')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                >
                  <span>Clear Flag</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedEvidence(null)}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          }
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className="badge badge-cyan">{selectedEvidence.evidence_type}</span>
              <button
                onClick={() => handleCopyContent(selectedEvidence.content)}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              >
                {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy Telemetry'}</span>
              </button>
            </div>

            {/* Code / Log Display */}
            <div style={{
              background: '#040711',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {selectedEvidence.content}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Lightbulb, AlertTriangle, Loader2 } from 'lucide-react';
import { operationApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export const HintModal = ({ isOpen, onClose, hintsUsed = 0, maxHints = 3, onHintReceived }) => {
  const [loading, setLoading] = useState(false);
  const [currentHint, setCurrentHint] = useState(null);
  const toast = useToast();

  const handleRequestHint = async () => {
    if (hintsUsed >= maxHints) {
      toast.warning('Maximum hints limit reached for this operation.');
      return;
    }

    setLoading(true);
    try {
      const data = await operationApi.requestHint();
      setCurrentHint(data.hint);
      toast.info(`Hint #${data.hints_used} unlocked (-25 pts efficiency penalty applied).`);
      if (onHintReceived) onHintReceived(data);
    } catch (err) {
      toast.error(err.message || 'Failed to request hint.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentHint(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lightbulb size={20} color="var(--amber-warning)" />
          <span>Tactical SOC Hint System ({hintsUsed}/{maxHints})</span>
        </div>
      }
      maxWidth="550px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button onClick={handleClose} className="btn btn-secondary">
            Close
          </button>
          {!currentHint && hintsUsed < maxHints && (
            <button
              onClick={handleRequestHint}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Lightbulb size={16} />}
              <span>Request Hint (-25 PTS)</span>
            </button>
          )}
        </div>
      }
    >
      <div>
        {/* Warning Callout */}
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}>
          <AlertTriangle size={20} color="var(--amber-warning)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
            <strong>Scoring Efficiency Impact:</strong> Requesting a hint assists your team with investigative telemetry guidance, but applies an authoritative deduction of <strong>-25 points</strong> per hint. Maximum available: {maxHints}.
          </div>
        </div>

        {/* Current Hint Display */}
        {currentHint ? (
          <div style={{
            padding: '1.25rem',
            background: 'rgba(0, 240, 255, 0.05)',
            border: '1px solid var(--border-glow)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Tactical Intel Guidance #{hintsUsed + 1}
            </div>
            <div style={{ fontSize: '0.95rem', color: '#fff', lineHeight: 1.5 }}>
              {currentHint}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {hintsUsed >= maxHints ? (
              <span style={{ color: 'var(--rose-danger)' }}>All available hints have been used for this operation.</span>
            ) : (
              <span>Click "Request Hint" below to reveal the next guidance indicator.</span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

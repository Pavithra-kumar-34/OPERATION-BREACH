import React, { useState } from 'react';
import { Modal } from './Modal';
import { PlusCircle, FileText, Check, Loader2 } from 'lucide-react';
import { operationApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export const FindingModal = ({ isOpen, onClose, evidences = [], onFindingAdded }) => {
  const [description, setDescription] = useState('');
  const [selectedEvIds, setSelectedEvIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const toggleEvidence = (id) => {
    setSelectedEvIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!description.trim()) {
      toast.warning('Please enter a description for this finding.');
      return;
    }

    setSubmitting(true);
    try {
      const finding = await operationApi.createFinding(description.trim(), selectedEvIds);
      toast.success('Investigation Finding successfully recorded!');
      setDescription('');
      setSelectedEvIds([]);
      if (onFindingAdded) onFindingAdded(finding);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create finding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={20} color="var(--cyan-primary)" />
          <span>Record Evidence-Backed Finding</span>
        </div>
      }
      maxWidth="600px"
      footer={
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={submitting}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting || !description.trim()}>
            {submitting ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />}
            <span>Save Finding (+15 pts)</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            <span>Finding Observation & Hypothesis</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Required</span>
          </label>
          <textarea
            className="form-textarea"
            rows="4"
            placeholder="Describe the malicious indicator, LOLBIN execution, or anomalous network behavior observed..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <span>Link Corroborating Evidence</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Optional</span>
          </label>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            maxHeight: '140px',
            overflowY: 'auto',
            padding: '0.5rem',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            {evidences.map((ev) => {
              const isSelected = selectedEvIds.includes(ev.id);
              return (
                <button
                  type="button"
                  key={ev.id}
                  onClick={() => toggleEvidence(ev.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                    color: isSelected ? 'var(--cyan-primary)' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer'
                  }}
                >
                  {isSelected && <Check size={12} />}
                  <span>{ev.evidence_code}</span>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
};

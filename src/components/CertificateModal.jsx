import React from 'react';
import { Modal } from './Modal';
import { Award, Printer, Shield, CheckCircle2 } from 'lucide-react';

export const CertificateModal = ({ isOpen, onClose, certificateData }) => {
  if (!certificateData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Blue Team Training Platform Official Certification (Afternoon Event)"
      maxWidth="850px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer size={16} />
            <span>Print Certificate</span>
          </button>
        </div>
      }
    >
      <div
        id="certificate-print-area"
        style={{
          background: 'linear-gradient(135deg, #070e1e 0%, #0d1b38 100%)',
          border: '4px double #00f0ff',
          borderRadius: '16px',
          padding: '3rem 2.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 50px rgba(0, 240, 255, 0.15)'
        }}
      >
        {/* Subtle Watermark Badge */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.03,
          pointerEvents: 'none'
        }}>
          <Shield size={450} color="#00f0ff" />
        </div>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cyan-primary)', marginBottom: '0.5rem' }}>
            <Shield size={32} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.1em' }}>
              DEFENDX TRAINING PLATFORM - AFTERNOON EVENT
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Certificate of Blue Team Mastery & Operational Readiness
          </div>
        </div>


        <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          This is to officially certify that
        </div>

        {/* Recipient Name */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.5rem',
          fontWeight: 800,
          color: '#fff',
          textShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
          borderBottom: '2px solid rgba(0, 240, 255, 0.3)',
          display: 'inline-block',
          padding: '0.25rem 2rem',
          marginBottom: '1.5rem'
        }}>
          {certificateData.analyst_name}
        </div>

        <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
          has successfully fulfilled all 14 rigorous curriculum modules covering SOC Operations, Network Investigation, Incident Triage, MITRE ATT&CK Mapping, and Live Cyber Operations.
        </div>

        {/* Metadata Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'flex-end',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '1.5rem',
          marginTop: '1.5rem'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Issue Date
            </div>
            <div style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600, marginTop: '2px' }}>
              {certificateData.issue_date}
            </div>
          </div>

          {/* Seal */}
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            border: '2px dashed var(--cyan-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 240, 255, 0.05)'
          }}>
            <Award size={36} color="var(--cyan-primary)" />
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Verification ID
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--cyan-primary)', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {certificateData.certificate_id}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

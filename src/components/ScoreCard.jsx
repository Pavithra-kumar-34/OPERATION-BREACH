import React from 'react';
import { Award, Zap, Shield, Search, CheckCircle, FileText, AlertCircle } from 'lucide-react';

export const ScoreCard = ({ score = 0, breakdown = {} }) => {
  const categories = [
    { key: 'detection', label: 'Detection', max: 100, val: breakdown.detection || 0, icon: Shield },
    { key: 'investigation', label: 'Investigation', max: 200, val: breakdown.investigation || 0, icon: Search },
    { key: 'analysis', label: 'Analysis', max: 150, val: breakdown.analysis || 0, icon: Zap },
    { key: 'identification', label: 'Identification', max: 150, val: breakdown.identification || 0, icon: CheckCircle },
    { key: 'response', label: 'Response', max: 200, val: breakdown.response || 0, icon: Shield },
    { key: 'evidence', label: 'Evidence Chain', max: 100, val: breakdown.evidence || 0, icon: Search },
    { key: 'report', label: 'Incident Report', max: 100, val: breakdown.report || 0, icon: FileText },
  ];

  const efficiency = breakdown.efficiency || 0;

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={20} color="var(--cyan-primary)" />
          <h4 style={{ fontSize: '1rem', color: '#fff' }}>Score Overview</h4>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
            {Math.round(score)}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}> / 1000 PTS</span>
        </div>
      </div>

      {/* Main Score Bar */}
      <div className="progress-bar-bg" style={{ height: '10px', marginBottom: '1.25rem' }}>
        <div className="progress-bar-fill" style={{ width: `${Math.min(100, (score / 1000) * 100)}%` }} />
      </div>

      {/* Category Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {categories.map((cat) => {
          const pct = Math.min(100, (cat.val / cat.max) * 100);
          return (
            <div key={cat.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{cat.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#f1f5f9' }}>
                  {Math.round(cat.val)} / {cat.max}
                </span>
              </div>
              <div className="progress-bar-bg" style={{ height: '5px' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '9999px',
                    background: pct >= 80 ? 'var(--emerald-success)' : pct >= 40 ? 'var(--cyan-primary)' : 'rgba(255, 255, 255, 0.2)',
                    width: `${pct}%`,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Efficiency / Hints Penalty */}
        {efficiency !== 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.4rem 0.6rem',
            background: 'rgba(244, 63, 94, 0.1)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(244, 63, 94, 0.25)',
            marginTop: '0.4rem',
            fontSize: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fb7185' }}>
              <AlertCircle size={14} />
              <span>Hint & Efficiency Adjustments:</span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fb7185' }}>
              {efficiency > 0 ? `+${efficiency}` : efficiency} PTS
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

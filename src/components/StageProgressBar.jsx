import React from 'react';
import { ShieldAlert, Search, LineChart, Target, ShieldCheck, FileCheck, Check } from 'lucide-react';

export const StageProgressBar = ({ currentStage, completedStages = [], isCompleted = false }) => {
  const stages = [
    { id: 'DETECT', label: '1. Detect', icon: ShieldAlert },
    { id: 'INVESTIGATE', label: '2. Investigate', icon: Search },
    { id: 'ANALYZE', label: '3. Analyze', icon: LineChart },
    { id: 'IDENTIFY', label: '4. Identify', icon: Target },
    { id: 'RESPOND', label: '5. Respond', icon: ShieldCheck },
    { id: 'REPORT', label: '6. Report', icon: FileCheck },
  ];

  return (
    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        gap: '0.5rem'
      }}>
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = isCompleted || completedStages.includes(stage.id);
          const isCurrent = !isCompleted && currentStage === stage.id;
          const isLocked = !isDone && !isCurrent;

          return (
            <React.Fragment key={stage.id}>
              {/* Connector line */}
              {idx > 0 && (
                <div style={{
                  flex: 1,
                  height: '2px',
                  background: isDone
                    ? 'var(--emerald-success)'
                    : isCurrent
                    ? 'linear-gradient(90deg, var(--emerald-success), var(--cyan-primary))'
                    : 'rgba(255, 255, 255, 0.08)',
                  transition: 'background 0.3s ease'
                }} />
              )}

              {/* Stage Node */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
                zIndex: 2
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDone
                    ? 'rgba(16, 185, 129, 0.2)'
                    : isCurrent
                    ? 'rgba(0, 240, 255, 0.2)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: '2px solid',
                  borderColor: isDone
                    ? 'var(--emerald-success)'
                    : isCurrent
                    ? 'var(--cyan-primary)'
                    : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isCurrent ? '0 0 15px rgba(0, 240, 255, 0.4)' : 'none',
                  color: isDone ? 'var(--emerald-success)' : isCurrent ? 'var(--cyan-primary)' : 'var(--text-dim)',
                  transition: 'all 0.3s ease'
                }}>
                  {isDone ? <Check size={18} /> : <Icon size={16} />}
                </div>

                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: isCurrent ? 700 : 500,
                  fontFamily: 'var(--font-display)',
                  color: isDone ? '#6ee7b7' : isCurrent ? 'var(--cyan-primary)' : 'var(--text-dim)',
                  whiteSpace: 'nowrap'
                }}>
                  {stage.label}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

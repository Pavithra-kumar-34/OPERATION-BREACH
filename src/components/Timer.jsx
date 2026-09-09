import React, { useState, useEffect } from 'react';
import { Clock, PauseCircle, Lock, CheckCircle2 } from 'lucide-react';

export const Timer = ({ initialSeconds = 3600, status = 'ACTIVE' }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (status !== 'ACTIVE' || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, secondsLeft]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const isLow = secondsLeft <= 600 && secondsLeft > 300;
  const isCritical = secondsLeft <= 300;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 1rem',
      borderRadius: 'var(--radius-md)',
      background: status === 'PAUSED'
        ? 'rgba(245, 158, 11, 0.1)'
        : status === 'LOCKED'
        ? 'rgba(0, 240, 255, 0.08)'
        : isCritical
        ? 'rgba(244, 63, 94, 0.15)'
        : 'rgba(0, 0, 0, 0.3)',
      border: '1px solid',
      borderColor: status === 'PAUSED'
        ? 'rgba(245, 158, 11, 0.4)'
        : status === 'LOCKED'
        ? 'rgba(0, 240, 255, 0.3)'
        : isCritical
        ? 'var(--rose-danger)'
        : isLow
        ? 'var(--amber-warning)'
        : 'var(--border-subtle)',
      boxShadow: isCritical ? '0 0 15px rgba(244, 63, 94, 0.3)' : 'none'
    }}>
      {status === 'PAUSED' ? (
        <PauseCircle size={18} color="var(--amber-warning)" />
      ) : status === 'LOCKED' ? (
        <Lock size={18} color="var(--cyan-primary)" />
      ) : status === 'COMPLETED' ? (
        <CheckCircle2 size={18} color="var(--emerald-success)" />
      ) : (
        <Clock size={18} color={isCritical ? 'var(--rose-danger)' : isLow ? 'var(--amber-warning)' : 'var(--cyan-primary)'} />
      )}

      <div>
        <div style={{
          fontSize: '0.65rem',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-dim)'
        }}>
          {status === 'PAUSED' ? 'Operation Paused' : status === 'LOCKED' ? 'Timer Locked' : status === 'COMPLETED' ? 'Operation Ended' : 'Time Remaining'}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.2rem',
          fontWeight: 700,
          color: isCritical ? '#fb7185' : isLow ? '#fbbf24' : '#fff'
        }}>
          {formatTime(secondsLeft)}
        </div>
      </div>
    </div>
  );
};

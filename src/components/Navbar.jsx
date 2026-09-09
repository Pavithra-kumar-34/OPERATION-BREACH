import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Radio, Server, LogOut, User } from 'lucide-react';
import { teamSocket } from '../services/websocket';

export const Navbar = () => {
  const { user, isAdmin, isAnalyst, logout, serverStatus } = useAuth();
  const [realtimeStatus, setRealtimeStatus] = useState('REALTIME OFFLINE');

  useEffect(() => {
    const unsub = teamSocket.onStatusChange((status) => {
      setRealtimeStatus(status);
    });
    return unsub;
  }, []);

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.85rem 2rem',
      background: 'rgba(13, 21, 39, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          textDecoration: 'none'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
            border: '1px solid var(--cyan-primary)',
            borderRadius: '10px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)'
          }}>
            <Shield size={22} color="var(--cyan-primary)" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              background: 'linear-gradient(90deg, #fff 30%, var(--cyan-primary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              DEFENDX
            </div>
            <div style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
              {isAdmin ? 'Admin Console' : 'Blue Team Training Platform (Afternoon Event) & SOC Operations'}
            </div>
          </div>
        </div>


        {/* Role Badge */}
        {isAdmin && <span className="badge badge-violet">ADMINISTRATOR</span>}
        {isAnalyst && <span className="badge badge-cyan">BLUE TEAM ANALYST</span>}
      </div>

      {/* Status Indicators & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Server Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)'
        }}>
          <span className={`pulse-dot ${serverStatus === 'CONNECTED' ? 'online' : 'offline'}`}></span>
          <span style={{ color: serverStatus === 'CONNECTED' ? '#34d399' : '#fb7185' }}>
            {serverStatus === 'CONNECTED' ? 'SERVER CONNECTED' : 'SERVER OFFLINE'}
          </span>
        </div>

        {/* WebSocket Realtime Status (if Analyst) */}
        {isAnalyst && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)'
          }}>
            <span className={`pulse-dot ${realtimeStatus === 'REALTIME LIVE' ? 'live' : 'offline'}`}></span>
            <span style={{ color: realtimeStatus === 'REALTIME LIVE' ? 'var(--cyan-primary)' : 'var(--text-dim)' }}>
              {realtimeStatus}
            </span>
          </div>
        )}

        {/* User Identity & Logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--cyan-primary), var(--violet-primary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#070b14',
                fontWeight: 'bold',
                fontSize: '0.75rem'
              }}>
                {user.analyst_name ? user.analyst_name.charAt(0) : 'A'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
                  {user.analyst_name || user.email}
                </div>
                {user.team_code && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
                    {user.team_name} ({user.team_code})
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

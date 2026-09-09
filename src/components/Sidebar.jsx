import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  GraduationCap,
  Crosshair,
  Trophy,
  Sliders,
  Users,
  BarChart3,
  ScrollText,
  LogOut,
  ShieldAlert,
  Award
} from 'lucide-react';

export const Sidebar = ({ currentRoute, onRouteChange }) => {
  const { user, isAdmin, isAnalyst, logout } = useAuth();

  const participantNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'academy', label: 'Training Platform', icon: GraduationCap },
    { id: 'operation', label: 'Operation', icon: Crosshair, badge: 'Live' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];


  const adminNav = [
    { id: 'control', label: 'Control Center', icon: Sliders },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
  ];

  const navItems = isAdmin ? adminNav : participantNav;

  return (
    <aside style={{
      width: '240px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.5rem 1rem',
      flexShrink: 0
    }}>
      <div>
        {/* Sidebar Header Title */}
        <div style={{
          padding: '0 0.75rem 1.25rem 0.75rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            {isAdmin ? 'Management' : 'Analyst Workspace'}
          </div>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#f8fafc',
            marginTop: '0.2rem'
          }}>
            {isAdmin ? 'DEFENDX Core' : 'Blue Team Station'}
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onRouteChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(0, 240, 255, 0.15) 0%, rgba(0, 240, 255, 0.03) 100%)'
                    : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? 'rgba(0, 240, 255, 0.3)' : 'transparent',
                  color: isActive ? 'var(--cyan-primary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} color={isActive ? 'var(--cyan-primary)' : 'currentColor'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '9999px',
                    background: 'rgba(0, 240, 255, 0.15)',
                    color: 'var(--cyan-primary)',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile / Quick Info */}
      <div style={{
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        <div style={{
          padding: '0.75rem',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.75rem'
        }}>
          <div style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
            Active Session
          </div>
          <div style={{ color: '#fff', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.analyst_name || user?.email}
          </div>
          <div style={{ color: 'var(--cyan-primary)', fontSize: '0.7rem', marginTop: '2px' }}>
            Role: {user?.role}
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{
            width: '100%',
            justifyContent: 'center',
            fontSize: '0.8rem',
            padding: '0.5rem'
          }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

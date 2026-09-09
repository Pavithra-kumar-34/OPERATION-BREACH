import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, KeyRound, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('PARTICIPANT'); // Default to Blue Team Analyst Login
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [analystName, setAnalystName] = useState('');
  const [teamCode, setTeamCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { loginAdmin, loginParticipant, serverStatus } = useAuth();
  const toast = useToast();

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!adminEmail.trim() || !adminPassword) {
      setErrorMessage('Please provide both Administrator Email and Password.');
      return;
    }

    setLoading(true);
    try {
      await loginAdmin(adminEmail.trim(), adminPassword);
      toast.success('Administrator authenticated successfully.');
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipantSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!analystName.trim() || !teamCode.trim()) {
      setErrorMessage('Please enter both your Analyst Name and 2-Person Team Code.');
      return;
    }

    setLoading(true);
    try {
      await loginParticipant(analystName.trim(), teamCode.trim());
      toast.success('Welcome to DEFENDX Blue Team Command Station.');
    } catch (err) {
      setErrorMessage(err.message || 'Unable to join operation. Verify Team Code and registered analyst name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(13, 21, 39, 0.9)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 240, 255, 0.15)'
      }}>
        {/* Platform Identity */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 1rem auto',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
            border: '1px solid var(--cyan-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(0, 240, 255, 0.3)'
          }}>
            <Shield size={34} color="var(--cyan-primary)" />
          </div>

          <h1 style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            background: 'linear-gradient(90deg, #fff 40%, var(--cyan-primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem'
          }}>
            DEFENDX
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            BLUE TEAM TRAINING PLATFORM FOR THE AFTERNOON EVENT & SOC OPERATIONS
          </p>
        </div>

        {/* Server Status Ribbon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem'
        }}>
          <span className={`pulse-dot ${serverStatus === 'CONNECTED' ? 'online' : 'offline'}`}></span>
          <span style={{ color: serverStatus === 'CONNECTED' ? '#34d399' : '#fb7185' }}>
            {serverStatus === 'CONNECTED' ? 'DEFENDX SERVER CONNECTED' : 'SERVER OFFLINE (PORT 8000)'}
          </span>
        </div>

        {/* Tabs */}
        <div className="tabs-nav" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'PARTICIPANT' ? 'active' : ''}`}
            onClick={() => { setActiveTab('PARTICIPANT'); setErrorMessage(''); }}
          >
            BLUE TEAM ANALYST
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'ADMIN' ? 'active' : ''}`}
            onClick={() => { setActiveTab('ADMIN'); setErrorMessage(''); }}
          >
            ADMINISTRATOR
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid var(--rose-danger)',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#fecdd3'
          }}>
            <AlertCircle size={18} color="var(--rose-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Participant Login Form */}
        {activeTab === 'PARTICIPANT' && (
          <form onSubmit={handleParticipantSubmit} autoComplete="off">
            <div className="form-group">
              <label className="form-label">
                <span>Analyst Name</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="defendx_analyst_name"
                  id="defendx_analyst_name"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="form-input"
                  placeholder="Enter analyst name"
                  value={analystName}
                  onChange={(e) => setAnalystName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Team Access Code</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="defendx_team_code"
                  id="defendx_team_code"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="form-input mono"
                  placeholder="Enter team access code (e.g. DX-XXXXXX)"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Validating Team...</span>
                </>
              ) : (
                <>
                  <User size={18} />
                  <span>Join Command Station</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Admin Login Form */}
        {activeTab === 'ADMIN' && (
          <form onSubmit={handleAdminSubmit} autoComplete="off">
            <div className="form-group">
              <label className="form-label">
                <span>Administrator Email</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="defendx_admin_user_field"
                  id="defendx_admin_user_field"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="form-input"
                  placeholder="Enter administrator email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Administrator Password</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  name="defendx_admin_pass_field"
                  id="defendx_admin_pass_field"
                  autoComplete="new-password"
                  className="form-input"
                  placeholder="Enter administrator password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>



            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Enter DefendX Console</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

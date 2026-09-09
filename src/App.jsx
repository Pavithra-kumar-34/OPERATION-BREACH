import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { Loader2, Shield } from 'lucide-react';

// Participant Pages
import { ParticipantDashboard } from './pages/participant/ParticipantDashboard';
import { AcademyPage } from './pages/participant/AcademyPage';
import { OperationPage } from './pages/participant/OperationPage';
import { ParticipantLeaderboard } from './pages/participant/ParticipantLeaderboard';

// Admin Pages
import { AdminControlCenter } from './pages/admin/AdminControlCenter';
import { AdminTeamsPage } from './pages/admin/AdminTeamsPage';
import { AdminLeaderboardPage } from './pages/admin/AdminLeaderboardPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage';

export default function App() {
  const { user, loading, isAdmin, isAnalyst } = useAuth();
  const [currentRoute, setCurrentRoute] = useState('dashboard');

  // Reset route when user role changes
  useEffect(() => {
    if (isAdmin) {
      setCurrentRoute('control');
    } else if (isAnalyst) {
      setCurrentRoute('dashboard');
    }
  }, [isAdmin, isAnalyst]);

  // Loading state while verifying token & server health
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-main)',
        gap: '1.25rem'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
          border: '1px solid var(--cyan-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.25)'
        }}>
          <Shield size={30} color="var(--cyan-primary)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#f1f5f9' }}>
          <Loader2 size={20} className="spin" color="var(--cyan-primary)" />
          <span>INITIALIZING DEFENDX CORE PLATFORM...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Page
  if (!user) {
    return (
      <>
        <ToastContainer />
        <LoginPage />
      </>
    );
  }

  // Render Admin View
  const renderAdminContent = () => {
    switch (currentRoute) {
      case 'control':
        return <AdminControlCenter onNavigate={setCurrentRoute} />;
      case 'teams':
        return <AdminTeamsPage />;
      case 'leaderboard':
        return <AdminLeaderboardPage />;
      case 'analytics':
        return <AdminAnalyticsPage />;
      case 'audit':
        return <AdminAuditLogPage />;
      default:
        return <AdminControlCenter onNavigate={setCurrentRoute} />;
    }
  };

  // Render Participant (Analyst) View
  const renderParticipantContent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <ParticipantDashboard onNavigate={setCurrentRoute} />;
      case 'academy':
        return <AcademyPage />;
      case 'operation':
        return <OperationPage />;
      case 'leaderboard':
        return <ParticipantLeaderboard />;
      default:
        return <ParticipantDashboard onNavigate={setCurrentRoute} />;
    }
  };

  return (
    <div className="app-root">
      <ToastContainer />
      <Navbar />
      <div className="app-layout">
        <Sidebar currentRoute={currentRoute} onRouteChange={setCurrentRoute} />
        <main className="main-content">
          {isAdmin ? renderAdminContent() : renderParticipantContent()}
        </main>
      </div>
    </div>
  );
}

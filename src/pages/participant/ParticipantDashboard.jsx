import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { operationApi, academyApi, scenariosApi } from '../../services/api';
import { ScoreCard } from '../../components/ScoreCard';
import { Timer } from '../../components/Timer';
import { CertificateModal } from '../../components/CertificateModal';
import {
  Users,
  Shield,
  GraduationCap,
  Crosshair,
  CheckSquare,
  Square,
  Award,
  ArrowRight,
  Clock,
  AlertCircle,
  Sparkles,
  Lock,
  Play,
  Layers
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ParticipantDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [opStatus, setOpStatus] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [certificateData, setCertificateData] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [opData, recData, scenData] = await Promise.all([
          operationApi.getStatus().catch(() => null),
          academyApi.getRecommendations().catch(() => null),
          scenariosApi.getScenarios().catch(() => [])
        ]);
        setOpStatus(opData);
        setRecommendations(recData);
        setScenarios(scenData);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleOpenCertificate = async () => {
    try {
      const data = await academyApi.getCertificate();
      setCertificateData(data);
      setShowCertModal(true);
    } catch (err) {
      toast.error('Could not load certificate data.');
    }
  };

  const handleSelectScenarioAndNavigate = async (scenarioId) => {
    try {
      await operationApi.switchScenario(scenarioId);
      onNavigate('operation');
    } catch (err) {
      onNavigate('operation');
    }
  };

  const checklistItems = [
    { title: 'SOC Fundamentals & Tier Escalation', completed: (recommendations?.completed_modules || 0) >= 1 },
    { title: 'Alert Triage & False Positive Reduction', completed: (recommendations?.completed_modules || 0) >= 10 },
    { title: 'Log Analysis & Sysmon Correlation', completed: (recommendations?.completed_modules || 0) >= 2 },
    { title: 'IOC Investigation & Threat Intel Correlation', completed: (recommendations?.completed_modules || 0) >= 5 },
    { title: 'Incident Response Lifecycle & Containment', completed: (recommendations?.completed_modules || 0) >= 8 },
  ];

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.9) 0%, rgba(19, 30, 54, 0.9) 100%)',
        border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-cyan">COMMAND STATION ACTIVE</span>
            <span className="badge badge-violet">2-PERSON SQUADRON</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', color: '#fff', marginBottom: '0.4rem' }}>
            Welcome, Analyst {user?.analyst_name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '650px' }}>
            Stand ready for high-stakes defensive operations. Train in the DEFENDX Training Platform for the afternoon event to master forensic telemetry, then coordinate with your partner to investigate live security incidents.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate('academy')}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.25rem' }}
          >
            <GraduationCap size={18} color="var(--cyan-primary)" />
            <span>Training Platform</span>
          </button>

          <button
            onClick={() => onNavigate('operation')}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.25rem' }}
          >
            <Crosshair size={18} />
            <span>Live Operations</span>
          </button>
        </div>
      </div>

      {/* Grid: Left 2 columns, Right 1 column */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* 1. Team & Operation Status Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--cyan-primary)" />
              <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>2-Person Team Details</h3>
            </div>
            <span className={`badge ${
              opStatus?.status === 'ACTIVE' ? 'badge-emerald' :
              opStatus?.status === 'PAUSED' ? 'badge-amber' :
              opStatus?.status === 'COMPLETED' ? 'badge-violet' : 'badge-cyan'
            }`}>
              {opStatus?.status || 'LOCKED'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Team Name:</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>{user?.team_name || '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Team Code:</span>
              <span className="mono" style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>{user?.team_code || '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Partner Analyst:</span>
              <span style={{ color: '#fff' }}>
                {opStatus ? (opStatus.analyst_1 === user?.analyst_name ? opStatus.analyst_2 : opStatus.analyst_1) : '—'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Scenario Access:</span>
              <span style={{ color: 'var(--cyan-primary)', fontWeight: 600, textAlign: 'right' }}>All 3 Scenarios Open</span>
            </div>


            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Current Operation Stage:</span>
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                {opStatus?.current_stage || 'DETECT'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Training Platform Progress & Next Step Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={20} color="var(--violet-primary)" />
              <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Afternoon Event Training Progress</h3>
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--violet-primary)', fontFamily: 'var(--font-mono)' }}>
              {recommendations?.overall_progress || 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-bar-bg" style={{ marginBottom: '1.25rem' }}>
            <div className="progress-bar-fill" style={{ width: `${recommendations?.overall_progress || 0}%` }} />
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Completed <strong>{recommendations?.completed_modules || 0}</strong> of <strong>{recommendations?.total_modules || 14}</strong> certified training modules for the afternoon event.
          </div>

          {/* Next Step Box */}
          {recommendations?.current_next_step && (
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid var(--border-violet)',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--violet-primary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700, marginBottom: '0.2rem' }}>
                Recommended Next Step
              </div>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                Module #{recommendations.current_next_step.module_number}: {recommendations.current_next_step.title}
              </div>
            </div>
          )}

          {/* Certificate Button if Completed */}
          {recommendations?.is_certified ? (
            <button
              onClick={handleOpenCertificate}
              className="btn btn-violet"
              style={{ width: '100%', padding: '0.65rem' }}
            >
              <Award size={16} />
              <span>View Official Certificate</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('academy')}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.65rem' }}
            >
              <span>Continue Training Modules</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* 3. Live Score Overview */}
        <ScoreCard
          score={opStatus?.total_score || 0}
          breakdown={opStatus?.score_breakdown || {}}
        />
      </div>

      {/* Afternoon Event Incident Scenarios Section - All Teams Can Attend All */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} color="var(--cyan-primary)" />
              <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Afternoon Event Incident Scenarios</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              All teams can attend and solve all scenario questions! Choose any incident to investigate:
            </p>
          </div>
          <span className="badge badge-cyan">{scenarios.length} SCENARIOS OPEN TO ALL SQUADS</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {scenarios.map((scen, idx) => (
            <div
              key={scen.id}
              style={{
                background: opStatus?.scenario_id === scen.id ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: '1px solid',
                borderColor: opStatus?.scenario_id === scen.id ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="badge badge-violet" style={{ fontSize: '0.7rem' }}>SCENARIO #{idx + 1}</span>
                  <span className={`badge ${scen.difficulty === 'Hard' ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                    {scen.difficulty}
                  </span>
                </div>
                <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem' }}>{scen.name}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>{scen.description}</p>
              </div>

              <button
                onClick={() => handleSelectScenarioAndNavigate(scen.id)}
                className={`btn ${opStatus?.scenario_id === scen.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
              >
                <Crosshair size={15} />
                <span>{opStatus?.scenario_id === scen.id ? 'Currently Attending' : 'Attend This Scenario'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>


      {/* Readiness Checklist */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={20} color="var(--emerald-success)" />
            <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Blue Team Operational Readiness Checklist</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Pre-Operation Verification
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                background: item.completed ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                border: '1px solid',
                borderColor: item.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'
              }}
            >
              {item.completed ? (
                <CheckSquare size={18} color="var(--emerald-success)" />
              ) : (
                <Square size={18} color="var(--text-dim)" />
              )}
              <span style={{
                fontSize: '0.85rem',
                color: item.completed ? '#f1f5f9' : 'var(--text-muted)',
                fontWeight: item.completed ? 600 : 400
              }}>
                {item.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        certificateData={certificateData}
      />
    </div>
  );
};

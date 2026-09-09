import React, { useState, useEffect } from 'react';
import { academyApi } from '../../services/api';
import { AcademyModuleDetail } from './AcademyModuleDetail';
import { CertificateModal } from '../../components/CertificateModal';
import {
  GraduationCap,
  BookOpen,
  Search,
  Award,
  CheckCircle2,
  Lock,
  ArrowRight,
  Shield,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AcademyPage = () => {
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [certificateData, setCertificateData] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const toast = useToast();

  const fetchModulesAndProgress = async () => {
    try {
      const [modData, recData] = await Promise.all([
        academyApi.getModules(),
        academyApi.getRecommendations()
      ]);
      setModules(modData);
      setRecommendations(recData);
    } catch (err) {
      toast.error(err.message || 'Failed to load training platform curriculum.');
    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModulesAndProgress();
  }, []);

  const handleOpenCertificate = async () => {
    try {
      const data = await academyApi.getCertificate();
      setCertificateData(data);
      setShowCertModal(true);
    } catch (err) {
      toast.error('Could not load certificate.');
    }
  };

  if (selectedModuleId) {
    return (
      <AcademyModuleDetail
        moduleId={selectedModuleId}
        onBack={() => {
          setSelectedModuleId(null);
          fetchModulesAndProgress();
        }}
        onComplete={() => {
          fetchModulesAndProgress();
        }}
      />
    );
  }

  const categories = ['ALL', 'SOC Operations', 'Detection & Forensics', 'Network Defense', 'Endpoint Security', 'Threat Intelligence', 'Email Security', 'Digital Forensics', 'Incident Response'];

  const filteredModules = modules.filter((m) => {
    const matchesCat = selectedCategory === 'ALL' || m.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="page-container">
      {/* Academy Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.9) 0%, rgba(26, 16, 48, 0.9) 100%)',
        border: '1px solid var(--border-violet)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-violet">DEFENDX TRAINING PLATFORM</span>
            <span className="badge badge-cyan">AFTERNOON EVENT PREP (14 MODULES)</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', color: '#fff', marginBottom: '0.4rem' }}>
            Blue Team Defense Training Platform
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '650px' }}>
            Interactive cybersecurity training modules designed for the afternoon event to take you from foundational SOC log correlation to advanced memory forensics, threat intelligence mapping, and incident containment.
          </p>
        </div>


        <div style={{
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-subtle)',
          minWidth: '240px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Curriculum Completion
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--violet-primary)', fontFamily: 'var(--font-mono)' }}>
            {recommendations?.overall_progress || 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {recommendations?.completed_modules || 0} / {recommendations?.total_modules || 14} Modules Passed
          </div>

          {recommendations?.is_certified ? (
            <button
              onClick={handleOpenCertificate}
              className="btn btn-violet"
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem' }}
            >
              <Award size={16} />
              <span>View Certificate</span>
            </button>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Complete all modules to unlock Official Certificate
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search modules, topics, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Category Pill Filters */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {categories.slice(0, 5).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: selectedCategory === cat ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                background: selectedCategory === cat ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: selectedCategory === cat ? 'var(--cyan-primary)' : 'var(--text-muted)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontWeight: selectedCategory === cat ? 600 : 400
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Loader2 size={36} className="spin" color="var(--cyan-primary)" style={{ margin: '0 auto 1rem auto' }} />
          <div style={{ color: 'var(--text-muted)' }}>Loading Training Platform Modules...</div>
        </div>
      ) : filteredModules.length === 0 ? (

        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BookOpen size={40} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No modules match your search.</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Try clearing your filters or search keywords.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredModules.map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedModuleId(m.id)}
              className="card card-glow"
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderColor: m.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="badge badge-cyan">MODULE #{m.module_number}</span>
                  <span className="badge badge-violet" style={{ fontSize: '0.65rem' }}>{m.category}</span>
                </div>

                <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  {m.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {m.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.8rem'
              }}>
                <div>
                  {m.completed ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--emerald-success)', fontWeight: 600 }}>
                      <CheckCircle2 size={15} /> Passed ({m.quiz_score}%)
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-dim)' }}>
                      Difficulty: {m.difficulty}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--cyan-primary)', fontWeight: 600 }}>
                  <span>{m.completed ? 'Review' : 'Start Module'}</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        certificateData={certificateData}
      />
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { operationApi, scenariosApi } from '../../services/api';
import { teamSocket } from '../../services/websocket';
import { Timer } from '../../components/Timer';
import { StageProgressBar } from '../../components/StageProgressBar';
import { ScoreCard } from '../../components/ScoreCard';
import { EvidenceViewer } from '../../components/EvidenceViewer';
import { IOCLookupModal } from '../../components/IOCLookupModal';
import { FindingModal } from '../../components/FindingModal';
import { HintModal } from '../../components/HintModal';
import {
  Crosshair,
  ShieldAlert,
  Search,
  PlusCircle,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  PauseCircle,
  Check,
  Send,
  Loader2,
  ArrowRight,
  Database,
  Radio,
  UserCheck,
  Layers
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const OperationPage = () => {
  const [opStatus, setOpStatus] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [allScenarios, setAllScenarios] = useState([]);
  const [evidences, setEvidences] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stage 1 Detect state
  const [selectedDetectId, setSelectedDetectId] = useState('');
  const [detectSubmitting, setDetectSubmitting] = useState(false);

  // Stage 4 Identify state
  const [attackType, setAttackType] = useState('');
  const [attackVector, setAttackVector] = useState('');
  const [affectedAsset, setAffectedAsset] = useState('');
  const [primaryIoc, setPrimaryIoc] = useState('');
  const [idSubmitting, setIdSubmitting] = useState(false);

  // Stage 5 Respond state
  const [selectedResponses, setSelectedResponses] = useState([]);
  const [respSubmitting, setRespSubmitting] = useState(false);

  // Stage 6 Report state
  const [report, setReport] = useState({
    incident_summary: '',
    attack_type: '',
    affected_asset: '',
    attack_vector: '',
    timeline: '',
    key_evidence: '',
    iocs: '',
    impact: '',
    containment: '',
    recovery: '',
    recommendations: ''
  });
  const [savingReport, setSavingReport] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Modals
  const [showIocModal, setShowIocModal] = useState(false);
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);

  const toast = useToast();

  const loadOperationData = useCallback(async () => {
    try {
      const [statusData, scenList] = await Promise.all([
        operationApi.getStatus(),
        scenariosApi.getScenarios().catch(() => [])
      ]);
      setOpStatus(statusData);
      setAllScenarios(scenList);

      const targetScenId = statusData.scenario_id || (scenList[0]?.id);

      if (targetScenId) {
        const [scenData, evData, findData, repData] = await Promise.all([
          scenariosApi.getScenarioDetail(targetScenId).catch(() => null),
          operationApi.getEvidence().catch(() => []),
          operationApi.getFindings().catch(() => []),
          operationApi.getReport().catch(() => null)
        ]);
        setScenario(scenData);
        setEvidences(evData);
        setFindings(findData);
        if (repData) setReport((prev) => ({ ...prev, ...repData }));
      }
    } catch (err) {
      console.error('Error fetching operation status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSwitchScenario = async (scenarioId) => {
    if (opStatus?.scenario_id === scenarioId) return;
    setLoading(true);
    try {
      const res = await operationApi.switchScenario(scenarioId);
      toast.success(res.message || 'Switched scenario successfully.');
      await loadOperationData();
    } catch (err) {
      toast.error(err.message || 'Failed to switch scenario.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperationData();

    // Listen to real-time WebSocket state broadcasts
    const unsub = teamSocket.on('*', (data) => {
      if (data.type === 'STAGE_ADVANCED') {
        toast.info(`Team stage advanced to: ${data.extra?.new_stage}`);
        loadOperationData();
      } else if (data.type === 'SCENARIO_SWITCHED' || data.type === 'SCENARIO_REASSIGNED') {
        toast.info(`Active scenario updated: ${data.extra?.scenario_name || ''}`);
        loadOperationData();
      } else if (data.type === 'EVIDENCE_VIEWED' || data.type === 'EVIDENCE_FLAGGED' || data.type === 'FINDING_ADDED' || data.type === 'HINT_USED') {
        loadOperationData();
      } else if (data.type === 'COMPETITION_STATE_CHANGED') {
        toast.info(`Competition status updated: ${data.status}`);
        loadOperationData();
      } else if (data.type === 'STATE_UPDATE') {
        setOpStatus((prev) => prev ? { ...prev, ...data } : data);
      }
    });

    // Tab switch detector for competition integrity
    const handleVisibilityChange = () => {
      if (document.hidden) {
        operationApi.logTabSwitch().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsub();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadOperationData]);


  // Stage 1: Detect Submit
  const handleDetectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDetectId) {
      toast.warning('Please select a root trigger alert from the SIEM queue.');
      return;
    }
    setDetectSubmitting(true);
    try {
      const res = await operationApi.submitDetect(selectedDetectId);
      if (res.status === 'CORRECT') {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      loadOperationData();
    } catch (err) {
      toast.error(err.message || 'Detection submission failed.');
    } finally {
      setDetectSubmitting(false);
    }
  };

  // Evidence Actions
  const handleViewEvidence = async (evidenceId) => {
    try {
      await operationApi.viewEvidence(evidenceId);
      setEvidences((prev) => prev.map((e) => e.id === evidenceId ? { ...e, viewed: true } : e));
      loadOperationData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFlagEvidence = async (evidenceId, flagType) => {
    try {
      await operationApi.flagEvidence(evidenceId, flagType);
      toast.info(`Evidence flagged as ${flagType}.`);
      loadOperationData();
    } catch (err) {
      toast.error(err.message || 'Failed to flag evidence.');
    }
  };

  // Stage Advance
  const handleAdvanceStage = async () => {
    try {
      const res = await operationApi.advanceStage();
      toast.success(`Advanced to stage: ${res.current_stage}`);
      loadOperationData();
    } catch (err) {
      toast.error(err.message || 'Cannot advance stage. Verify requirements.');
    }
  };

  // Stage 4: Identify Submit
  const handleIdentifySubmit = async (e) => {
    e.preventDefault();
    if (!attackType || !attackVector || !affectedAsset || !primaryIoc) {
      toast.warning('Please fill all 4 attack identification parameters.');
      return;
    }
    setIdSubmitting(true);
    try {
      const res = await operationApi.submitIdentify(attackType, attackVector, affectedAsset, primaryIoc);
      toast.success(res.message);
      loadOperationData();
    } catch (err) {
      toast.error(err.message || 'Identification submission failed.');
    } finally {
      setIdSubmitting(false);
    }
  };

  // Stage 5: Response Submit
  const handleToggleResponse = (actionId) => {
    setSelectedResponses((prev) =>
      prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId]
    );
  };

  const handleResponseSubmit = async (e) => {
    e.preventDefault();
    if (selectedResponses.length === 0) {
      toast.warning('Please select at least one containment or eradication action.');
      return;
    }
    setRespSubmitting(true);
    try {
      const res = await operationApi.submitResponse(selectedResponses);
      toast.success(res.message);
      loadOperationData();
    } catch (err) {
      toast.error(err.message || 'Response submission failed.');
    } finally {
      setRespSubmitting(false);
    }
  };

  // Stage 6: Report Draft & Submit
  const handleSaveReportDraft = async () => {
    setSavingReport(true);
    try {
      await operationApi.updateReport(report);
      toast.success('Incident response report draft saved.');
    } catch (err) {
      toast.error(err.message || 'Failed to save report draft.');
    } finally {
      setSavingReport(false);
    }
  };

  const handleSubmitFinalReport = async (e) => {
    e?.preventDefault();
    setSubmittingReport(true);
    try {
      // Save latest draft first
      await operationApi.updateReport(report);
      const res = await operationApi.submitReport();
      toast.success(res.message);
      loadOperationData();
    } catch (err) {
      toast.error(err.message || 'Report submission failed. All 11 sections required.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <Loader2 size={36} className="spin" color="var(--cyan-primary)" style={{ margin: '0 auto 1rem auto' }} />
        <div style={{ color: 'var(--text-muted)' }}>Synchronizing Cyber Operation Room...</div>
      </div>
    );
  }

  // 1. LOCKED Screen
  if (opStatus?.status === 'LOCKED') {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '650px', margin: '3rem auto' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(0, 240, 255, 0.1)',
            border: '2px solid var(--cyan-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <Lock size={32} color="var(--cyan-primary)" />
          </div>

          <h2 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '0.75rem' }}>Competition Locked</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            The administrator has not activated your operation yet. Prepare your analytical methodology in the DEFENDX Training Platform for the afternoon event and stand by with your 2-person squad.
          </p>

          <div style={{
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.85rem',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)'
          }}>
            Assigned Team: <strong style={{ color: '#fff' }}>{opStatus.team_name} ({opStatus.team_code})</strong><br />
            Status: <span style={{ color: 'var(--cyan-primary)' }}>AWAITING ADMINISTRATOR TRIGGER</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. PAUSED Banner
  const isPaused = opStatus?.status === 'PAUSED';
  const isCompleted = opStatus?.status === 'COMPLETED' || opStatus?.scenario_completed;
  const reportField = (key, fallbackLabel, fallbackPlaceholder) => {
    const field = scenario?.report_fields?.find((item) => item.key === key);
    return field || { label: fallbackLabel, placeholder: fallbackPlaceholder };
  };

  return (
    <div className="page-container">
      {/* Scenario Selector Ribbon - All Scenarios Attendable */}
      {allScenarios.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.95) 0%, rgba(19, 30, 54, 0.95) 100%)',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <Layers size={18} color="var(--cyan-primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
                AFTERNOON EVENT SCENARIOS (ALL OPEN TO YOUR SQUAD)
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Your squad can attend all scenario questions. Click any scenario below to switch active investigation:
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {allScenarios.map((scen, idx) => {
              const isActive = opStatus?.scenario_id === scen.id;
              return (
                <button
                  key={scen.id}
                  type="button"
                  onClick={() => handleSwitchScenario(scen.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(0, 240, 255, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <span style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: isActive ? 'var(--cyan-primary)' : 'rgba(255, 255, 255, 0.1)',
                    color: isActive ? '#070b14' : 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 800
                  }}>
                    {idx + 1}
                  </span>
                  <span>{scen.name}</span>
                  {isActive && <CheckCircle2 size={15} color="var(--cyan-primary)" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Operation Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-cyan">2-PERSON LIVE OP</span>
            <span className="badge badge-violet">{scenario?.difficulty || 'Medium'} DIFFICULTY</span>
            {isPaused && <span className="badge badge-amber">FROZEN</span>}
            {isCompleted && <span className="badge badge-emerald">COMPLETED</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', color: '#fff' }}>
            {scenario?.name || 'Cyber Incident Response Operation'}
          </h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Team: <strong style={{ color: '#fff' }}>{opStatus?.team_name}</strong> | S/N: <span className="mono" style={{ color: 'var(--cyan-primary)' }}>{opStatus?.team_code}</span> | Analysts: {opStatus?.analyst_1} & {opStatus?.analyst_2}
          </div>
        </div>


        {/* Server Synced Timer */}
        <Timer
          initialSeconds={opStatus?.time_remaining_seconds || 3600}
          status={opStatus?.status}
        />
      </div>

      {/* Paused Alert Callout if applicable */}
      {isPaused && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid var(--amber-warning)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          color: '#fbbf24'
        }}>
          <PauseCircle size={22} style={{ flexShrink: 0 }} />
          <div>
            <strong>Operation Paused:</strong> Timers and investigation submissions are temporarily frozen by the Administrator.
          </div>
        </div>
      )}

      {/* Stage Progress Bar */}
      <StageProgressBar
        currentStage={opStatus?.current_stage || 'DETECT'}
        completedStages={opStatus?.completed_stages || []}
        isCompleted={isCompleted}
      />

      {/* Main Grid Layout: Left Stage Content (2fr), Right Tools & Score (1fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: ACTIVE STAGE INTERFACE */}
        <div>

          {/* ================= STAGE 1: DETECT ================= */}
          {opStatus?.current_stage === 'DETECT' && !isCompleted && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <ShieldAlert size={22} color="var(--rose-danger)" />
                <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Stage 1: Detect Initial Trigger Alert</h3>
              </div>

              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {scenario?.stage_prompts?.DETECT || 'Analyze the incoming SIEM/EDR alert stream below and identify the authoritative root cause alert.'}
              </p>
              <div className="mono" style={{ color: 'var(--amber-warning)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                Root signal: {scenario?.detection_signal}
              </div>

              <form onSubmit={handleDetectSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
                  {scenario?.detection_options.map((opt) => {
                    const isSelected = selectedDetectId === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedDetectId(opt.id)}
                        style={{
                          padding: '1.25rem',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 700, color: isSelected ? 'var(--cyan-primary)' : '#fff', fontSize: '0.95rem' }}>
                            {opt.title}
                          </span>
                          <span className={`badge ${opt.severity === 'CRITICAL' ? 'badge-rose' : 'badge-cyan'}`} style={{ fontSize: '0.65rem' }}>
                            {opt.severity} • {opt.source}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                          {opt.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={detectSubmitting || !selectedDetectId || isPaused}
                  style={{ width: '100%', padding: '0.85rem' }}
                >
                  {detectSubmitting ? <Loader2 size={18} className="spin" /> : <ShieldAlert size={18} />}
                  <span>Verify Detection Alert (+100 PTS)</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= STAGE 2: INVESTIGATE ================= */}
          {opStatus?.current_stage === 'INVESTIGATE' && !isCompleted && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={22} color="var(--cyan-primary)" />
                  <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Stage 2: Evidence Chain & IOC Investigation</h3>
                </div>

                <button
                  onClick={handleAdvanceStage}
                  className="btn btn-emerald"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  disabled={isPaused}
                >
                  <span>Proceed to Analysis</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {scenario?.stage_prompts?.INVESTIGATE || 'Inspect the forensic telemetry artifacts below and record investigation findings.'}
              </p>

              <EvidenceViewer
                evidences={evidences}
                onView={handleViewEvidence}
                onFlag={handleFlagEvidence}
              />
            </div>
          )}

          {/* ================= STAGE 3: ANALYZE ================= */}
          {opStatus?.current_stage === 'ANALYZE' && !isCompleted && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Crosshair size={22} color="var(--violet-primary)" />
                  <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Stage 3: Forensic Correlation & Timeline</h3>
                </div>

                <button
                  onClick={handleAdvanceStage}
                  className="btn btn-emerald"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  disabled={isPaused}
                >
                  <span>Proceed to Identification</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {scenario?.stage_prompts?.ANALYZE || 'Correlate your findings against the reconstructed adversary timeline and classify the evidence.'}
              </p>

              {/* Timeline Display */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--cyan-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Adversary Activity Timeline
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {scenario?.timeline.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                      <span className="mono" style={{ color: 'var(--cyan-primary)', fontWeight: 600, minWidth: '95px' }}>
                        {item.time}
                      </span>
                      <span style={{ color: '#e2e8f0' }}>{item.event}</span>
                    </div>
                  ))}
                </div>
              </div>

              <EvidenceViewer
                evidences={evidences}
                onView={handleViewEvidence}
                onFlag={handleFlagEvidence}
              />
            </div>
          )}

          {/* ================= STAGE 4: IDENTIFY ================= */}
          {opStatus?.current_stage === 'IDENTIFY' && !isCompleted && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={22} color="var(--cyan-primary)" />
                <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Stage 4: Attack Vector Identification</h3>
              </div>

              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {scenario?.stage_prompts?.IDENTIFY || 'Synthesize your investigation and classify the attack details.'}
              </p>

              <form onSubmit={handleIdentifySubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  {/* Attack Type */}
                  <div className="form-group">
                    <label className="form-label">Attack Type</label>
                    <select
                      className="form-select"
                      value={attackType}
                      onChange={(e) => setAttackType(e.target.value)}
                      disabled={idSubmitting || isPaused}
                      required
                    >
                      <option value="">Select Attack Type...</option>
                      {scenario?.identification_options.attack_types.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Attack Vector */}
                  <div className="form-group">
                    <label className="form-label">Initial Attack Vector</label>
                    <select
                      className="form-select"
                      value={attackVector}
                      onChange={(e) => setAttackVector(e.target.value)}
                      disabled={idSubmitting || isPaused}
                      required
                    >
                      <option value="">Select Attack Vector...</option>
                      {scenario?.identification_options.attack_vectors.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Affected Asset */}
                  <div className="form-group">
                    <label className="form-label">Primary Affected Asset</label>
                    <select
                      className="form-select"
                      value={affectedAsset}
                      onChange={(e) => setAffectedAsset(e.target.value)}
                      disabled={idSubmitting || isPaused}
                      required
                    >
                      <option value="">Select Affected Asset...</option>
                      {scenario?.identification_options.affected_assets.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {/* Primary IOC */}
                  <div className="form-group">
                    <label className="form-label">Primary Threat IOC</label>
                    <select
                      className="form-select"
                      value={primaryIoc}
                      onChange={(e) => setPrimaryIoc(e.target.value)}
                      disabled={idSubmitting || isPaused}
                      required
                    >
                      <option value="">Select Primary IOC...</option>
                      {scenario?.identification_options.primary_iocs.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={idSubmitting || isPaused}
                  style={{ width: '100%', padding: '0.85rem' }}
                >
                  {idSubmitting ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />}
                  <span>Submit Attack Identification (+150 PTS)</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= STAGE 5: RESPOND ================= */}
          {opStatus?.current_stage === 'RESPOND' && !isCompleted && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={22} color="var(--emerald-success)" />
                <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Stage 5: Incident Response & Containment Planning</h3>
              </div>

              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                color: '#fecdd3'
              }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
                <strong>Response objective:</strong> {scenario?.stage_prompts?.RESPOND || 'Choose containment actions with surgical precision.'}
              </div>

              <form onSubmit={handleResponseSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {scenario?.response_actions.map((act) => {
                    const isSelected = selectedResponses.includes(act.id);
                    return (
                      <div
                        key={act.id}
                        onClick={() => !isPaused && handleToggleResponse(act.id)}
                        style={{
                          padding: '1rem 1.25rem',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.85rem',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ marginTop: '3px', accentColor: 'var(--cyan-primary)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: isSelected ? '#fff' : '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                            {act.title}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {act.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={respSubmitting || selectedResponses.length === 0 || isPaused}
                  style={{ width: '100%', padding: '0.85rem' }}
                >
                  {respSubmitting ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                  <span>Execute Containment Plan (+200 PTS)</span>
                </button>
              </form>
            </div>
          )}

          {/* ================= STAGE 6 / COMPLETED: REPORT ================= */}
          {(opStatus?.current_stage === 'REPORT' || isCompleted) && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={22} color="var(--cyan-primary)" />
                  <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Stage 6: {scenario?.name} Report</h3>
                </div>

                {!isCompleted && (
                  <button
                    type="button"
                    onClick={handleSaveReportDraft}
                    className="btn btn-secondary"
                    disabled={savingReport || isPaused}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    {savingReport ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                    <span>Save Draft</span>
                  </button>
                )}
              </div>

              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {scenario?.stage_prompts?.REPORT || 'Complete the scenario-specific sections for formal executive sign-off and root-cause analysis.'}
              </p>

              <form onSubmit={handleSubmitFinalReport}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* 1. Incident Summary */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">1. {reportField('incident_summary', 'Executive Incident Summary').label}</label>
                    <textarea
                      className="form-textarea"
                      rows="2"
                      placeholder={reportField('incident_summary', '', 'Brief non-technical summary for executive leadership...').placeholder}
                      value={report.incident_summary}
                      onChange={(e) => setReport({ ...report, incident_summary: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 2. Attack Type */}
                  <div className="form-group">
                    <label className="form-label">2. {reportField('attack_type', 'Confirmed Attack Type').label}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={reportField('attack_type', '', 'Describe the confirmed attack type.').placeholder}
                      value={report.attack_type}
                      onChange={(e) => setReport({ ...report, attack_type: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 3. Attack Vector */}
                  <div className="form-group">
                    <label className="form-label">3. {reportField('attack_vector', 'Initial Access Vector').label}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={reportField('attack_vector', '', 'Describe the initial access vector.').placeholder}
                      value={report.attack_vector}
                      onChange={(e) => setReport({ ...report, attack_vector: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 4. Affected Asset */}
                  <div className="form-group">
                    <label className="form-label">4. {reportField('affected_asset', 'Affected Assets & Subnets').label}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={reportField('affected_asset', '', 'List affected assets and addresses.').placeholder}
                      value={report.affected_asset}
                      onChange={(e) => setReport({ ...report, affected_asset: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 5. Primary IOCs */}
                  <div className="form-group">
                    <label className="form-label">5. {reportField('iocs', 'Primary IOCs (IPs, Domains, Hashes)').label}</label>
                    <input
                      type="text"
                      className="form-input mono"
                      placeholder={reportField('iocs', '', 'List the authoritative IOCs.').placeholder}
                      value={report.iocs}
                      onChange={(e) => setReport({ ...report, iocs: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 6. Timeline */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">6. {reportField('timeline', 'Technical Incident Timeline').label}</label>
                    <textarea
                      className="form-textarea"
                      rows="2"
                      placeholder={reportField('timeline', '', 'Chronological breakdown of key forensic events.').placeholder}
                      value={report.timeline}
                      onChange={(e) => setReport({ ...report, timeline: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 7. Key Evidence */}
                  <div className="form-group">
                    <label className="form-label">7. {reportField('key_evidence', 'Authoritative Key Evidence').label}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={reportField('key_evidence', '', 'Cite the strongest evidence records.').placeholder}
                      value={report.key_evidence}
                      onChange={(e) => setReport({ ...report, key_evidence: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 8. Impact */}
                  <div className="form-group">
                    <label className="form-label">8. {reportField('impact', 'Business & Security Impact').label}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={reportField('impact', '', 'Describe business and security impact.').placeholder}
                      value={report.impact}
                      onChange={(e) => setReport({ ...report, impact: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 9. Containment */}
                  <div className="form-group">
                    <label className="form-label">9. {reportField('containment', 'Containment Actions Executed').label}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={reportField('containment', '', 'Record the containment actions executed.').placeholder}
                      value={report.containment}
                      onChange={(e) => setReport({ ...report, containment: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 10. Recovery */}
                  <div className="form-group">
                    <label className="form-label">10. {reportField('recovery', 'Eradication & Recovery Plan').label}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={reportField('recovery', '', 'Describe eradication and recovery.').placeholder}
                      value={report.recovery}
                      onChange={(e) => setReport({ ...report, recovery: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>

                  {/* 11. Recommendations */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">11. {reportField('recommendations', 'Strategic Long-Term Recommendations').label}</label>
                    <textarea
                      className="form-textarea"
                      rows="2"
                      placeholder={reportField('recommendations', '', 'List long-term recommendations.').placeholder}
                      value={report.recommendations}
                      onChange={(e) => setReport({ ...report, recommendations: e.target.value })}
                      disabled={isCompleted || isPaused}
                      required
                    />
                  </div>
                </div>

                {!isCompleted ? (
                  <button
                    type="submit"
                    className="btn btn-emerald"
                    disabled={submittingReport || isPaused}
                    style={{ width: '100%', padding: '0.85rem' }}
                  >
                    {submittingReport ? <Loader2 size={18} className="spin" /> : <FileText size={18} />}
                    <span>Submit Authoritative Incident Report (+100 PTS)</span>
                  </button>
                ) : (
                  <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid var(--emerald-success)',
                    borderRadius: 'var(--radius-md)',
                    color: '#6ee7b7',
                    fontWeight: 600
                  }}>
                    ✓ Incident Report Formally Approved and Operation Completed.
                  </div>
                )}
              </form>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: TACTICAL TOOLS & LIVE SCORE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Tactical Action Quick Bar */}
          <div className="card">
            <h4 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Radio size={16} color="var(--cyan-primary)" />
              <span>Squadron Tactical Tools</span>
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => setShowIocModal(true)}
                className="btn btn-secondary"
                disabled={isPaused}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Database size={16} color="var(--cyan-primary)" />
                <span>IOC Threat Search</span>
              </button>

              <button
                onClick={() => setShowFindingModal(true)}
                className="btn btn-secondary"
                disabled={isPaused || isCompleted}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <PlusCircle size={16} color="var(--violet-primary)" />
                <span>Add Finding ({findings.length})</span>
              </button>

              <button
                onClick={() => setShowHintModal(true)}
                className="btn btn-secondary"
                disabled={isPaused || isCompleted}
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Lightbulb size={16} color="var(--amber-warning)" />
                <span>Request Tactical Hint ({opStatus?.hints_used || 0}/{opStatus?.max_hints || 3})</span>
              </button>
            </div>
          </div>

          {/* Live Scorecard */}
          <ScoreCard
            score={opStatus?.total_score || 0}
            breakdown={opStatus?.score_breakdown || {}}
          />

          {/* Team Findings Feed */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#fff' }}>Documented Findings</h4>
              <span className="badge badge-violet" style={{ fontSize: '0.65rem' }}>{findings.length} LOGGED</span>
            </div>

            {findings.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
                No findings documented yet. Click "Add Finding" to corroborate evidence.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '250px', overflowY: 'auto' }}>
                {findings.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cyan-primary)', fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                      <span>Analyst: {f.analyst_name}</span>
                      <span className="mono">{new Date(f.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ color: '#e2e8f0' }}>{f.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Modals */}
      <IOCLookupModal
        isOpen={showIocModal}
        onClose={() => setShowIocModal(false)}
      />

      <FindingModal
        isOpen={showFindingModal}
        onClose={() => setShowFindingModal(false)}
        evidences={evidences}
        onFindingAdded={() => loadOperationData()}
      />

      <HintModal
        isOpen={showHintModal}
        onClose={() => setShowHintModal(false)}
        hintsUsed={opStatus?.hints_used || 0}
        maxHints={opStatus?.max_hints || 3}
        onHintReceived={() => loadOperationData()}
      />
    </div>
  );
};

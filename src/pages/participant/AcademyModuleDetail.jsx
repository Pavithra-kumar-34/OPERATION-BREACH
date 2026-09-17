import React, { useState, useEffect } from 'react';
import { academyApi } from '../../services/api';
import {
  ArrowLeft,
  GraduationCap,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Send,
  Loader2,
  Award
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AcademyModuleDetail = ({ moduleId, onBack, onComplete }) => {
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taskInput, setTaskInput] = useState('');
  const [submittingTask, setSubmittingTask] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await academyApi.getModuleDetail(moduleId);
        setModule(data);
        if (data.task_completed) {
          setTaskInput('Task verified and completed.');
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load module details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [moduleId]);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskInput.trim() || taskInput.trim().length < 10) {
      toast.warning('Please provide a substantive task solution (minimum 10 characters).');
      return;
    }

    setSubmittingTask(true);
    try {
      await academyApi.submitTask(moduleId, taskInput.trim());
      toast.success('Guided tactical task successfully verified!');
      setModule((prev) => ({ ...prev, task_completed: true }));
    } catch (err) {
      toast.error(err.message || 'Task submission failed.');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleSelectQuizAnswer = (qIdx, optIdx) => {
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    const questionsCount = module.quiz_questions.length;
    const answeredKeys = Object.keys(quizAnswers);

    if (answeredKeys.length < questionsCount) {
      toast.warning(`Please answer all ${questionsCount} questions before submitting.`);
      return;
    }

    const answersArray = [];
    for (let i = 0; i < questionsCount; i++) {
      answersArray.push(quizAnswers[i]);
    }

    setSubmittingQuiz(true);
    try {
      const res = await academyApi.submitQuiz(moduleId, answersArray);
      setQuizResult(res);
      if (res.passed) {
        toast.success(`Module passed with ${res.score}%! Module marked as completed.`);
        setModule((prev) => ({ ...prev, completed: true, quiz_score: res.score }));
        if (onComplete) onComplete();
      } else {
        toast.error(`Score: ${res.score}%. Minimum 70% required to pass. Please review and try again.`);
      }
    } catch (err) {
      toast.error(err.message || 'Quiz submission failed.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <Loader2 size={36} className="spin" color="var(--cyan-primary)" style={{ margin: '0 auto 1rem auto' }} />
        <div style={{ color: 'var(--text-muted)' }}>Loading Training Platform Telemetry...</div>
      </div>
    );
  }

  if (!module) return null;

  return (
    <div className="page-container">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="btn btn-secondary"
        style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Training Platform Modules</span>
      </button>


      {/* Module Header Card */}
      <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--border-glow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span className="badge badge-cyan">MODULE #{module.module_number}</span>
              <span className="badge badge-violet">{module.category}</span>
              <span className="badge badge-emerald">{module.difficulty}</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', color: '#fff', marginBottom: '0.4rem' }}>{module.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{module.description}</p>
          </div>

          <div>
            {module.completed ? (
              <span className="badge badge-emerald" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                <CheckCircle2 size={16} /> COMPLETED ({module.quiz_score}%)
              </span>
            ) : (
              <span className="badge badge-amber" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                IN PROGRESS
              </span>
            )}
          </div>
        </div>

        {/* Learning Objective Callout */}
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(0, 240, 255, 0.05)',
          border: '1px solid var(--border-glow)',
          fontSize: '0.9rem',
          color: '#e2e8f0',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <BookOpen size={20} color="var(--cyan-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Core Learning Objective:</strong> {module.learning_objective}
          </div>
        </div>
      </div>

      {/* Section 1: Detailed Theoretical Explanation */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GraduationCap size={20} color="var(--cyan-primary)" />
          <span>Theoretical Foundation & SOC Context</span>
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
          {module.explanation}
        </p>

        <div style={{
          padding: '1rem',
          background: 'rgba(168, 85, 247, 0.08)',
          borderLeft: '4px solid var(--violet-primary)',
          borderRadius: '0 var(--radius-md) var(--radius-md) 0',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          color: '#f1f5f9'
        }}>
          <strong style={{ color: '#c084fc' }}>Why This Matters in Live Operations:</strong> {module.why_it_matters}
        </div>

        {/* Example Box */}
        <div style={{
          background: '#050914',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.85rem',
          color: 'var(--cyan-primary)',
          lineHeight: '1.6'
        }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            Operational Scenario Example:
          </div>
          {module.example}
        </div>
      </div>

      {/* Section 2: Guided Task */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Guided Tactical Task</h3>
          {module.task_completed && <span className="badge badge-emerald">TASK VERIFIED</span>}
        </div>

        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1rem' }}>
          {module.guided_task}
        </p>

        {module.hints && module.hints.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              <Lightbulb size={14} color="var(--amber-warning)" />
              <span>{showHint ? 'Hide Tactical Hint' : 'Show Tactical Hint'}</span>
            </button>

            {showHint && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                color: '#fbbf24'
              }}>
                {module.hints.map((h, i) => <div key={i}>• {h}</div>)}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleTaskSubmit}>
          <textarea
            className="form-textarea"
            rows="3"
            placeholder="Type your task solution or forensic reasoning here..."
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            disabled={submittingTask || module.task_completed}
            style={{ marginBottom: '0.75rem' }}
          />

          {!module.task_completed && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingTask || !taskInput.trim()}
              style={{ fontSize: '0.85rem' }}
            >
              {submittingTask ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
              <span>Submit Task Solution</span>
            </button>
          )}
        </form>
      </div>

      {/* Section 3: Interactive Practice Knowledge Check Quiz */}
      <div className="card" style={{ borderColor: 'var(--border-violet)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={20} color="var(--violet-primary)" />
            <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Knowledge Check Quiz</h3>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            70% Score Required to Certify Module
          </span>
        </div>

        <form onSubmit={handleQuizSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {module.quiz_questions.map((q, qIdx) => (
              <div
                key={qIdx}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                  {qIdx + 1}. {q.question}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{q.topic}</span>
                  <span className="badge badge-violet" style={{ fontSize: '0.65rem' }}>{q.difficulty}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {q.options.map((opt, optIdx) => {
                    const isSelected = quizAnswers[qIdx] === optIdx;
                    return (
                      <label
                        key={optIdx}
                        onClick={() => handleSelectQuizAnswer(qIdx, optIdx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.65rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          color: isSelected ? '#fff' : 'var(--text-muted)',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <input
                          type="radio"
                          name={`q_${qIdx}`}
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ accentColor: 'var(--cyan-primary)' }}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Feedback if already submitted */}
                {quizResult && quizResult.feedback && quizResult.feedback[qIdx] && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: quizResult.feedback[qIdx].is_correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid',
                    borderColor: quizResult.feedback[qIdx].is_correct ? 'var(--emerald-success)' : 'var(--rose-danger)',
                    fontSize: '0.8rem',
                    color: '#f8fafc'
                  }}>
                    <strong>{quizResult.feedback[qIdx].is_correct ? 'Correct! ' : 'Incorrect. '}</strong>
                    {quizResult.feedback[qIdx].explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-violet"
            disabled={submittingQuiz || Object.keys(quizAnswers).length < module.quiz_questions.length}
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
          >
            {submittingQuiz ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>Evaluating Knowledge Check...</span>
              </>
            ) : (
              <>
                <Award size={18} />
                <span>Submit Knowledge Check Answers</span>
              </>
            )}
          </button>

          {quizResult && (
            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)', color: '#e2e8f0' }}>
              <strong>Course result:</strong> {quizResult.correct_count} correct, {quizResult.total_questions - quizResult.correct_count} incorrect, {quizResult.score}%.
              <span style={{ marginLeft: '0.5rem', color: quizResult.passed ? 'var(--emerald-success)' : 'var(--amber-warning)' }}>
                {quizResult.passed ? 'COMPLETED' : 'IN PROGRESS'}
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

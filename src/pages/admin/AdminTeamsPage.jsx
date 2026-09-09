import React, { useState, useEffect } from 'react';
import { adminApi, scenariosApi } from '../../services/api';
import { AdminTeamDetailModal } from './AdminTeamDetailModal';
import { Modal } from '../../components/Modal';
import {
  Users,
  PlusCircle,
  Eye,
  Shuffle,
  Clock,
  Shield,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AdminTeamsPage = () => {
  const [teams, setTeams] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  // Form State for Team Creation
  const [newTeam, setNewTeam] = useState({
    team_name: '',
    analyst_1_name: '',
    analyst_2_name: '',
    scenario_id: '',
    difficulty: 'Medium',
    time_limit_minutes: 60,
    max_hints: 3
  });
  const [creating, setCreating] = useState(false);

  const toast = useToast();

  const fetchTeamsAndScenarios = async () => {
    try {
      const [teamsData, scenData] = await Promise.all([
        adminApi.getTeams(),
        scenariosApi.getScenarios()
      ]);
      setTeams(teamsData);
      setScenarios(scenData);
      if (scenData.length > 0 && !newTeam.scenario_id) {
        setNewTeam((prev) => ({ ...prev, scenario_id: scenData[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load teams list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndScenarios();
  }, []);

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to delete team "${teamName}" and all associated progress?`)) {
      return;
    }
    try {
      const res = await adminApi.deleteTeam(teamId);
      toast.success(res.message || `Team "${teamName}" deleted.`);
      fetchTeamsAndScenarios();
    } catch (err) {
      toast.error(err.message || 'Failed to delete team.');
    }
  };

  const handleDeleteAllTeams = async () => {
    if (!window.confirm('WARNING: Are you sure you want to delete ALL teams, submissions, and squad logs? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await adminApi.deleteAllTeams();
      toast.success(res.message || 'All teams deleted.');
      fetchTeamsAndScenarios();
    } catch (err) {
      toast.error(err.message || 'Failed to delete all teams.');
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeam.team_name.trim() || !newTeam.analyst_1_name.trim() || !newTeam.analyst_2_name.trim()) {
      toast.warning('Team name and both Analyst names are required.');
      return;
    }

    if (newTeam.analyst_1_name.trim().toLowerCase() === newTeam.analyst_2_name.trim().toLowerCase()) {
      toast.warning('Analyst 1 and Analyst 2 must be different names.');
      return;
    }

    setCreating(true);
    try {
      const created = await adminApi.createTeam({
        team_name: newTeam.team_name.trim(),
        analyst_1_name: newTeam.analyst_1_name.trim(),
        analyst_2_name: newTeam.analyst_2_name.trim(),
        scenario_id: parseInt(newTeam.scenario_id) || (scenarios[0] ? scenarios[0].id : 1),
        difficulty: newTeam.difficulty,
        time_limit_minutes: parseInt(newTeam.time_limit_minutes) || 60,
        max_hints: parseInt(newTeam.max_hints) || 3
      });

      toast.success(`Team "${created.team_name}" registered! Squad has access to all scenarios.`);
      setShowCreateModal(false);
      setNewTeam({
        team_name: '',
        analyst_1_name: '',
        analyst_2_name: '',
        scenario_id: scenarios[0]?.id || '',
        difficulty: 'Medium',
        time_limit_minutes: 60,
        max_hints: 3
      });
      fetchTeamsAndScenarios();
    } catch (err) {
      toast.error(err.message || 'Failed to create team.');
    } finally {
      setCreating(false);
    }
  };

  const filteredTeams = teams.filter((t) =>
    t.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.team_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.analyst_1_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.analyst_2_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-violet">ADMINISTRATION</span>
            <span className="badge badge-cyan">{teams.length} REGISTERED SQUADS</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', color: '#fff' }}>2-Person Team Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Register 2-person Blue Teams. All registered squads can attend and solve all afternoon event scenarios when competition begins.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchTeamsAndScenarios()}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {teams.length > 0 && (
            <button
              onClick={handleDeleteAllTeams}
              className="btn btn-secondary"
              style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              title="Delete all registered teams"
            >
              <Trash2 size={16} color="#fb7185" />
              <span>Delete All Teams</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <PlusCircle size={18} />
            <span>Create New Team</span>
          </button>
        </div>
      </div>


      {/* Search Filter */}
      <div style={{ marginBottom: '1.5rem', maxWidth: '380px', position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Filter by Team Name, Code, or Analyst..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem' }}
        />
        <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {/* Teams Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Loader2 size={36} className="spin" color="var(--cyan-primary)" style={{ margin: '0 auto 1rem auto' }} />
          <div style={{ color: 'var(--text-muted)' }}>Loading Squad Database...</div>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Users size={40} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No teams found.</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click "Create New Team" to register a 2-person Blue Team.</p>
        </div>
      ) : (
        <div className="cyber-table-container">
          <table className="cyber-table">
            <thead>
              <tr>
                <th>Team Code</th>
                <th>Team Name</th>
                <th>Analysts (2-Person)</th>
                <th>Scenario Access</th>
                <th>Stage</th>
                <th>Score</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map((team) => (
                <tr key={team.id}>
                  <td>
                    <span className="mono" style={{ color: 'var(--cyan-primary)', fontWeight: 700 }}>
                      {team.team_code}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#fff' }}>{team.team_name}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>1. {team.analyst_1_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>2. {team.analyst_2_name}</div>
                  </td>
                  <td>
                    <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                      ALL 3 SCENARIOS OPEN
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                      {team.current_stage || 'DETECT'}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ fontWeight: 800, color: 'var(--cyan-primary)', fontSize: '0.95rem' }}>
                      {Math.round(team.score)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      team.status === 'COMPLETED' ? 'badge-emerald' :
                      team.status === 'ACTIVE' ? 'badge-cyan' :
                      team.status === 'PAUSED' ? 'badge-amber' : 'badge-violet'
                    }`}>
                      {team.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setSelectedTeamId(team.id);
                          setShowDetailModal(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        title="View Team Dossier"
                      >
                        <Eye size={14} />
                        <span>Dossier</span>
                      </button>

                      <button
                        onClick={() => handleDeleteTeam(team.id, team.team_name)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                        title="Delete Team"
                      >
                        <Trash2 size={14} color="#fb7185" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Register New 2-Person Blue Team"
          maxWidth="600px"
          footer={
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTeam}
                className="btn btn-primary"
                disabled={creating}
              >
                {creating ? <Loader2 size={16} className="spin" /> : <PlusCircle size={16} />}
                <span>Create Team</span>
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateTeam}>
            {/* Scenario Access Callout */}
            <div style={{
              padding: '0.85rem 1rem',
              background: 'rgba(0, 240, 255, 0.08)',
              border: '1px solid var(--border-glow)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
              color: '#cbd5e1'
            }}>
              <strong style={{ color: 'var(--cyan-primary)' }}>All Scenarios Open:</strong> When the competition starts, this squad will have immediate access to attend and complete all 3 scenario challenges (FINCORE, HEALTHNET, and CLOUDGUARD).
            </div>

            <div className="form-group">
              <label className="form-label">Team Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. DEFENDX"
                value={newTeam.team_name}
                onChange={(e) => setNewTeam({ ...newTeam, team_name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Analyst 1 Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Pavithra"
                  value={newTeam.analyst_1_name}
                  onChange={(e) => setNewTeam({ ...newTeam, analyst_1_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Analyst 2 Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Kavya"
                  value={newTeam.analyst_2_name}
                  onChange={(e) => setNewTeam({ ...newTeam, analyst_2_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select
                  className="form-select"
                  value={newTeam.difficulty}
                  onChange={(e) => setNewTeam({ ...newTeam, difficulty: e.target.value })}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Time Limit (Mins)</label>
                <input
                  type="number"
                  className="form-input"
                  min="15"
                  max="180"
                  value={newTeam.time_limit_minutes}
                  onChange={(e) => setNewTeam({ ...newTeam, time_limit_minutes: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Hints</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="10"
                  value={newTeam.max_hints}
                  onChange={(e) => setNewTeam({ ...newTeam, max_hints: e.target.value })}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Team Detail Dossier Modal */}
      <AdminTeamDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        teamId={selectedTeamId}
      />
    </div>
  );
};

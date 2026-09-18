export const BASE_API_URL = import.meta.env.VITE_API_URL || 'https://operation-breach.onrender.com/api';
console.debug('DEFENDX API BASE URL:', BASE_API_URL);

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  getToken() {
    return sessionStorage.getItem('defendx_token') || localStorage.getItem('defendx_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();
    console.log('DEFENDX REQUEST URL:', url);

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      console.log('DEFENDX RESPONSE STATUS:', response.status);
      console.log('DEFENDX RESPONSE OK:', response.ok);

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        // If not logging in, token expired
        if (!endpoint.includes('/auth/')) {
          sessionStorage.removeItem('defendx_token');
          sessionStorage.removeItem('defendx_user');
          localStorage.removeItem('defendx_token');
          localStorage.removeItem('defendx_user');
          window.dispatchEvent(new CustomEvent('defendx_session_expired', {
            detail: { message: 'Your session has expired. Please log in again.' }
          }));
        }
      }


      // Check if response is CSV or blob download
      const contentType = response.headers.get('content-type');
      if (contentType && (contentType.includes('text/csv') || contentType.includes('application/octet-stream'))) {
        if (!response.ok) {
          throw new Error('Export download failed');
        }
        return await response.blob();
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('DEFENDX API ERROR:', { url, status: response.status, body: data });
        let errorMsg = data.detail || 'An unexpected error occurred.';
        if (response.status === 403) {
          errorMsg = data.detail || 'Access forbidden: You do not have permission for this action.';
        } else if (response.status === 404) {
          errorMsg = data.detail || 'The requested resource was not found.';
        } else if (response.status === 409) {
          errorMsg = data.detail || 'Conflict: Record already exists.';
        } else if (response.status === 500) {
          errorMsg = data.detail || 'Internal server error occurred on DEFENDX backend.';
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        console.error('DEFENDX FETCH ERROR:', err);
        const netErr = new Error(`Unable to reach DEFENDX server at ${BASE_API_URL}. Network or CORS failure.`);
        netErr.status = 0;
        netErr.code = 'NETWORK_OR_CORS_ERROR';
        throw netErr;
      }
      throw err;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient(BASE_API_URL);

// Modular API functions
export const authApi = {
  adminLogin: (email, password) => api.post('/auth/admin/login', { email, password }),
  participantLogin: (analyst_name, team_code) => api.post('/auth/participant/login', { analyst_name, team_code }),
  getMe: () => api.get('/auth/me'),
  checkHealth: () => api.get('/health')
};

export const academyApi = {
  getModules: () => api.get('/academy/modules'),
  getModuleDetail: (id) => api.get(`/academy/modules/${id}`),
  submitTask: (moduleId, taskSolution) => api.post('/academy/task', { module_id: moduleId, task_solution: taskSolution }),
  submitQuiz: (moduleId, answers) => api.post('/academy/quiz', { module_id: moduleId, answers }),
  getRecommendations: () => api.get('/academy/recommendations'),
  getCertificate: () => api.get('/academy/certificate')
};

export const scenariosApi = {
  getScenarios: () => api.get('/scenarios'),
  getScenarioDetail: (id) => api.get(`/scenarios/${id}`)
};

export const operationApi = {
  getStatus: () => api.get('/operation/status'),
  submitDetect: (selectedOptionId) => api.post('/operation/detect', { selected_option_id: selectedOptionId }),
  getEvidence: () => api.get('/operation/evidence'),
  viewEvidence: (id) => api.post(`/operation/evidence/${id}/view`),
  flagEvidence: (evidenceId, flagType) => api.post('/operation/evidence/flag', { evidence_id: evidenceId, flag_type: flagType }),
  searchIOC: (query) => api.post('/operation/ioc/search', { query }),
  getFindings: () => api.get('/operation/findings'),
  createFinding: (description, evidenceIds = []) => api.post('/operation/findings', { description, evidence_ids: evidenceIds }),
  requestHint: () => api.post('/operation/hints'),
  advanceStage: () => api.post('/operation/stage/advance'),
  submitIdentify: (attackType, attackVector, affectedAsset, primaryIoc) => 
    api.post('/operation/identify', {
      attack_type: attackType,
      attack_vector: attackVector,
      affected_asset: affectedAsset,
      primary_ioc: primaryIoc
    }),
  submitResponse: (selectedActionIds) => api.post('/operation/respond', { selected_action_ids: selectedActionIds }),
  getReport: () => api.get('/operation/report'),
  updateReport: (reportData) => api.put('/operation/report', reportData),
  submitReport: () => api.post('/operation/report/submit'),
  switchScenario: (scenarioId) => api.post('/operation/switch-scenario', { scenario_id: scenarioId }),
  logTabSwitch: () => api.post('/operation/tab-switch', { blurred_at: new Date().toISOString() })
};

export const leaderboardApi = {
  getLeaderboard: () => api.get('/leaderboard')
};

export const adminApi = {
  controlCompetition: (action) => api.post('/admin/competition', { action }),
  getTeams: () => api.get('/admin/teams'),
  createTeam: (teamData) => api.post('/admin/teams', teamData),
  deleteTeam: (teamId) => api.delete(`/admin/teams/${teamId}`),
  deleteAllTeams: () => api.delete('/admin/teams'),
  getTeamDetail: (id) => api.get(`/admin/teams/${id}/view`),
  reassignScenario: (teamId, scenarioId) => api.post(`/admin/teams/${teamId}/reassign`, { scenario_id: scenarioId }),
  updateTeam: (teamId, updateData) => api.put(`/admin/teams/${teamId}`, updateData),
  getAnalytics: () => api.get('/admin/analytics'),
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/audit${query ? `?${query}` : ''}`);
  },
  clearAuditLogs: () => api.delete('/admin/audit'),
  clearAllData: () => api.post('/admin/clear-all-data'),
  exportCsv: () => api.get('/admin/export')
};


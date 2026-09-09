import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import { teamSocket } from '../services/websocket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('defendx_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => sessionStorage.getItem('defendx_token'));
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('CHECKING'); // 'CONNECTED', 'OFFLINE', 'CHECKING'

  const checkServerHealth = useCallback(async () => {
    try {
      await authApi.checkHealth();
      setServerStatus('CONNECTED');
    } catch {
      setServerStatus('OFFLINE');
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('defendx_token');
    sessionStorage.removeItem('defendx_user');
    localStorage.removeItem('defendx_token');
    localStorage.removeItem('defendx_user');
    setToken(null);
    setUser(null);
    teamSocket.disconnect();
  }, []);

  // Clear legacy localStorage and check health on mount
  useEffect(() => {
    const initAuth = async () => {
      // Clear legacy localStorage to ensure login page is always shown first on fresh load
      localStorage.removeItem('defendx_token');
      localStorage.removeItem('defendx_user');

      await checkServerHealth();
      const storedToken = sessionStorage.getItem('defendx_token');
      if (storedToken) {
        try {
          const meData = await authApi.getMe();
          const savedUser = sessionStorage.getItem('defendx_user');
          const mergedUser = savedUser ? { ...JSON.parse(savedUser), ...meData } : meData;
          setUser(mergedUser);
          sessionStorage.setItem('defendx_user', JSON.stringify(mergedUser));

          // Connect socket if analyst
          if (mergedUser.role === 'ANALYST' && mergedUser.team_id) {
            teamSocket.connect(mergedUser.team_id, storedToken);
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();

    // Heartbeat for server status
    const healthInterval = setInterval(checkServerHealth, 15000);

    // Session expired listener
    const handleSessionExpired = () => {
      logout();
    };
    window.addEventListener('defendx_session_expired', handleSessionExpired);

    return () => {
      clearInterval(healthInterval);
      window.removeEventListener('defendx_session_expired', handleSessionExpired);
    };
  }, [checkServerHealth, logout]);

  const loginAdmin = async (email, password) => {
    const data = await authApi.adminLogin(email, password);
    sessionStorage.setItem('defendx_token', data.access_token);
    sessionStorage.setItem('defendx_user', JSON.stringify(data.user_info));
    setToken(data.access_token);
    setUser(data.user_info);
    setServerStatus('CONNECTED');
    return data;
  };

  const loginParticipant = async (analyst_name, team_code) => {
    const data = await authApi.participantLogin(analyst_name, team_code);
    sessionStorage.setItem('defendx_token', data.access_token);
    sessionStorage.setItem('defendx_user', JSON.stringify(data.user_info));
    setToken(data.access_token);
    setUser(data.user_info);
    setServerStatus('CONNECTED');

    if (data.user_info.team_id) {
      teamSocket.connect(data.user_info.team_id, data.access_token);
    }
    return data;
  };


  const value = {
    user,
    token,
    loading,
    serverStatus,
    isAdmin: user?.role === 'ADMIN',
    isAnalyst: user?.role === 'ANALYST',
    loginAdmin,
    loginParticipant,
    logout,
    checkServerHealth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

class TeamSocketManager {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectTimeout = null;
    this.reconnectAttempts = 0;
    this.teamId = null;
    this.token = null;
    this.statusListeners = new Set();
    this.isConnected = false;
  }

  getWsUrl(teamId, token) {
    const isHttps = window.location.protocol === 'https:';
    const host = window.location.hostname || 'localhost';
    const port = '8000';
    const protocol = isHttps ? 'wss:' : 'ws:';
    return `${protocol}//${host}:${port}/api/ws/team/${teamId}?token=${encodeURIComponent(token || '')}`;
  }

  connect(teamId, token) {
    if (!teamId) return;
    this.teamId = teamId;
    this.token = token;

    if (this.socket) {
      this.socket.close();
    }

    try {
      const url = this.getWsUrl(teamId, token);
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyStatus('REALTIME LIVE');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.dispatch(data.type, data);
          this.dispatch('*', data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.notifyStatus('REALTIME OFFLINE');
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.notifyStatus('REALTIME OFFLINE');
      };
    } catch (e) {
      this.isConnected = false;
      this.notifyStatus('REALTIME OFFLINE');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (!this.teamId) return;

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => {
      if (this.teamId) {
        this.connect(this.teamId, this.token);
      }
    }, delay);
  }

  disconnect() {
    this.teamId = null;
    this.token = null;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.notifyStatus('REALTIME OFFLINE');
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.off(type, callback);
  }

  off(type, callback) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(callback);
    }
  }

  dispatch(type, data) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach((cb) => {
        try { cb(data); } catch (err) { console.error(err); }
      });
    }
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.isConnected ? 'REALTIME LIVE' : 'REALTIME OFFLINE');
    return () => this.statusListeners.delete(callback);
  }

  notifyStatus(status) {
    this.statusListeners.forEach((cb) => {
      try { cb(status); } catch (e) { console.error(e); }
    });
  }
}

export const teamSocket = new TeamSocketManager();

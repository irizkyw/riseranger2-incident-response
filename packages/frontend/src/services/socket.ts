import { io, Socket } from 'socket.io-client';
import { clientLogger } from '../utils/logger';

export const getSocketUrl = (): string => {
  // 1. Explicit Vite env variable
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (envSocket && typeof envSocket === 'string' && envSocket.trim() !== '') {
    return envSocket.trim();
  }

  // 2. Automatically derive from VITE_API_URL if it's an absolute URL
  const envApi = import.meta.env.VITE_API_URL;
  if (envApi && typeof envApi === 'string' && (envApi.startsWith('http://') || envApi.startsWith('https://'))) {
    try {
      const url = new URL(envApi);
      return url.origin;
    } catch {
      return envApi.replace(/\/api\/?$/, '');
    }
  }

  // 3. Runtime override (e.g. from localStorage)
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('VITE_SOCKET_URL') || localStorage.getItem('VITE_API_URL');
    if (custom) {
      try {
        const url = new URL(custom.startsWith('http') ? custom : `https://${custom}`);
        return url.origin;
      } catch { }
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const SOCKET_URL = getSocketUrl();

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      const targetUrl = getSocketUrl();
      clientLogger.socket('Connecting to CTF WebSocket Hub...', targetUrl);
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      this.socket = io(targetUrl, {
        withCredentials: true,
        autoConnect: true,
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        clientLogger.socket('CONNECTED', `Socket ID: ${this.socket?.id}`);
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user?.id) {
              this.socket?.emit('join-user-session', user.id);
            }
          } catch { }
        }
      });

      // Anti-Cheat: Force logout when session is revoked by admin or multiple login is detected
      this.socket.on('force_logout', (data: any) => {
        clientLogger.warn('AntiCheat', 'Force logout signal received: ' + (data?.message || ''));
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        sessionStorage.setItem('logout_reason', data?.message || 'Sesi login Anda telah di-reset .');
        window.location.href = '/login';
      });

      this.socket.on('force_logout_user', (data: any) => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user?.id === data?.userId) {
              clientLogger.warn('AntiCheat', 'Targeted force logout received: ' + (data?.message || ''));
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
              sessionStorage.setItem('logout_reason', data?.message || 'Sesi login Anda revoked .');
              window.location.href = '/login';
            }
          } catch { }
        }
      });

      this.socket.on('disconnect', (reason) => {
        clientLogger.socket('DISCONNECTED', reason);
      });

      this.socket.on('connect_error', (error) => {
        clientLogger.error('Socket', `Connection error: ${error.message}`, error);
      });

      // Hook debug logger for common CTF realtime events
      this.socket.on('scoreboard_update', (data) => {
        clientLogger.socket('scoreboard_update', `${data?.length || 0} teams ranked`);
      });

      this.socket.on('first_blood_alert', (data) => {
        clientLogger.socket('first_blood_alert', data);
      });

      this.socket.on('attack-result', (data) => {
        clientLogger.socket('attack-result', data);
      });
    }
    return this.socket;
  }

  getSocket(): Socket {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      clientLogger.socket('Explicitly disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
export default socketService;

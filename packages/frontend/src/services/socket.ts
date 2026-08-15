import { io, Socket } from 'socket.io-client';
import { clientLogger } from '../utils/logger';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      clientLogger.socket('Connecting to CTF WebSocket Hub...', SOCKET_URL);
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        clientLogger.socket('CONNECTED', `Socket ID: ${this.socket?.id}`);
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

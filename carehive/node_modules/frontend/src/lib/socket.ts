/**
 * Socket.io client for real-time interventions
 */
import { io } from 'socket.io-client';
import { useStore } from '@/store/useStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

let socket: ReturnType<typeof io> | null = null;

export function getSocket() {
  if (typeof window === 'undefined') return null;
  if (!socket) {
    socket = io(SOCKET_URL, { path: '/', transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
      const userId = useStore.getState().userId;
      if (userId) socket?.emit('subscribe', userId);
    });
    socket.on('intervention', (data: { id: string; userId: string; agentType: string; message: string; priority: string; createdAt: string }) => {
      useStore.getState().addIntervention(data);
    });
  }
  return socket;
}

export function subscribeToUser(userId: string) {
  const s = getSocket();
  if (s) s.emit('subscribe', userId);
}

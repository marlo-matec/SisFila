
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(url: string | undefined) {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'offline' | 'syncing'>('connecting');
  const [isOnline, setIsOnline] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setConnectionStatus('connecting');
    const socket = io(url, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 5000,
      autoConnect: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log("🟢 Conectado ao Servidor Socket.");
      setIsOnline(true);
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log("🔴 Desconectado do Servidor");
      setIsOnline(false);
      setConnectionStatus('offline');
    });

    socket.on('connect_error', () => {
      if (socket.disconnected) {
        setIsOnline(false);
        setConnectionStatus('offline');
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [url]);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    connectionStatus,
    setConnectionStatus,
    isOnline,
    emit,
    on
  };
}

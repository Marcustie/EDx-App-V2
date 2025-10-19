import { useEffect, useState, useRef, useCallback } from 'react';
import type { WebSocketEvent } from '@/types';

export function useWebSocket(serialNumber: string | null) {
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>(250);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!serialNumber || wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/device/${serialNumber}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectTimeoutRef.current = 250;
    };
    
    ws.onmessage = (event) => {
      console.log('?? RAW WS MESSAGE:', event.data);
      try {
        const data = JSON.parse(event.data);
        setEvents((prev) => [...prev, data]);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;

      if (shouldReconnectRef.current) {
        setTimeout(() => {
          reconnectTimeoutRef.current = Math.min(reconnectTimeoutRef.current * 2, 5000);
          connect();
        }, reconnectTimeoutRef.current);
      }
    };
    
    wsRef.current = ws;
  }, [serialNumber]);

  useEffect(() => {
    if (serialNumber) {
      shouldReconnectRef.current = true;
      connect();
    }

    return () => {
      shouldReconnectRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [serialNumber, connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, isConnected, clearEvents };
}

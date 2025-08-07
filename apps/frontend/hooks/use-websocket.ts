'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  socket: WebSocket | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
  lastMessage: WebSocketMessage | null;
  errorCount: number;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    autoConnect = true,
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  >('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    try {
      setConnectionState('connecting');
      const ws = new WebSocket(url);

      ws.onopen = event => {
        setConnectionState('connected');
        setErrorCount(0);
        reconnectCountRef.current = 0;
        onOpen?.(event);

        // Send authentication message if needed
        const token = localStorage.getItem('authToken');
        if (token) {
          ws.send(
            JSON.stringify({
              type: 'auth',
              token,
              timestamp: new Date().toISOString(),
            })
          );
        }
      };

      ws.onmessage = event => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = event => {
        setConnectionState('disconnected');
        onClose?.(event);

        // Attempt to reconnect if not manually closed and within retry limit
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          setConnectionState('reconnecting');

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = event => {
        setErrorCount(prev => prev + 1);
        onError?.(event);
      };

      setSocket(ws);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionState('disconnected');
    }
  }, [url, onMessage, onError, onOpen, onClose, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (socket) {
      socket.close(1000, 'Manual disconnect');
    }

    setSocket(null);
    setConnectionState('disconnected');
    reconnectCountRef.current = 0;
  }, [socket]);

  const sendMessage = useCallback(
    (message: any) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const wsMessage: WebSocketMessage = {
          type: message.type || 'message',
          data: message,
          timestamp: new Date().toISOString(),
        };
        socket.send(JSON.stringify(wsMessage));
      } else {
        console.warn('WebSocket is not connected. Cannot send message.');
      }
    },
    [socket]
  );

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket,
    connectionState,
    sendMessage,
    connect,
    disconnect,
    lastMessage,
    errorCount,
  };
}

// Hook for face recognition events
export function useFaceRecognitionWebSocket() {
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    recognizedEvents: 0,
    unknownEvents: 0,
    failedEvents: 0,
    averageConfidence: 0,
  });

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'recognition_event':
        setEvents(prev => [message.data, ...prev.slice(0, 99)]); // Keep last 100 events
        break;

      case 'stats_update':
        setStats(message.data);
        break;

      case 'initial_events':
        setEvents(message.data.events);
        setStats(message.data.stats);
        break;

      default:
        console.log('Unhandled WebSocket message type:', message.type);
    }
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error('WebSocket error:', error);
  }, []);

  const ws = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws/face-recognition',
    onMessage: handleMessage,
    onError: handleError,
    onOpen: () => console.log('WebSocket connected'),
    onClose: () => console.log('WebSocket disconnected'),
    reconnectAttempts: 10,
    reconnectInterval: 5000,
  });

  return {
    ...ws,
    events,
    stats,
    connectionState: ws.connectionState,
  };
}

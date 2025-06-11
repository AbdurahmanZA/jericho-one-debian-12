
import { useState, useEffect, useCallback, useRef } from 'react';
import AsteriskAMIClient from '../services/asteriskAMI';

interface AMIEvent {
  event: string;
  [key: string]: string | undefined;
}

interface AMIConfig {
  host: string;
  port: string;
  username: string;
  password: string;
}

export const useAsteriskAMI = (config: AMIConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastEvent, setLastEvent] = useState<AMIEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [callEvents, setCallEvents] = useState<AMIEvent[]>([]);
  
  const clientRef = useRef<AsteriskAMIClient | null>(null);

  const handleEvent = useCallback((event: AMIEvent) => {
    console.log('AMI Event:', event);
    setLastEvent(event);
    
    // Track call-related events
    if (event.event && ['Newchannel', 'Hangup', 'Bridge', 'DialBegin', 'DialEnd'].includes(event.event)) {
      setCallEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
    }
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    if (!connected) {
      setConnectionError('Connection lost');
    } else {
      setConnectionError(null);
    }
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    if (isConnecting || isConnected) return false;
    
    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Disconnect existing client if any
      if (clientRef.current) {
        clientRef.current.disconnect();
      }

      // Create new client
      clientRef.current = new AsteriskAMIClient(
        config.host,
        config.port,
        config.username,
        config.password
      );

      // Set up listeners
      clientRef.current.addEventListener(handleEvent);
      clientRef.current.addConnectionListener(handleConnectionChange);

      // Attempt connection
      const success = await clientRef.current.connect();
      
      if (success) {
        console.log('AMI connection established successfully');
        return true;
      } else {
        throw new Error('Failed to establish AMI connection');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setConnectionError(errorMessage);
      console.error('AMI connection error:', errorMessage);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [config, isConnecting, isConnected, handleEvent, handleConnectionChange]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const originateCall = useCallback(async (channel: string, extension: string, context: string = 'from-internal'): Promise<boolean> => {
    if (!clientRef.current) return false;
    return await clientRef.current.originateCall(channel, extension, context);
  }, []);

  const getActiveChannels = useCallback(async (): Promise<void> => {
    if (!clientRef.current) return;
    await clientRef.current.getActiveChannels();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    lastEvent,
    callEvents,
    connectionError,
    connect,
    disconnect,
    originateCall,
    getActiveChannels
  };
};

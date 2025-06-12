
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { amiBridgeClient } from '@/services/amiBridgeClient';

interface AMIConfig {
  host: string;
  port: string;
  username: string;
  password: string;
}

interface AMIEvent {
  event: string;
  [key: string]: string | undefined;
}

interface PendingCall {
  leadName: string;
  phone: string;
  leadId: number;
}

interface AMIContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastEvent: AMIEvent | null;
  callEvents: AMIEvent[];
  config: AMIConfig;
  pendingCall: PendingCall | null;
  userExtension: string;
  updateConfig: (newConfig: AMIConfig) => void;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  originateCall: (channel: string, extension: string, context?: string, callerID?: string) => Promise<boolean>;
  initiateCallFromLead: (leadName: string, phone: string, leadId: number) => void;
  clearPendingCall: () => void;
}

const AMIContext = createContext<AMIContextType | undefined>(undefined);

export const useAMIContext = () => {
  const context = useContext(AMIContext);
  if (!context) {
    throw new Error('useAMIContext must be used within an AMIProvider');
  }
  return context;
};

interface AMIProviderProps {
  children: ReactNode;
}

export const AMIProvider: React.FC<AMIProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<AMIEvent | null>(null);
  const [callEvents, setCallEvents] = useState<AMIEvent[]>([]);
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);
  const [config, setConfig] = useState<AMIConfig>({
    host: localStorage.getItem('ami_host') || '127.0.0.1',
    port: localStorage.getItem('ami_port') || '5038',
    username: localStorage.getItem('ami_username') || 'crm-user',
    password: localStorage.getItem('ami_password') || ''
  });

  // Generate user extension based on current user
  const userExtension = localStorage.getItem('current_user_extension') || '1001';

  useEffect(() => {
    // Set up event listeners for AMI bridge
    const handleEvent = (event: AMIEvent) => {
      setLastEvent(event);
      
      // Track call-related events
      if (event.event && ['Newchannel', 'Hangup', 'DialBegin', 'DialEnd', 'Bridge'].includes(event.event)) {
        setCallEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
      }
    };

    const handleStatusChange = (connected: boolean) => {
      setIsConnected(connected);
      if (!connected) {
        setConnectionError('Connection lost');
      } else {
        setConnectionError(null);
      }
    };

    amiBridgeClient.onEvent(handleEvent);
    amiBridgeClient.onStatusChange(handleStatusChange);

    // Check initial status
    amiBridgeClient.getStatus().then(status => {
      setIsConnected(status.connected);
    });

    return () => {
      amiBridgeClient.removeEventListener(handleEvent);
      amiBridgeClient.removeStatusListener(handleStatusChange);
    };
  }, []);

  const updateConfig = (newConfig: AMIConfig) => {
    setConfig(newConfig);
    // Save to localStorage (except password)
    localStorage.setItem('ami_host', newConfig.host);
    localStorage.setItem('ami_port', newConfig.port);
    localStorage.setItem('ami_username', newConfig.username);
  };

  const connect = async (): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const success = await amiBridgeClient.connect(config);
      
      if (success) {
        setIsConnected(true);
        setConnectionError(null);
      } else {
        setConnectionError('Failed to connect to AMI Bridge');
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setConnectionError(errorMessage);
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (): Promise<boolean> => {
    try {
      const success = await amiBridgeClient.disconnect();
      setIsConnected(false);
      setConnectionError(null);
      setCallEvents([]);
      setLastEvent(null);
      setPendingCall(null);
      return success;
    } catch (error) {
      console.error('Disconnect error:', error);
      return false;
    }
  };

  const originateCall = async (
    channel: string, 
    extension: string, 
    context = 'from-internal', 
    callerID?: string
  ): Promise<boolean> => {
    try {
      return await amiBridgeClient.originateCall({
        channel,
        extension,
        context,
        callerID
      });
    } catch (error) {
      console.error('Originate call error:', error);
      return false;
    }
  };

  const initiateCallFromLead = (leadName: string, phone: string, leadId: number) => {
    setPendingCall({ leadName, phone, leadId });
  };

  const clearPendingCall = () => {
    setPendingCall(null);
  };

  const contextValue: AMIContextType = {
    isConnected,
    isConnecting,
    connectionError,
    lastEvent,
    callEvents,
    config,
    pendingCall,
    userExtension,
    updateConfig,
    connect,
    disconnect,
    originateCall,
    initiateCallFromLead,
    clearPendingCall
  };

  return (
    <AMIContext.Provider value={contextValue}>
      {children}
    </AMIContext.Provider>
  );
};

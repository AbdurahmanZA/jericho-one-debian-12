
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
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  updateConfig: (newConfig: AMIConfig) => void;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  originateCall: (channel: string, extension: string, context?: string, callerID?: string) => Promise<boolean>;
  initiateCallFromLead: (leadName: string, phone: string, leadId: number) => void;
  clearPendingCall: () => void;
  resetReconnectAttempts: () => void;
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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [reconnectTimeout, setReconnectTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const maxReconnectAttempts = 5;
  
  // Updated configuration for AMI Bridge to FreePBX
  const [config, setConfig] = useState<AMIConfig>({
    host: '192.168.0.5',
    port: '5038',
    username: 'crm-user',
    password: '70159b4d49108ee8a6d1527edee2d8b50310358f'
  });

  // Fix user extension assignment - use stored extension or default to 1000
  const userExtension = localStorage.getItem('user_extension') || '1000';

  // Monitor user login status
  useEffect(() => {
    const checkLoginStatus = () => {
      const user = localStorage.getItem('crm_user');
      const isLoggedIn = !!user;
      
      if (isLoggedIn !== isUserLoggedIn) {
        setIsUserLoggedIn(isLoggedIn);
        
        if (!isLoggedIn) {
          // User logged out - disconnect AMI
          console.log('[AMI Context] User logged out, disconnecting AMI');
          disconnect();
        } else if (isLoggedIn && !isConnected && !isConnecting) {
          // User logged in - auto-connect
          console.log('[AMI Context] User logged in, auto-connecting AMI');
          connect();
        }
      }
    };

    // Check immediately
    checkLoginStatus();
    
    // Poll for login status changes
    const interval = setInterval(checkLoginStatus, 1000);
    
    return () => clearInterval(interval);
  }, [isUserLoggedIn, isConnected, isConnecting]);

  // Auto-reconnect logic
  const scheduleReconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log('[AMI Context] Max reconnection attempts reached');
      setConnectionError(`Failed to reconnect after ${maxReconnectAttempts} attempts. Please check the AMI Bridge server.`);
      return;
    }

    if (!isUserLoggedIn) {
      console.log('[AMI Context] User not logged in, skipping reconnect');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
    console.log(`[AMI Context] Scheduling reconnect attempt ${reconnectAttempts + 1} in ${delay}ms`);
    
    const timeout = setTimeout(async () => {
      if (isUserLoggedIn && !isConnected && !isConnecting) {
        setReconnectAttempts(prev => prev + 1);
        const success = await connect();
        if (!success) {
          scheduleReconnect();
        }
      }
    }, delay);
    
    setReconnectTimeout(timeout);
  };

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
      console.log(`[AMI Context] Bridge status change: ${connected}`);
      
      if (connected && !isConnected) {
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          setReconnectTimeout(null);
        }
      } else if (!connected && isConnected && isUserLoggedIn) {
        setIsConnected(false);
        setConnectionError('Bridge connection lost');
        // Schedule reconnection
        scheduleReconnect();
      }
    };

    amiBridgeClient.onEvent(handleEvent);
    amiBridgeClient.onStatusChange(handleStatusChange);

    return () => {
      amiBridgeClient.removeEventListener(handleEvent);
      amiBridgeClient.removeStatusListener(handleStatusChange);
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [isConnected, isUserLoggedIn, reconnectAttempts, reconnectTimeout]);

  const updateConfig = (newConfig: AMIConfig) => {
    setConfig(newConfig);
  };

  const connect = async (): Promise<boolean> => {
    if (!isUserLoggedIn) {
      console.log('[AMI Context] Cannot connect - user not logged in');
      return false;
    }

    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log('[AMI Context] Connecting to AMI Bridge with config:', {
        serverUrl: 'http://192.168.0.5:3001',
        amiHost: config.host,
        amiPort: config.port,
        amiUser: config.username,
        attempt: reconnectAttempts + 1
      });
      
      const success = await amiBridgeClient.connect(config);
      
      if (success) {
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        console.log('[AMI Context] Successfully connected to AMI Bridge');
      } else {
        setConnectionError('Failed to connect to AMI Bridge at 192.168.0.5:3001');
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setConnectionError(errorMessage);
      setIsConnected(false);
      console.error('[AMI Context] Connection error:', errorMessage);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (): Promise<boolean> => {
    try {
      // Clear any pending reconnect attempts
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        setReconnectTimeout(null);
      }
      
      const success = await amiBridgeClient.disconnect();
      setIsConnected(false);
      setConnectionError(null);
      setCallEvents([]);
      setLastEvent(null);
      setPendingCall(null);
      setReconnectAttempts(0);
      return success;
    } catch (error) {
      console.error('Disconnect error:', error);
      return false;
    }
  };

  const resetReconnectAttempts = () => {
    setReconnectAttempts(0);
    setConnectionError(null);
  };

  const originateCall = async (
    channel: string, 
    extension: string, 
    context = 'from-internal', 
    callerID?: string
  ): Promise<boolean> => {
    try {
      console.log('[AMI Context] Originating call via bridge:', {
        channel,
        extension,
        context,
        callerID,
        userExtension
      });
      
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
    reconnectAttempts,
    maxReconnectAttempts,
    updateConfig,
    connect,
    disconnect,
    originateCall,
    initiateCallFromLead,
    clearPendingCall,
    resetReconnectAttempts
  };

  return (
    <AMIContext.Provider value={contextValue}>
      {children}
    </AMIContext.Provider>
  );
};

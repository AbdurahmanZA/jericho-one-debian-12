
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DirectAMIClient } from '@/services/directAMI';

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
  const [amiClient, setAmiClient] = useState<DirectAMIClient | null>(null);
  
  const maxReconnectAttempts = 5;
  
  // Configuration for localhost FreePBX with direct AMI
  const [config, setConfig] = useState<AMIConfig>({
    host: '127.0.0.1',
    port: '5038',
    username: 'jericho-ami',
    password: 'jericho123!'
  });

  // Get user extension from local storage or default
  const userExtension = localStorage.getItem('user_extension') || '1000';

  // Monitor user login status
  useEffect(() => {
    const checkLoginStatus = () => {
      const user = localStorage.getItem('crm_user');
      const isLoggedIn = !!user;
      
      if (isLoggedIn !== isUserLoggedIn) {
        setIsUserLoggedIn(isLoggedIn);
        
        if (!isLoggedIn) {
          console.log('[AMI Context] User logged out, disconnecting direct AMI');
          disconnect();
        } else if (isLoggedIn && !isConnected && !isConnecting) {
          console.log('[AMI Context] User logged in, auto-connecting direct AMI');
          connect();
        }
      }
    };

    checkLoginStatus();
    const interval = setInterval(checkLoginStatus, 1000);
    return () => clearInterval(interval);
  }, [isUserLoggedIn, isConnected, isConnecting]);

  // Set up AMI client and event listeners
  useEffect(() => {
    if (!amiClient) {
      const client = new DirectAMIClient(config);
      setAmiClient(client);
      
      // Set up event listeners
      const handleEvent = (event: AMIEvent) => {
        setLastEvent(event);
        
        // Track call-related events
        if (event.event && ['Newchannel', 'Hangup', 'DialBegin', 'DialEnd', 'Bridge'].includes(event.event)) {
          setCallEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
        }
      };

      const handleStatusChange = (connected: boolean) => {
        console.log(`[AMI Context] Direct AMI status change: ${connected}`);
        setIsConnected(connected);
        
        if (connected) {
          setConnectionError(null);
          setReconnectAttempts(0);
        } else if (isUserLoggedIn) {
          setConnectionError('Direct AMI connection lost');
        }
      };

      client.addEventListener(handleEvent);
      client.addConnectionListener(handleStatusChange);
      
      return () => {
        client.removeEventListener(handleEvent);
        client.removeConnectionListener(handleStatusChange);
      };
    }
  }, [amiClient, config, isUserLoggedIn]);

  const updateConfig = (newConfig: AMIConfig) => {
    setConfig(newConfig);
    
    // Create new client with updated config
    if (amiClient) {
      amiClient.disconnect();
    }
    
    const newClient = new DirectAMIClient(newConfig);
    setAmiClient(newClient);
  };

  const connect = async (): Promise<boolean> => {
    if (!isUserLoggedIn) {
      console.log('[AMI Context] Cannot connect - user not logged in');
      return false;
    }

    if (!amiClient) {
      console.error('[AMI Context] No AMI client available');
      return false;
    }

    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log('[AMI Context] Connecting to localhost FreePBX AMI:', {
        host: config.host,
        port: config.port,
        username: config.username,
        attempt: reconnectAttempts + 1
      });
      
      const success = await amiClient.connect();
      
      if (success) {
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        console.log('[AMI Context] Successfully connected to FreePBX AMI via direct connection');
      } else {
        setConnectionError(`Failed to connect to FreePBX AMI at ${config.host}:${config.port}`);
      }
      
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setConnectionError(errorMessage);
      setIsConnected(false);
      console.error('[AMI Context] Direct AMI connection error:', errorMessage);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (): Promise<boolean> => {
    try {
      if (amiClient) {
        amiClient.disconnect();
      }
      
      setIsConnected(false);
      setConnectionError(null);
      setCallEvents([]);
      setLastEvent(null);
      setPendingCall(null);
      setReconnectAttempts(0);
      return true;
    } catch (error) {
      console.error('Direct AMI disconnect error:', error);
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
    if (!amiClient) {
      console.error('[AMI Context] No AMI client available for originate call');
      return false;
    }

    try {
      console.log('[AMI Context] Originating call via direct AMI:', {
        channel,
        extension,
        context,
        callerID,
        userExtension
      });
      
      return await amiClient.originateCall(channel, extension, context);
    } catch (error) {
      console.error('Direct AMI originate call error:', error);
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

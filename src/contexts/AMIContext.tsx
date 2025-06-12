
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAsteriskAMI } from '@/hooks/useAsteriskAMI';
import { useAuth } from '@/contexts/AuthContext';

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

interface PendingCall {
  leadName: string;
  phone: string;
  leadId: number;
  timestamp: number;
}

interface AMIContextType {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: AMIEvent | null;
  callEvents: AMIEvent[];
  connectionError: string | null;
  config: AMIConfig;
  pendingCall: PendingCall | null;
  userExtension: string;
  updateConfig: (newConfig: AMIConfig) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  originateCall: (channel: string, extension: string, context?: string) => Promise<boolean>;
  getActiveChannels: () => Promise<void>;
  initiateCallFromLead: (leadName: string, phone: string, leadId: number) => void;
  clearPendingCall: () => void;
}

const AMIContext = createContext<AMIContextType | undefined>(undefined);

interface AMIProviderProps {
  children: ReactNode;
}

export const AMIProvider = ({ children }: AMIProviderProps) => {
  const { user } = useAuth();
  
  const [config, setConfig] = useState<AMIConfig>({
    host: '192.168.0.5',
    port: '5038',
    username: 'crm-user',
    password: '70159b4d49108ee8a6d1527edee2d8b50310358f'
  });

  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);
  const [userExtension, setUserExtension] = useState<string>('1000');

  const amiHook = useAsteriskAMI(config);

  // Auto-connect on user login and set user extension
  useEffect(() => {
    if (user && !amiHook.isConnected && !amiHook.isConnecting) {
      console.log(`🔄 [AMI] Auto-connecting for user: ${user.name} (${user.email})`);
      
      // Set user-specific extension based on user data
      const extension = getUserExtension(user);
      setUserExtension(extension);
      localStorage.setItem('user_extension', extension);
      
      console.log(`📞 [AMI] Setting extension for ${user.name}: ${extension}`);
      
      // Auto-connect AMI
      amiHook.connect().then(success => {
        if (success) {
          console.log(`✅ [AMI] Auto-connected successfully for user: ${user.name}`);
        } else {
          console.log(`❌ [AMI] Auto-connect failed for user: ${user.name}`);
        }
      });
    }
  }, [user, amiHook.isConnected, amiHook.isConnecting]);

  // Function to determine user extension based on user data
  const getUserExtension = (user: any): string => {
    // Check if user has a predefined extension in their profile
    if (user.extension) {
      return user.extension;
    }
    
    // Map users to extensions based on their ID or role
    const extensionMap: { [key: string]: string } = {
      '1': '1000', // Admin
      '2': '1001', // Manager
      '3': '1002', // Agent 1
      '4': '1003', // Agent 2
      'admin@abdurahman.co.za': '1000',
      'manager@abdurahman.co.za': '1001',
      'agent@abdurahman.co.za': '1002'
    };
    
    // Try to get extension by user ID first, then by email
    return extensionMap[user.id] || extensionMap[user.email] || '1000';
  };

  const updateConfig = (newConfig: AMIConfig) => {
    setConfig(newConfig);
    // Save to localStorage
    localStorage.setItem('ami_host', newConfig.host);
    localStorage.setItem('ami_port', newConfig.port);
    localStorage.setItem('ami_username', newConfig.username);
    if (newConfig.password) {
      localStorage.setItem('ami_password', newConfig.password);
    }
  };

  const initiateCallFromLead = (leadName: string, phone: string, leadId: number) => {
    console.log('Initiating call from lead:', { leadName, phone, leadId });
    console.log(`📞 [AMI] User ${user?.name} (ext: ${userExtension}) initiating call to ${phone}`);
    
    setPendingCall({
      leadName,
      phone,
      leadId,
      timestamp: Date.now()
    });
  };

  const clearPendingCall = () => {
    setPendingCall(null);
  };

  // Enhanced originate call that uses the current user's extension
  const originateCallWithUserExtension = async (targetPhone: string, context: string = 'from-internal'): Promise<boolean> => {
    if (!amiHook.isConnected) {
      console.error('❌ [AMI] Cannot originate call - AMI not connected');
      return false;
    }

    const userChannel = `PJSIP/${userExtension}`;
    console.log(`📞 [AMI] Originating call from user extension ${userExtension} to ${targetPhone}`);
    
    return await amiHook.originateCall(userChannel, targetPhone, context);
  };

  const value: AMIContextType = {
    ...amiHook,
    config,
    pendingCall,
    userExtension,
    updateConfig,
    initiateCallFromLead,
    clearPendingCall,
    // Override originateCall to use user's extension
    originateCall: originateCallWithUserExtension
  };

  return (
    <AMIContext.Provider value={value}>
      {children}
    </AMIContext.Provider>
  );
};

export const useAMIContext = () => {
  const context = useContext(AMIContext);
  if (context === undefined) {
    throw new Error('useAMIContext must be used within an AMIProvider');
  }
  return context;
};

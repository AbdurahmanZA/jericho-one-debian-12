
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAsteriskAMI } from '@/hooks/useAsteriskAMI';

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

interface AMIContextType {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent: AMIEvent | null;
  callEvents: AMIEvent[];
  connectionError: string | null;
  config: AMIConfig;
  updateConfig: (newConfig: AMIConfig) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  originateCall: (channel: string, extension: string, context?: string) => Promise<boolean>;
  getActiveChannels: () => Promise<void>;
}

const AMIContext = createContext<AMIContextType | undefined>(undefined);

interface AMIProviderProps {
  children: ReactNode;
}

export const AMIProvider = ({ children }: AMIProviderProps) => {
  const [config, setConfig] = useState<AMIConfig>({
    host: localStorage.getItem('ami_host') || '127.0.0.1',
    port: localStorage.getItem('ami_port') || '5038',
    username: localStorage.getItem('ami_username') || 'crm-user',
    password: localStorage.getItem('ami_password') || ''
  });

  const amiHook = useAsteriskAMI(config);

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

  const value: AMIContextType = {
    ...amiHook,
    config,
    updateConfig
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

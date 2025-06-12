
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AMIBridgeCard from "./integration/AMIBridgeCard";
import DatabaseConfigCard from "./integration/DatabaseConfigCard";
import IntegrationLogsCard from "./integration/IntegrationLogsCard";
import SyncSettingsCard from "./integration/SyncSettingsCard";
import SecuritySettingsCard from "./integration/SecuritySettingsCard";
import DiscordWebhookCard from "./integration/DiscordWebhookCard";

interface ConnectionStatus {
  amiBridge: 'connected' | 'disconnected' | 'testing';
  database: 'connected' | 'disconnected' | 'testing';
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface IntegrationConfig {
  database: {
    host: string;
    port: string;
    name: string;
    username: string;
    password: string;
  };
  sync: {
    autoSync: boolean;
    callLogging: boolean;
    notifications: boolean;
    syncInterval: number;
  };
  webhook: {
    url: string;
    secret: string;
  };
  discord: {
    url: string;
    channelName: string;
    enabled: boolean;
  };
}

const IntegrationSettings = () => {
  const { toast } = useToast();
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    amiBridge: 'disconnected',
    database: 'disconnected'
  });

  const [integrationLogs, setIntegrationLogs] = useState<LogEntry[]>([
    {
      timestamp: new Date().toISOString(),
      type: 'info',
      message: 'AMI Bridge integration system initialized'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      type: 'success',
      message: 'Using AMI Bridge for FreePBX communication'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      type: 'success',
      message: 'Bridge server configured for 192.168.0.5'
    }
  ]);

  const [config, setConfig] = useState<IntegrationConfig>({
    database: {
      host: localStorage.getItem('db_host') || 'localhost',
      port: localStorage.getItem('db_port') || '3306',
      name: localStorage.getItem('db_name') || 'crm_db',
      username: localStorage.getItem('db_username') || 'crm_user',
      password: ''
    },
    sync: {
      autoSync: localStorage.getItem('auto_sync') === 'true',
      callLogging: localStorage.getItem('call_logging') !== 'false',
      notifications: localStorage.getItem('notifications') === 'true',
      syncInterval: parseInt(localStorage.getItem('sync_interval') || '5')
    },
    webhook: {
      url: localStorage.getItem('webhook_url') || 'https://your-domain.com/webhook',
      secret: localStorage.getItem('webhook_secret') || ''
    },
    discord: {
      url: localStorage.getItem('discord_webhook') || '',
      channelName: localStorage.getItem('discord_channel') || '#leads',
      enabled: localStorage.getItem('discord_webhook_enabled') === 'true'
    }
  });

  useEffect(() => {
    testDatabaseConnection();
  }, []);

  const updateDatabaseConfig = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      database: {
        ...prev.database,
        [field]: value
      }
    }));
  };

  const updateSyncConfig = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      sync: {
        ...prev.sync,
        [field]: value
      }
    }));
  };

  const updateWebhookConfig = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      webhook: {
        ...prev.webhook,
        [field]: value
      }
    }));
  };

  const updateDiscordConfig = (field: string, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      discord: {
        ...prev.discord,
        [field]: value
      }
    }));
  };

  const testDatabaseConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, database: 'testing' }));
    addLogEntry('info', `Testing database connection to ${config.database.host}:${config.database.port}`);
    
    try {
      const response = await fetch('/api/test-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: config.database.host,
          port: config.database.port,
          database: config.database.name,
          username: config.database.username,
          password: config.database.password
        })
      });

      if (response.ok) {
        setConnectionStatus(prev => ({ ...prev, database: 'connected' }));
        addLogEntry('success', 'Database connection successful');
        toast({
          title: "Database Connected",
          description: "Successfully connected to CRM database.",
        });
        return true;
      } else {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: Database connection failed - ${errorData}`);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, database: 'disconnected' }));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLogEntry('error', 'Database connection failed', errorMessage);
      toast({
        title: "Database Connection Failed",
        description: "Could not connect to database. Check your settings.",
        variant: "destructive"
      });
      return false;
    }
  };

  const saveSettings = () => {
    // Save database settings
    Object.entries(config.database).forEach(([key, value]) => {
      if (key !== 'password') {
        localStorage.setItem(`db_${key}`, value);
      }
    });

    // Save sync settings
    Object.entries(config.sync).forEach(([key, value]) => {
      localStorage.setItem(key, value.toString());
    });

    // Save webhook settings
    Object.entries(config.webhook).forEach(([key, value]) => {
      if (key !== 'secret') {
        localStorage.setItem(`webhook_${key}`, value);
      }
    });

    // Save Discord settings
    localStorage.setItem('discord_webhook', config.discord.url);
    localStorage.setItem('discord_channel', config.discord.channelName);
    localStorage.setItem('discord_webhook_enabled', config.discord.enabled.toString());

    toast({
      title: "Settings Saved",
      description: "Your integration settings have been successfully updated.",
    });
  };

  const addLogEntry = (type: LogEntry['type'], message: string, details?: string) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    };
    setIntegrationLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep last 100 logs
  };

  const clearLogs = () => {
    setIntegrationLogs([{
      timestamp: new Date().toISOString(),
      type: 'info',
      message: 'Integration logs cleared'
    }]);
  };

  const handleAMIBridgeConnectionStatusChange = (status: 'connected' | 'disconnected' | 'testing') => {
    setConnectionStatus(prev => ({ ...prev, amiBridge: status }));
    
    if (status === 'connected') {
      addLogEntry('success', 'AMI Bridge connection established', 'Successfully connected to FreePBX AMI interface via bridge server');
    } else if (status === 'disconnected') {
      addLogEntry('warning', 'AMI Bridge connection ended', 'Connection to AMI bridge server was terminated');
    } else {
      addLogEntry('info', 'Testing AMI Bridge connection...', 'Attempting to establish connection to bridge server');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Production Integration Settings - AMI Bridge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AMIBridgeCard 
              connectionStatus={connectionStatus.amiBridge}
              onTestConnection={() => {}}
              onConnectionStatusChange={handleAMIBridgeConnectionStatusChange}
            />

            <DatabaseConfigCard 
              config={config.database}
              connectionStatus={connectionStatus.database}
              onConfigUpdate={updateDatabaseConfig}
              onTestConnection={testDatabaseConnection}
            />

            <IntegrationLogsCard 
              logs={integrationLogs}
              onClearLogs={clearLogs}
            />
          </div>

          <SyncSettingsCard 
            config={config.sync}
            onConfigUpdate={updateSyncConfig}
          />

          <DiscordWebhookCard 
            config={config.discord}
            onConfigUpdate={updateDiscordConfig}
          />

          <SecuritySettingsCard 
            config={config.webhook}
            onConfigUpdate={updateWebhookConfig}
          />

          <div className="flex gap-4">
            <Button onClick={saveSettings} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
            <Button 
              variant="outline" 
              onClick={testDatabaseConnection}
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Test Database Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationSettings;

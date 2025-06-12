
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAMIContext } from "@/contexts/AMIContext";
import AsteriskAMICard from "./integration/AsteriskAMICard";
import FreePBXAPICard from "./integration/FreePBXAPICard";
import DatabaseConfigCard from "./integration/DatabaseConfigCard";
import IntegrationLogsCard from "./integration/IntegrationLogsCard";
import SyncSettingsCard from "./integration/SyncSettingsCard";
import SecuritySettingsCard from "./integration/SecuritySettingsCard";

interface ConnectionStatus {
  ami: 'connected' | 'disconnected' | 'testing';
  freepbxAPI: 'connected' | 'disconnected' | 'testing';
  database: 'connected' | 'disconnected' | 'testing';
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface IntegrationConfig {
  freepbxAPI: {
    host: string;
    port: string;
    username: string;
    password: string;
    apiKey: string;
  };
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
}

const IntegrationSettings = () => {
  const { toast } = useToast();
  const { isConnected: amiConnected } = useAMIContext();
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    ami: amiConnected ? 'connected' : 'disconnected',
    freepbxAPI: 'disconnected',
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
      message: 'Using AMI Bridge for all connections'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      type: 'success',
      message: 'Direct AMI and API connections removed - now using bridge'
    }
  ]);

  const [config, setConfig] = useState<IntegrationConfig>({
    freepbxAPI: {
      host: localStorage.getItem('freepbx_host') || '192.168.1.101',
      port: localStorage.getItem('freepbx_port') || '80',
      username: localStorage.getItem('freepbx_username') || 'admin',
      password: '',
      apiKey: localStorage.getItem('freepbx_api_key') || ''
    },
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
    }
  });

  useEffect(() => {
    setConnectionStatus(prev => ({ ...prev, ami: amiConnected ? 'connected' : 'disconnected' }));
  }, [amiConnected]);

  useEffect(() => {
    testOtherConnections();
  }, []);

  const updateFreePBXAPIConfig = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      freepbxAPI: {
        ...prev.freepbxAPI,
        [field]: value
      }
    }));
  };

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

  const testFreePBXAPIConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, freepbxAPI: 'testing' }));
    addLogEntry('info', `Testing FreePBX API connection to ${config.freepbxAPI.host}:${config.freepbxAPI.port}`);
    
    try {
      const protocol = config.freepbxAPI.port === '443' ? 'https' : 'http';
      const url = `${protocol}://${config.freepbxAPI.host}:${config.freepbxAPI.port}/admin/api.php`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module: 'sipsettings',
          command: 'getall',
          token: config.freepbxAPI.apiKey || undefined
        })
      });

      if (response.ok) {
        setConnectionStatus(prev => ({ ...prev, freepbxAPI: 'connected' }));
        addLogEntry('success', 'FreePBX API connection successful');
        toast({
          title: "FreePBX API Connected",
          description: "Successfully connected to FreePBX web interface.",
        });
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, freepbxAPI: 'disconnected' }));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLogEntry('error', `FreePBX API connection failed: ${errorMessage}`);
      toast({
        title: "FreePBX API Connection Failed",
        description: "Check FreePBX web interface and API settings.",
        variant: "destructive"
      });
      return false;
    }
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
        throw new Error(`HTTP ${response.status}: Database connection failed`);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, database: 'disconnected' }));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLogEntry('error', `Database connection failed: ${errorMessage}`);
      toast({
        title: "Database Connection Failed",
        description: "Could not connect to database. Check your settings.",
        variant: "destructive"
      });
      return false;
    }
  };

  const testOtherConnections = async () => {
    await Promise.all([
      testFreePBXAPIConnection(),
      testDatabaseConnection()
    ]);
  };

  const saveSettings = () => {
    // Save FreePBX API settings
    Object.entries(config.freepbxAPI).forEach(([key, value]) => {
      if (key !== 'password') {
        localStorage.setItem(`freepbx_${key}`, value);
      }
    });

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

    toast({
      title: "Settings Saved",
      description: "Your integration settings have been successfully updated.",
    });
  };

  const addLogEntry = (type: LogEntry['type'], message: string) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    setIntegrationLogs(prev => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  const clearLogs = () => {
    setIntegrationLogs([]);
  };

  const handleAMIConnectionStatusChange = (status: 'connected' | 'disconnected' | 'testing') => {
    setConnectionStatus(prev => ({ ...prev, ami: status }));
    
    if (status === 'connected') {
      addLogEntry('success', 'AMI Bridge connection established');
    } else if (status === 'disconnected') {
      addLogEntry('warning', 'AMI Bridge connection ended');
    } else {
      addLogEntry('info', 'Testing AMI Bridge connection...');
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
            <AsteriskAMICard 
              connectionStatus={connectionStatus.ami}
              onTestConnection={() => {}}
              onConnectionStatusChange={handleAMIConnectionStatusChange}
            />

            <FreePBXAPICard 
              config={config.freepbxAPI}
              connectionStatus={connectionStatus.freepbxAPI}
              onConfigUpdate={updateFreePBXAPIConfig}
              onTestConnection={testFreePBXAPIConnection}
            />

            <IntegrationLogsCard 
              logs={integrationLogs}
              onClearLogs={clearLogs}
            />
          </div>

          <DatabaseConfigCard 
            config={config.database}
            connectionStatus={connectionStatus.database}
            onConfigUpdate={updateDatabaseConfig}
            onTestConnection={testDatabaseConnection}
          />

          <SyncSettingsCard 
            config={config.sync}
            onConfigUpdate={updateSyncConfig}
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
              onClick={testOtherConnections}
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Test Other Connections
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationSettings;

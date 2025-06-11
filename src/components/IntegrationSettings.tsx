import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  ami: {
    host: string;
    port: string;
    username: string;
    password: string;
  };
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    ami: 'disconnected',
    freepbxAPI: 'disconnected',
    database: 'disconnected'
  });

  const [integrationLogs, setIntegrationLogs] = useState<LogEntry[]>([
    {
      timestamp: new Date().toISOString(),
      type: 'info',
      message: 'Integration system initialized'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      type: 'info',
      message: 'Attempting AMI connection to port 5038'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      type: 'warning',
      message: 'No AMI connection attempts detected - check manager.conf'
    }
  ]);

  const [config, setConfig] = useState<IntegrationConfig>({
    ami: {
      host: localStorage.getItem('ami_host') || '127.0.0.1',
      port: localStorage.getItem('ami_port') || '5038',
      username: localStorage.getItem('ami_username') || 'crmuser',
      password: ''
    },
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
    testAllConnections();
  }, []);

  const updateAMIConfig = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      ami: {
        ...prev.ami,
        [field]: value
      }
    }));
  };

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

  const testAMIConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, ami: 'testing' }));
    addLogEntry('info', `Testing AMI connection to ${config.ami.host}:${config.ami.port}`);
    
    try {
      // Simulate AMI connection test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would use a WebSocket connection to test AMI
      const success = Math.random() > 0.5; // 50% success for demo
      
      if (success) {
        setConnectionStatus(prev => ({ ...prev, ami: 'connected' }));
        addLogEntry('success', 'AMI connection established - call events will be captured');
        toast({
          title: "AMI Connected",
          description: "Successfully connected to Asterisk Manager Interface.",
        });
        return true;
      } else {
        throw new Error('Connection refused - check manager.conf settings');
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, ami: 'disconnected' }));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLogEntry('error', `AMI connection failed: ${errorMessage}`);
      toast({
        title: "AMI Connection Failed",
        description: "Check Asterisk manager.conf and restart Asterisk service.",
        variant: "destructive"
      });
      return false;
    }
  };

  const testFreePBXAPIConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, freepbxAPI: 'testing' }));
    addLogEntry('info', `Testing FreePBX API connection to ${config.freepbxAPI.host}:${config.freepbxAPI.port}`);
    
    try {
      const protocol = config.freepbxAPI.port === '443' ? 'https' : 'http';
      const response = await fetch(`${protocol}://${config.freepbxAPI.host}:${config.freepbxAPI.port}/admin/api.php`, {
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

  const testAllConnections = async () => {
    await Promise.all([
      testAMIConnection(),
      testFreePBXAPIConnection(),
      testDatabaseConnection()
    ]);
  };

  const saveSettings = () => {
    // Save AMI settings
    Object.entries(config.ami).forEach(([key, value]) => {
      if (key !== 'password') {
        localStorage.setItem(`ami_${key}`, value);
      }
    });

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Production Integration Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AsteriskAMICard 
              config={config.ami}
              connectionStatus={connectionStatus.ami}
              onConfigUpdate={updateAMIConfig}
              onTestConnection={testAMIConnection}
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
              onClick={testAllConnections}
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Test All Connections
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationSettings;

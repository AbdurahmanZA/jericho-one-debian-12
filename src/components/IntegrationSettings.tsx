
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Save, TestTube } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FreePBXConfigCard from "./integration/FreePBXConfigCard";
import DatabaseConfigCard from "./integration/DatabaseConfigCard";
import IntegrationLogsCard from "./integration/IntegrationLogsCard";
import SyncSettingsCard from "./integration/SyncSettingsCard";
import SecuritySettingsCard from "./integration/SecuritySettingsCard";

interface ConnectionStatus {
  freepbx: 'connected' | 'disconnected' | 'testing';
  database: 'connected' | 'disconnected' | 'testing';
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface IntegrationConfig {
  freepbx: {
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
    freepbx: 'disconnected',
    database: 'disconnected'
  });

  const [integrationLogs, setIntegrationLogs] = useState<LogEntry[]>([
    {
      timestamp: new Date().toISOString(),
      type: 'info',
      message: 'FreePBX integration initialized'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      type: 'success',
      message: 'AMI connection established on port 5038'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      type: 'warning',
      message: 'Connection timeout - retrying in 30 seconds'
    },
    {
      timestamp: new Date(Date.now() - 180000).toISOString(),
      type: 'info',
      message: 'Testing connection to 127.0.0.1:5038'
    }
  ]);

  const [config, setConfig] = useState<IntegrationConfig>({
    freepbx: {
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

  const updateFreePBXConfig = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      freepbx: {
        ...prev.freepbx,
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

  const testFreePBXConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, freepbx: 'testing' }));
    addLogEntry('info', `Testing FreePBX connection to ${config.freepbx.host}:${config.freepbx.port}`);
    
    try {
      const response = await fetch(`http://${config.freepbx.host}:${config.freepbx.port}/admin/api.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module: 'sipsettings',
          command: 'getall',
          token: config.freepbx.apiKey
        })
      });

      if (response.ok) {
        setConnectionStatus(prev => ({ ...prev, freepbx: 'connected' }));
        addLogEntry('success', 'FreePBX connection successful - API responding');
        toast({
          title: "FreePBX Connected",
          description: "Successfully connected to FreePBX server.",
        });
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, freepbx: 'disconnected' }));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLogEntry('error', `FreePBX connection failed: ${errorMessage}`);
      toast({
        title: "FreePBX Connection Failed",
        description: "Could not connect to FreePBX. Check your settings.",
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
      testFreePBXConnection(),
      testDatabaseConnection()
    ]);
  };

  const saveSettings = () => {
    // Save to localStorage (in production, save to backend)
    Object.entries(config.freepbx).forEach(([key, value]) => {
      if (key !== 'password') {
        localStorage.setItem(`freepbx_${key}`, value);
      }
    });

    Object.entries(config.database).forEach(([key, value]) => {
      if (key !== 'password') {
        localStorage.setItem(`db_${key}`, value);
      }
    });

    Object.entries(config.sync).forEach(([key, value]) => {
      localStorage.setItem(key, value.toString());
    });

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
            <FreePBXConfigCard 
              config={config.freepbx}
              connectionStatus={connectionStatus.freepbx}
              onConfigUpdate={updateFreePBXConfig}
              onTestConnection={testFreePBXConnection}
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

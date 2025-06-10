
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Database, 
  Phone, 
  Wifi, 
  Shield, 
  CheckCircle,
  AlertTriangle,
  Save,
  TestTube,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConnectionStatus {
  freepbx: 'connected' | 'disconnected' | 'testing';
  database: 'connected' | 'disconnected' | 'testing';
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

  // Test connections on component mount
  useEffect(() => {
    testAllConnections();
  }, []);

  const updateConfig = (section: keyof IntegrationConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const testFreePBXConnection = async () => {
    setConnectionStatus(prev => ({ ...prev, freepbx: 'testing' }));
    
    try {
      // Simulate API call to FreePBX
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
        toast({
          title: "FreePBX Connected",
          description: "Successfully connected to FreePBX server.",
        });
        return true;
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, freepbx: 'disconnected' }));
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
    
    try {
      // In production, this would call your backend API to test DB connection
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
        toast({
          title: "Database Connected",
          description: "Successfully connected to CRM database.",
        });
        return true;
      } else {
        throw new Error('Database connection failed');
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, database: 'disconnected' }));
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

  const getStatusBadge = (status: 'connected' | 'disconnected' | 'testing') => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'testing':
        return (
          <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Testing...
          </Badge>
        );
      default:
        return (
          <Badge className="flex items-center gap-1 bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3" />
            Disconnected
          </Badge>
        );
    }
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  FreePBX Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pbx-host">FreePBX Host</Label>
                  <Input 
                    id="pbx-host" 
                    value={config.freepbx.host}
                    onChange={(e) => updateConfig('freepbx', 'host', e.target.value)}
                    placeholder="IP or hostname"
                  />
                </div>
                <div>
                  <Label htmlFor="pbx-port">Port</Label>
                  <Input 
                    id="pbx-port" 
                    value={config.freepbx.port}
                    onChange={(e) => updateConfig('freepbx', 'port', e.target.value)}
                    placeholder="Port number"
                  />
                </div>
                <div>
                  <Label htmlFor="pbx-username">Username</Label>
                  <Input 
                    id="pbx-username" 
                    value={config.freepbx.username}
                    onChange={(e) => updateConfig('freepbx', 'username', e.target.value)}
                    placeholder="FreePBX username"
                  />
                </div>
                <div>
                  <Label htmlFor="pbx-password">Password</Label>
                  <Input 
                    id="pbx-password" 
                    type="password" 
                    value={config.freepbx.password}
                    onChange={(e) => updateConfig('freepbx', 'password', e.target.value)}
                    placeholder="FreePBX password"
                  />
                </div>
                <div>
                  <Label htmlFor="pbx-api-key">API Key</Label>
                  <Input 
                    id="pbx-api-key" 
                    value={config.freepbx.apiKey}
                    onChange={(e) => updateConfig('freepbx', 'apiKey', e.target.value)}
                    placeholder="FreePBX API key"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connection Status</span>
                  {getStatusBadge(connectionStatus.freepbx)}
                </div>
                <Button 
                  variant="outline" 
                  onClick={testFreePBXConnection}
                  disabled={connectionStatus.freepbx === 'testing'}
                  className="w-full"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test FreePBX Connection
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  CRM Database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="db-host">Database Host</Label>
                  <Input 
                    id="db-host" 
                    value={config.database.host}
                    onChange={(e) => updateConfig('database', 'host', e.target.value)}
                    placeholder="Database hostname"
                  />
                </div>
                <div>
                  <Label htmlFor="db-port">Port</Label>
                  <Input 
                    id="db-port" 
                    value={config.database.port}
                    onChange={(e) => updateConfig('database', 'port', e.target.value)}
                    placeholder="Database port"
                  />
                </div>
                <div>
                  <Label htmlFor="db-name">Database Name</Label>
                  <Input 
                    id="db-name" 
                    value={config.database.name}
                    onChange={(e) => updateConfig('database', 'name', e.target.value)}
                    placeholder="Database name"
                  />
                </div>
                <div>
                  <Label htmlFor="db-username">Username</Label>
                  <Input 
                    id="db-username" 
                    value={config.database.username}
                    onChange={(e) => updateConfig('database', 'username', e.target.value)}
                    placeholder="Database username"
                  />
                </div>
                <div>
                  <Label htmlFor="db-password">Password</Label>
                  <Input 
                    id="db-password" 
                    type="password" 
                    value={config.database.password}
                    onChange={(e) => updateConfig('database', 'password', e.target.value)}
                    placeholder="Database password"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connection Status</span>
                  {getStatusBadge(connectionStatus.database)}
                </div>
                <Button 
                  variant="outline" 
                  onClick={testDatabaseConnection}
                  disabled={connectionStatus.database === 'testing'}
                  className="w-full"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Database Connection
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Synchronization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-sync">Automatic Synchronization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync contacts and call logs between FreePBX and CRM
                  </p>
                </div>
                <Switch 
                  id="auto-sync"
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="call-logging">Call Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Log all incoming and outgoing calls to CRM
                  </p>
                </div>
                <Switch 
                  id="call-logging"
                  checked={callLogging}
                  onCheckedChange={setCallLogging}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications for missed calls and new contacts
                  </p>
                </div>
                <Switch 
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <div>
                <Label htmlFor="sync-interval">Sync Interval (minutes)</Label>
                <Input 
                  id="sync-interval" 
                  defaultValue="5" 
                  placeholder="Sync interval in minutes"
                  type="number"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security & API Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input 
                  id="api-key" 
                  defaultValue="pbx_api_key_12345" 
                  placeholder="FreePBX API key"
                />
              </div>
              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input 
                  id="webhook-url" 
                  defaultValue="https://your-domain.com/webhook" 
                  placeholder="Webhook endpoint"
                />
              </div>
              <div>
                <Label htmlFor="encryption">Encryption Settings</Label>
                <Textarea 
                  id="encryption" 
                  defaultValue="SSL/TLS encryption enabled for all connections"
                  placeholder="Encryption configuration"
                />
              </div>
            </CardContent>
          </Card>

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

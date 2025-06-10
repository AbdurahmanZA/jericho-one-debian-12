
import { useState } from "react";
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
  TestTube
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const IntegrationSettings = () => {
  const { toast } = useToast();
  const [autoSync, setAutoSync] = useState(true);
  const [callLogging, setCallLogging] = useState(true);
  const [notifications, setNotifications] = useState(false);

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your integration settings have been successfully updated.",
    });
  };

  const handleTestConnection = () => {
    toast({
      title: "Connection Test",
      description: "Testing connection to FreePBX and CRM database...",
    });
    
    // Simulate test result
    setTimeout(() => {
      toast({
        title: "Test Successful",
        description: "All connections are working properly.",
      });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Integration Settings
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
                    defaultValue="192.168.1.101" 
                    placeholder="IP or hostname"
                  />
                </div>
                <div>
                  <Label htmlFor="pbx-port">Port</Label>
                  <Input 
                    id="pbx-port" 
                    defaultValue="80" 
                    placeholder="Port number"
                  />
                </div>
                <div>
                  <Label htmlFor="pbx-username">Username</Label>
                  <Input 
                    id="pbx-username" 
                    defaultValue="admin" 
                    placeholder="FreePBX username"
                  />
                </div>
                <div>
                  <Label htmlFor="pbx-password">Password</Label>
                  <Input 
                    id="pbx-password" 
                    type="password" 
                    placeholder="FreePBX password"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connection Status</span>
                  <Badge className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                </div>
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
                    defaultValue="localhost" 
                    placeholder="Database hostname"
                  />
                </div>
                <div>
                  <Label htmlFor="db-port">Port</Label>
                  <Input 
                    id="db-port" 
                    defaultValue="3306" 
                    placeholder="Database port"
                  />
                </div>
                <div>
                  <Label htmlFor="db-name">Database Name</Label>
                  <Input 
                    id="db-name" 
                    defaultValue="crm_db" 
                    placeholder="Database name"
                  />
                </div>
                <div>
                  <Label htmlFor="db-username">Username</Label>
                  <Input 
                    id="db-username" 
                    defaultValue="crm_user" 
                    placeholder="Database username"
                  />
                </div>
                <div>
                  <Label htmlFor="db-password">Password</Label>
                  <Input 
                    id="db-password" 
                    type="password" 
                    placeholder="Database password"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Connection Status</span>
                  <Badge className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                </div>
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
            <Button onClick={handleSaveSettings} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationSettings;

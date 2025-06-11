
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, TestTube, CheckCircle, AlertTriangle, RefreshCw, Info } from "lucide-react";

interface FreePBXAPICardProps {
  config: {
    host: string;
    port: string;
    username: string;
    password: string;
    apiKey: string;
  };
  connectionStatus: 'connected' | 'disconnected' | 'testing';
  onConfigUpdate: (field: string, value: string) => void;
  onTestConnection: () => void;
}

const FreePBXAPICard = ({ 
  config, 
  connectionStatus, 
  onConfigUpdate, 
  onTestConnection 
}: FreePBXAPICardProps) => {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-4 w-4" />
          FreePBX Web API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            FreePBX API provides configuration management and system information.
            Generate API key in FreePBX Admin → Settings → API Access Management.
          </AlertDescription>
        </Alert>
        
        <div>
          <Label htmlFor="api-host">FreePBX Web Host</Label>
          <Input 
            id="api-host" 
            value={config.host}
            onChange={(e) => onConfigUpdate('host', e.target.value)}
            placeholder="192.168.1.100"
          />
        </div>
        <div>
          <Label htmlFor="api-port">Web Port</Label>
          <Input 
            id="api-port" 
            value={config.port}
            onChange={(e) => onConfigUpdate('port', e.target.value)}
            placeholder="80 or 443"
          />
        </div>
        <div>
          <Label htmlFor="api-username">Admin Username</Label>
          <Input 
            id="api-username" 
            value={config.username}
            onChange={(e) => onConfigUpdate('username', e.target.value)}
            placeholder="admin"
          />
        </div>
        <div>
          <Label htmlFor="api-password">Admin Password</Label>
          <Input 
            id="api-password" 
            type="password" 
            value={config.password}
            onChange={(e) => onConfigUpdate('password', e.target.value)}
            placeholder="FreePBX admin password"
          />
        </div>
        <div>
          <Label htmlFor="api-key">API Key (Optional)</Label>
          <Input 
            id="api-key" 
            value={config.apiKey}
            onChange={(e) => onConfigUpdate('apiKey', e.target.value)}
            placeholder="Generated API key"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">API Status</span>
          {getStatusBadge(connectionStatus)}
        </div>
        <Button 
          variant="outline" 
          onClick={onTestConnection}
          disabled={connectionStatus === 'testing'}
          className="w-full"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test API Connection
        </Button>
      </CardContent>
    </Card>
  );
};

export default FreePBXAPICard;

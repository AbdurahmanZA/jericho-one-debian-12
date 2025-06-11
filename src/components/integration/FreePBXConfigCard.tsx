
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Phone, TestTube, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface FreePBXConfigCardProps {
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

const FreePBXConfigCard = ({ 
  config, 
  connectionStatus, 
  onConfigUpdate, 
  onTestConnection 
}: FreePBXConfigCardProps) => {
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
          <Phone className="h-4 w-4" />
          FreePBX Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="pbx-host">FreePBX Host</Label>
          <Input 
            id="pbx-host" 
            value={config.host}
            onChange={(e) => onConfigUpdate('host', e.target.value)}
            placeholder="IP or hostname"
          />
        </div>
        <div>
          <Label htmlFor="pbx-port">Port</Label>
          <Input 
            id="pbx-port" 
            value={config.port}
            onChange={(e) => onConfigUpdate('port', e.target.value)}
            placeholder="Port number"
          />
        </div>
        <div>
          <Label htmlFor="pbx-username">Username</Label>
          <Input 
            id="pbx-username" 
            value={config.username}
            onChange={(e) => onConfigUpdate('username', e.target.value)}
            placeholder="FreePBX username"
          />
        </div>
        <div>
          <Label htmlFor="pbx-password">Password</Label>
          <Input 
            id="pbx-password" 
            type="password" 
            value={config.password}
            onChange={(e) => onConfigUpdate('password', e.target.value)}
            placeholder="FreePBX password"
          />
        </div>
        <div>
          <Label htmlFor="pbx-api-key">API Key</Label>
          <Input 
            id="pbx-api-key" 
            value={config.apiKey}
            onChange={(e) => onConfigUpdate('apiKey', e.target.value)}
            placeholder="FreePBX API key"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Connection Status</span>
          {getStatusBadge(connectionStatus)}
        </div>
        <Button 
          variant="outline" 
          onClick={onTestConnection}
          disabled={connectionStatus === 'testing'}
          className="w-full"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test FreePBX Connection
        </Button>
      </CardContent>
    </Card>
  );
};

export default FreePBXConfigCard;

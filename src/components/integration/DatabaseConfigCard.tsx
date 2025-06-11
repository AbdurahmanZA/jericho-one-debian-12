
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Database, TestTube, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface DatabaseConfigCardProps {
  config: {
    host: string;
    port: string;
    name: string;
    username: string;
    password: string;
  };
  connectionStatus: 'connected' | 'disconnected' | 'testing';
  onConfigUpdate: (field: string, value: string) => void;
  onTestConnection: () => void;
}

const DatabaseConfigCard = ({ 
  config, 
  connectionStatus, 
  onConfigUpdate, 
  onTestConnection 
}: DatabaseConfigCardProps) => {
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
          <Database className="h-4 w-4" />
          CRM Database
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="db-host">Database Host</Label>
          <Input 
            id="db-host" 
            value={config.host}
            onChange={(e) => onConfigUpdate('host', e.target.value)}
            placeholder="Database hostname"
          />
        </div>
        <div>
          <Label htmlFor="db-port">Port</Label>
          <Input 
            id="db-port" 
            value={config.port}
            onChange={(e) => onConfigUpdate('port', e.target.value)}
            placeholder="Database port"
          />
        </div>
        <div>
          <Label htmlFor="db-name">Database Name</Label>
          <Input 
            id="db-name" 
            value={config.name}
            onChange={(e) => onConfigUpdate('name', e.target.value)}
            placeholder="Database name"
          />
        </div>
        <div>
          <Label htmlFor="db-username">Username</Label>
          <Input 
            id="db-username" 
            value={config.username}
            onChange={(e) => onConfigUpdate('username', e.target.value)}
            placeholder="Database username"
          />
        </div>
        <div>
          <Label htmlFor="db-password">Password</Label>
          <Input 
            id="db-password" 
            type="password" 
            value={config.password}
            onChange={(e) => onConfigUpdate('password', e.target.value)}
            placeholder="Database password"
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
          Test Database Connection
        </Button>
      </CardContent>
    </Card>
  );
};

export default DatabaseConfigCard;

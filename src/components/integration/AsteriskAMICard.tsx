
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, TestTube, CheckCircle, AlertTriangle, RefreshCw, Info } from "lucide-react";

interface AsteriskAMICardProps {
  config: {
    host: string;
    port: string;
    username: string;
    password: string;
  };
  connectionStatus: 'connected' | 'disconnected' | 'testing';
  onConfigUpdate: (field: string, value: string) => void;
  onTestConnection: () => void;
}

const AsteriskAMICard = ({ 
  config, 
  connectionStatus, 
  onConfigUpdate, 
  onTestConnection 
}: AsteriskAMICardProps) => {
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
          Asterisk AMI Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            AMI (Asterisk Manager Interface) provides real-time call events and control. 
            Configure in /etc/asterisk/manager.conf on your PBX server.
          </AlertDescription>
        </Alert>
        
        <div>
          <Label htmlFor="ami-host">Asterisk Server IP</Label>
          <Input 
            id="ami-host" 
            value={config.host}
            onChange={(e) => onConfigUpdate('host', e.target.value)}
            placeholder="192.168.1.100"
          />
        </div>
        <div>
          <Label htmlFor="ami-port">AMI Port</Label>
          <Input 
            id="ami-port" 
            value={config.port}
            onChange={(e) => onConfigUpdate('port', e.target.value)}
            placeholder="5038"
          />
        </div>
        <div>
          <Label htmlFor="ami-username">AMI Username</Label>
          <Input 
            id="ami-username" 
            value={config.username}
            onChange={(e) => onConfigUpdate('username', e.target.value)}
            placeholder="crmuser"
          />
        </div>
        <div>
          <Label htmlFor="ami-password">AMI Secret</Label>
          <Input 
            id="ami-password" 
            type="password" 
            value={config.password}
            onChange={(e) => onConfigUpdate('password', e.target.value)}
            placeholder="Your AMI secret"
          />
        </div>
        
        <div className="bg-gray-50 p-3 rounded-md text-sm">
          <p className="font-medium mb-2">Manager.conf example:</p>
          <pre className="text-xs">
{`[crmuser]
secret = YourSecretHere
permit = 127.0.0.1/255.255.255.255
read = all
write = all`}
          </pre>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">AMI Status</span>
          {getStatusBadge(connectionStatus)}
        </div>
        <Button 
          variant="outline" 
          onClick={onTestConnection}
          disabled={connectionStatus === 'testing'}
          className="w-full"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test AMI Connection
        </Button>
      </CardContent>
    </Card>
  );
};

export default AsteriskAMICard;

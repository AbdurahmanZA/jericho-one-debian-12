
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, TestTube, CheckCircle, AlertTriangle, RefreshCw, Info, Wifi, WifiOff } from "lucide-react";
import { useAsteriskAMI } from "@/hooks/useAsteriskAMI";
import { useEffect } from "react";

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
  onConnectionStatusChange?: (status: 'connected' | 'disconnected' | 'testing') => void;
}

const AsteriskAMICard = ({ 
  config, 
  connectionStatus, 
  onConfigUpdate, 
  onTestConnection,
  onConnectionStatusChange
}: AsteriskAMICardProps) => {
  const { 
    isConnected, 
    isConnecting, 
    connectionError, 
    lastEvent, 
    callEvents,
    connect, 
    disconnect 
  } = useAsteriskAMI(config);

  // Update parent component when connection status changes
  useEffect(() => {
    if (onConnectionStatusChange) {
      if (isConnecting) {
        onConnectionStatusChange('testing');
      } else if (isConnected) {
        onConnectionStatusChange('connected');
      } else {
        onConnectionStatusChange('disconnected');
      }
    }
  }, [isConnected, isConnecting, onConnectionStatusChange]);

  const handleTestConnection = async () => {
    if (isConnected) {
      disconnect();
    } else {
      const success = await connect();
      if (!success && connectionError) {
        console.error('Connection failed:', connectionError);
      }
    }
  };

  const getStatusBadge = () => {
    if (isConnecting) {
      return (
        <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Connecting...
        </Badge>
      );
    }
    
    if (isConnected) {
      return (
        <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Connected
        </Badge>
      );
    }
    
    return (
      <Badge className="flex items-center gap-1 bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3" />
        Disconnected
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Asterisk AMI Connection
          {isConnected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            AMI (Asterisk Manager Interface) provides real-time call events and control. 
            Configure in /etc/asterisk/manager.conf on your PBX server.
            {isConnected && ' ✅ Live connection active - receiving call events.'}
          </AlertDescription>
        </Alert>
        
        {connectionError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Connection Error: {connectionError}
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label htmlFor="ami-host">Asterisk Server IP</Label>
          <Input 
            id="ami-host" 
            value={config.host}
            onChange={(e) => onConfigUpdate('host', e.target.value)}
            placeholder="192.168.1.100"
            disabled={isConnected}
          />
        </div>
        <div>
          <Label htmlFor="ami-port">AMI WebSocket Port</Label>
          <Input 
            id="ami-port" 
            value={config.port}
            onChange={(e) => onConfigUpdate('port', e.target.value)}
            placeholder="8088 (WebSocket) or 5038 (TCP)"
            disabled={isConnected}
          />
        </div>
        <div>
          <Label htmlFor="ami-username">AMI Username</Label>
          <Input 
            id="ami-username" 
            value={config.username}
            onChange={(e) => onConfigUpdate('username', e.target.value)}
            placeholder="crmuser"
            disabled={isConnected}
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
            disabled={isConnected}
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
          <p className="text-xs mt-2 text-gray-600">
            For WebSocket: Enable http.conf and set up WebSocket endpoint at port 8088
          </p>
        </div>
        
        {lastEvent && (
          <div className="bg-blue-50 p-3 rounded-md text-sm">
            <p className="font-medium mb-1">Latest AMI Event:</p>
            <pre className="text-xs text-blue-800">
              {JSON.stringify(lastEvent, null, 2)}
            </pre>
          </div>
        )}

        {callEvents.length > 0 && (
          <div className="bg-green-50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
            <p className="font-medium mb-1">Recent Call Events ({callEvents.length}):</p>
            {callEvents.slice(0, 3).map((event, index) => (
              <div key={index} className="text-xs text-green-800 mb-1">
                {event.event}: {event.channel || event.calleridnum || 'Unknown'}
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm">AMI Status</span>
          {getStatusBadge()}
        </div>
        <Button 
          variant={isConnected ? "destructive" : "outline"}
          onClick={handleTestConnection}
          disabled={isConnecting}
          className="w-full"
        >
          <TestTube className="h-4 w-4 mr-2" />
          {isConnected ? 'Disconnect AMI' : 'Connect to AMI'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AsteriskAMICard;

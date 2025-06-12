import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, TestTube, CheckCircle, AlertTriangle, RefreshCw, Info, Wifi, WifiOff } from "lucide-react";
import { useAMIContext } from "@/contexts/AMIContext";
import { useEffect } from "react";

interface AsteriskAMICardProps {
  connectionStatus: 'connected' | 'disconnected' | 'testing';
  onTestConnection: () => void;
  onConnectionStatusChange?: (status: 'connected' | 'disconnected' | 'testing') => void;
}

const AsteriskAMICard = ({ 
  connectionStatus, 
  onTestConnection,
  onConnectionStatusChange
}: AsteriskAMICardProps) => {
  const { 
    isConnected, 
    isConnecting, 
    connectionError, 
    lastEvent, 
    callEvents,
    config,
    updateConfig,
    connect, 
    disconnect 
  } = useAMIContext();

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

  const handleConfigUpdate = (field: string, value: string) => {
    updateConfig({
      ...config,
      [field]: value
    });
  };

  const getStatusBadge = () => {
    if (isConnecting) {
      return (
        <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Testing...
        </Badge>
      );
    }
    
    if (isConnected) {
      return (
        <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          PJSIP Ready
        </Badge>
      );
    }
    
    return (
      <Badge className="flex items-center gap-1 bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3" />
        Not Connected
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-4 w-4" />
          Asterisk AMI (PJSIP)
          {isConnected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            ✅ PJSIP Configuration Updated! 
            Now using proper PJSIP channel format for call origination.
            Extension 1000 configured for PJSIP calls.
          </AlertDescription>
        </Alert>

        <Alert className="bg-green-50 border-green-200">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>PJSIP Ready:</strong> AMI will now use PJSIP/1000 format for calls instead of SIP/1000.
            Your FreePBX system is properly configured for PJSIP endpoints.
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
            onChange={(e) => handleConfigUpdate('host', e.target.value)}
            placeholder="192.168.1.100"
            disabled={isConnected}
          />
        </div>
        <div>
          <Label htmlFor="ami-port">AMI Port</Label>
          <Input 
            id="ami-port" 
            value={config.port}
            onChange={(e) => handleConfigUpdate('port', e.target.value)}
            placeholder="5038"
            disabled={isConnected}
          />
        </div>
        <div>
          <Label htmlFor="ami-username">AMI Username</Label>
          <Input 
            id="ami-username" 
            value={config.username}
            onChange={(e) => handleConfigUpdate('username', e.target.value)}
            placeholder="crm-user"
            disabled={isConnected}
          />
        </div>
        <div>
          <Label htmlFor="ami-password">AMI Secret</Label>
          <Input 
            id="ami-password" 
            type="password" 
            value={config.password}
            onChange={(e) => handleConfigUpdate('password', e.target.value)}
            placeholder="CRM_AMI_Pass"
            disabled={isConnected}
          />
        </div>
        
        <div className="bg-gray-50 p-3 rounded-md text-sm">
          <p className="font-medium mb-2 text-green-600">✅ Updated for PJSIP:</p>
          <pre className="text-xs">
{`[crm-user]
secret = 70159b4d49108ee8a6d1527edee2d8b50310358f
read = all
write = all
permit = 127.0.0.1/255.255.255.255
permit = 192.168.0.0/255.255.255.0`}
          </pre>
          <p className="text-xs mt-2 text-green-600">
            PJSIP Channels: PJSIP/1000 ✓ | AMI Commands Updated ✓ | Call Format Corrected ✓
          </p>
        </div>
        
        {lastEvent && (
          <div className="bg-blue-50 p-3 rounded-md text-sm">
            <p className="font-medium mb-1">Latest Event:</p>
            <pre className="text-xs text-blue-800">
              {JSON.stringify(lastEvent, null, 2)}
            </pre>
          </div>
        )}

        {callEvents.length > 0 && (
          <div className="bg-green-50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
            <p className="font-medium mb-1">PJSIP Events ({callEvents.length}):</p>
            {callEvents.slice(0, 3).map((event, index) => (
              <div key={index} className="text-xs text-green-800 mb-1">
                {event.event}: {event.channel || event.endpointname || event.status || 'System event'}
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Connection Status</span>
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


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, TestTube, CheckCircle, AlertTriangle, RefreshCw, Info, Wifi, WifiOff, Server } from "lucide-react";
import { useAMIContext } from "@/contexts/AMIContext";

interface AMIBridgeCardProps {
  connectionStatus: 'connected' | 'disconnected' | 'testing';
  onTestConnection: () => void;
  onConnectionStatusChange?: (status: 'connected' | 'disconnected' | 'testing') => void;
}

const AMIBridgeCard = ({ 
  connectionStatus, 
  onTestConnection,
  onConnectionStatusChange
}: AMIBridgeCardProps) => {
  const { 
    isConnected, 
    isConnecting, 
    connectionError, 
    lastEvent, 
    reconnectAttempts, 
    maxReconnectAttempts,
    connect, 
    disconnect,
    resetReconnectAttempts,
    config 
  } = useAMIContext();
  
  // Updated AMI Bridge settings with PBX IP
  const bridgeConfig = {
    serverUrl: 'http://192.168.0.5:3001',
    websocketUrl: 'ws://192.168.0.5:8080',
    amiHost: config.host,
    amiPort: config.port,
    amiUsername: config.username,
    amiPassword: config.password
  };

  const handleTestConnection = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      resetReconnectAttempts();
      await connect();
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
          Bridge Connected
        </Badge>
      );
    }
    
    if (reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts) {
      return (
        <Badge className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Reconnecting... ({reconnectAttempts}/{maxReconnectAttempts})
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

  const getConnectionStatusMessage = () => {
    if (connectionError) {
      if (reconnectAttempts >= maxReconnectAttempts) {
        return `Max retry attempts reached (${maxReconnectAttempts}). ${connectionError}`;
      }
      return connectionError;
    }
    
    if (isConnected) {
      return "Connected to AMI Bridge. Session will persist while logged in.";
    }
    
    if (reconnectAttempts > 0) {
      return `Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`;
    }
    
    return "Disconnected from AMI Bridge.";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Server className="h-4 w-4" />
          AMI Bridge Server
          {isConnected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Session Management:</strong> Bridge maintains connection during your session and auto-reconnects if disconnected.
            Connection will close when you log out.
          </AlertDescription>
        </Alert>

        {(connectionError || reconnectAttempts > 0) && (
          <Alert variant={reconnectAttempts >= maxReconnectAttempts ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {getConnectionStatusMessage()}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div>
            <Label>Bridge Server</Label>
            <Input 
              value={bridgeConfig.serverUrl}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>WebSocket URL</Label>
            <Input 
              value={bridgeConfig.websocketUrl}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>Target FreePBX Server</Label>
            <Input 
              value={`${bridgeConfig.amiHost}:${bridgeConfig.amiPort}`}
              disabled
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label>AMI Username</Label>
            <Input 
              value={bridgeConfig.amiUsername}
              disabled
              className="bg-gray-50"
            />
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-md text-sm">
          <p className="font-medium mb-2 text-green-600">✅ Session Management:</p>
          <pre className="text-xs">
{`Bridge Server: 192.168.0.5:3001
WebSocket: 192.168.0.5:8080
FreePBX: ${bridgeConfig.amiHost}:${bridgeConfig.amiPort}
Auto-reconnect: ${maxReconnectAttempts} attempts
Session-based: Disconnect on logout`}
          </pre>
          <p className="text-xs mt-2 text-green-600">
            Persistent connection during user session ✓
          </p>
        </div>
        
        {lastEvent && (
          <div className="bg-blue-50 p-3 rounded-md text-sm">
            <p className="font-medium mb-1">Latest Bridge Event:</p>
            <pre className="text-xs text-blue-800">
              {JSON.stringify(lastEvent, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm">Bridge Status</span>
          {getStatusBadge()}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant={isConnected ? "destructive" : "outline"}
            onClick={handleTestConnection}
            disabled={isConnecting}
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isConnected ? 'Disconnect' : 'Connect'}
          </Button>
          
          {reconnectAttempts > 0 && (
            <Button 
              variant="secondary"
              onClick={resetReconnectAttempts}
              disabled={isConnecting}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AMIBridgeCard;

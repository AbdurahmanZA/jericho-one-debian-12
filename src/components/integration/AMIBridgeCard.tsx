
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, TestTube, CheckCircle, AlertTriangle, RefreshCw, Info, Wifi, WifiOff, Server } from "lucide-react";
import { useState, useEffect } from "react";

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
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<any>(null);
  
  // Hardcoded AMI Bridge settings
  const bridgeConfig = {
    serverUrl: 'http://localhost:3001',
    websocketUrl: 'ws://localhost:8080',
    amiHost: '192.168.0.5',
    amiPort: '5038',
    amiUsername: 'crm-user',
    amiPassword: '70159b4d49108ee8a6d1527edee2d8b50310358f'
  };

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
      await disconnect();
    } else {
      await connect();
    }
  };

  const connect = async (): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log('[AMI Bridge] Connecting to bridge server...');
      
      const response = await fetch(`${bridgeConfig.serverUrl}/api/ami/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: bridgeConfig.amiHost,
          port: bridgeConfig.amiPort,
          username: bridgeConfig.amiUsername,
          password: bridgeConfig.amiPassword
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setIsConnected(true);
        setConnectionError(null);
        console.log('[AMI Bridge] Connected successfully');
        return true;
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setConnectionError(errorMessage);
      console.error('[AMI Bridge] Connection error:', errorMessage);
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${bridgeConfig.serverUrl}/api/ami/disconnect`, {
        method: 'POST',
      });

      const result = await response.json();
      setIsConnected(false);
      setConnectionError(null);
      setLastEvent(null);
      return result.success;
    } catch (error) {
      console.error('[AMI Bridge] Disconnect error:', error);
      setIsConnected(false);
      return false;
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
          <Server className="h-4 w-4" />
          AMI Bridge Server
          {isConnected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>AMI Bridge Server:</strong> Connects to FreePBX at {bridgeConfig.amiHost} via the bridge service.
            Bridge handles all AMI communication and WebSocket events.
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
          <p className="font-medium mb-2 text-green-600">✅ Bridge Configuration:</p>
          <pre className="text-xs">
{`Bridge Server: localhost:3001
WebSocket: localhost:8080
FreePBX: ${bridgeConfig.amiHost}:${bridgeConfig.amiPort}
AMI User: ${bridgeConfig.amiUsername}`}
          </pre>
          <p className="text-xs mt-2 text-green-600">
            All connections routed through AMI Bridge ✓
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
        <Button 
          variant={isConnected ? "destructive" : "outline"}
          onClick={handleTestConnection}
          disabled={isConnecting}
          className="w-full"
        >
          <TestTube className="h-4 w-4 mr-2" />
          {isConnected ? 'Disconnect Bridge' : 'Connect to Bridge'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AMIBridgeCard;

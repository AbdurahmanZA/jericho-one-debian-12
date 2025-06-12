
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Phone, TestTube, CheckCircle, AlertTriangle, RefreshCw, Info, Wifi, WifiOff, Server, ChevronDown, Copy, Trash2, FileText } from "lucide-react";
import { useAMIContext } from "@/contexts/AMIContext";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [bridgeLogs, setBridgeLogs] = useState<any[]>([]);
  
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
  
  // Add new events to logs when they come in
  React.useEffect(() => {
    if (lastEvent) {
      setBridgeLogs(prev => [{
        timestamp: new Date().toISOString(),
        event: lastEvent
      }, ...prev.slice(0, 49)]); // Keep last 50 events
    }
  }, [lastEvent]);
  
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

  const copyLogToClipboard = (logEntry: any) => {
    const logText = `[${new Date(logEntry.timestamp).toLocaleString()}] ${JSON.stringify(logEntry.event, null, 2)}`;
    navigator.clipboard.writeText(logText);
    toast({
      title: "Log Copied",
      description: "Bridge event copied to clipboard",
    });
  };

  const clearBridgeLogs = () => {
    setBridgeLogs([]);
    toast({
      title: "Logs Cleared",
      description: "Bridge event logs have been cleared",
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString('en-US', { hour12: false }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
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
        
        {/* Bridge Event Logs Window */}
        <Collapsible open={isLogOpen} onOpenChange={setIsLogOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-0 h-auto hover:bg-muted/50 rounded-md px-2 py-2"
            >
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Bridge Event Logs ({bridgeLogs.length} events)
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isLogOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            {bridgeLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No bridge events yet</p>
              </div>
            ) : (
              <>
                <div className="max-h-80 overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
                  {bridgeLogs.map((logEntry, index) => {
                    const timestamp = formatTimestamp(logEntry.timestamp);
                    return (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 p-3 rounded-md border-l-2 border-l-blue-500 bg-blue-50/50 relative group"
                      >
                        <Info className="h-3 w-3 text-blue-600 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">
                              {timestamp.time}
                            </span>
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {timestamp.date}
                            </span>
                            <span className="uppercase text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                              {logEntry.event.Event || logEntry.event.Response || 'BRIDGE'}
                            </span>
                          </div>
                          <div className="mt-2 p-2 bg-muted/80 rounded text-xs font-mono text-muted-foreground border border-border/50">
                            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(logEntry.event, null, 2)}</pre>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => copyLogToClipboard(logEntry)}
                          title="Copy log entry"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={clearBridgeLogs}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Bridge Logs
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allLogs = bridgeLogs.map(log => {
                        const timestamp = formatTimestamp(log.timestamp);
                        return `[${timestamp.date} ${timestamp.time}] ${JSON.stringify(log.event, null, 2)}`;
                      }).join('\n\n');
                      navigator.clipboard.writeText(allLogs);
                      toast({
                        title: "All Bridge Logs Copied",
                        description: "All bridge event logs copied to clipboard",
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-3 w-3" />
                    Copy All
                  </Button>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
        
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

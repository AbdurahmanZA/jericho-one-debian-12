
import React, { useState } from "react";
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
import { Phone, TestTube, CheckCircle, AlertTriangle, RefreshCw, Info, Wifi, WifiOff, Server, ChevronDown, Copy, Trash2, FileText, Settings } from "lucide-react";
import { useAMIContext } from "@/contexts/AMIContext";
import { useToast } from "@/hooks/use-toast";

interface DirectAMICardProps {
  connectionStatus: 'connected' | 'disconnected' | 'testing';
  onTestConnection: () => void;
  onConnectionStatusChange?: (status: 'connected' | 'disconnected' | 'testing') => void;
}

const DirectAMICard = ({ 
  connectionStatus, 
  onTestConnection,
  onConnectionStatusChange
}: DirectAMICardProps) => {
  const { toast } = useToast();
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [amiLogs, setAmiLogs] = useState<any[]>([]);
  const [localConfig, setLocalConfig] = useState({
    host: '127.0.0.1',
    port: '5038',
    username: 'jericho-ami',
    password: 'jericho123!'
  });
  
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
    config,
    updateConfig
  } = useAMIContext();
  
  // Add new events to logs when they come in
  React.useEffect(() => {
    if (lastEvent) {
      setAmiLogs(prev => [{
        timestamp: new Date().toISOString(),
        event: lastEvent
      }, ...prev.slice(0, 29)]); // Keep last 30 events
    }
  }, [lastEvent]);

  const handleTestConnection = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      resetReconnectAttempts();
      await connect();
    }
  };

  const handleConfigUpdate = () => {
    updateConfig(localConfig);
    toast({
      title: "Configuration Updated",
      description: "AMI configuration has been updated. Reconnect to apply changes.",
    });
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
          AMI Connected
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

  const copyLogToClipboard = (logEntry: any) => {
    const logText = `[${new Date(logEntry.timestamp).toLocaleString()}] ${JSON.stringify(logEntry.event, null, 2)}`;
    navigator.clipboard.writeText(logText);
    toast({
      title: "Log Copied",
      description: "AMI event copied to clipboard",
    });
  };

  const clearAmiLogs = () => {
    setAmiLogs([]);
    toast({
      title: "Logs Cleared",
      description: "AMI event logs have been cleared",
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
          Direct FreePBX AMI
          {isConnected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-green-50 border-green-200">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Direct Connection:</strong> Jericho connects directly to localhost FreePBX AMI interface. 
            No bridge server required. Configure AMI credentials in FreePBX manager.conf.
          </AlertDescription>
        </Alert>

        {connectionError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>AMI Connection Error:</strong> {connectionError}
              <br />
              Check FreePBX AMI configuration and credentials.
            </AlertDescription>
          </Alert>
        )}

        {/* AMI Configuration */}
        <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-0 h-auto hover:bg-muted/50 rounded-md px-2 py-2"
            >
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Settings className="h-3 w-3" />
                AMI Configuration
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isConfigOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">AMI Host</Label>
                <Input 
                  value={localConfig.host}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="127.0.0.1"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">AMI Port</Label>
                <Input 
                  value={localConfig.port}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, port: e.target.value }))}
                  placeholder="5038"
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">AMI Username</Label>
              <Input 
                value={localConfig.username}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, username: e.target.value }))}
                placeholder="jericho-ami"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">AMI Password</Label>
              <Input 
                type="password"
                value={localConfig.password}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, password: e.target.value }))}
                placeholder="jericho123!"
                className="text-sm"
              />
            </div>
            <Button 
              onClick={handleConfigUpdate}
              size="sm"
              className="w-full"
            >
              Update Configuration
            </Button>
          </CollapsibleContent>
        </Collapsible>
        
        <div className="bg-gray-50 p-3 rounded-md text-sm">
          <p className="font-medium mb-2 text-blue-600">📋 FreePBX AMI Setup:</p>
          <pre className="text-xs">
{`1. Edit /etc/asterisk/manager.conf:
[${config.username}]
secret = ${config.password}
read = system,call,log,verbose,agent,user,config
write = system,call,agent,user,config,command,originate
permit = 127.0.0.1/255.255.255.255

2. Restart Asterisk:
sudo systemctl restart asterisk

3. Test connection:
telnet 127.0.0.1 5038`}
          </pre>
        </div>
        
        {/* AMI Event Logs */}
        <Collapsible open={isLogOpen} onOpenChange={setIsLogOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-0 h-auto hover:bg-muted/50 rounded-md px-2 py-2"
            >
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" />
                AMI Event Logs ({amiLogs.length}/30 events)
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isLogOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            {amiLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No AMI events yet</p>
              </div>
            ) : (
              <>
                <div className="max-h-80 overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
                  {amiLogs.map((logEntry, index) => {
                    const timestamp = formatTimestamp(logEntry.timestamp);
                    return (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 p-3 rounded-md border-l-2 border-l-green-500 bg-green-50/50 relative group"
                      >
                        <Phone className="h-3 w-3 text-green-600 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">
                              {timestamp.time}
                            </span>
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {timestamp.date}
                            </span>
                            <span className="uppercase text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              {logEntry.event.event || 'AMI'}
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
                    onClick={clearAmiLogs}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Logs
                  </Button>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">AMI Status</span>
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

export default DirectAMICard;

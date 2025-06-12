
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Phone, CheckCircle, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { amiBridgeClient } from "@/services/amiBridgeClient";

interface PJSIPPeer {
  objectName: string;
  endpoint: string;
  status: string;
  contact?: string;
}

interface ExtensionSelectorProps {
  value: string;
  onChange: (extension: string) => void;
  disabled?: boolean;
  isConnected: boolean;
}

const ExtensionSelector = ({ value, onChange, disabled, isConnected }: ExtensionSelectorProps) => {
  const { toast } = useToast();
  const [extensions, setExtensions] = useState<PJSIPPeer[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');

  const fetchExtensions = async () => {
    if (!isConnected) {
      console.log('[ExtensionSelector] Cannot fetch - AMI not connected');
      toast({
        title: "AMI Not Connected",
        description: "Connect to AMI Bridge first to fetch extensions",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    console.log('[ExtensionSelector] Fetching PJSIP endpoints from bridge...');
    
    try {
      const endpoints = await amiBridgeClient.getPJSIPEndpoints();
      console.log('[ExtensionSelector] Received endpoints:', endpoints);
      
      setExtensions(endpoints);
      setLastFetchTime(new Date().toLocaleTimeString());
      
      if (endpoints.length === 0) {
        console.log('[ExtensionSelector] No endpoints found');
        toast({
          title: "No Extensions Found",
          description: "No PJSIP endpoints found. Check FreePBX configuration or try refreshing.",
          variant: "destructive"
        });
      } else {
        console.log(`[ExtensionSelector] Successfully loaded ${endpoints.length} extensions`);
        toast({
          title: "Extensions Loaded",
          description: `Found ${endpoints.length} PJSIP extensions`,
        });
      }
    } catch (error) {
      console.error('[ExtensionSelector] Failed to fetch extensions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch PJSIP extensions from AMI bridge",
        variant: "destructive"
      });
      setExtensions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      console.log('[ExtensionSelector] AMI connected, auto-fetching extensions');
      fetchExtensions();
    } else {
      console.log('[ExtensionSelector] AMI disconnected, clearing extensions');
      setExtensions([]);
    }
  }, [isConnected]);

  const getStatusBadge = (status: string) => {
    const isOnline = status.toLowerCase().includes('not_inuse') || 
                     status.toLowerCase().includes('inuse') || 
                     status.toLowerCase().includes('available');
    return (
      <Badge 
        variant={isOnline ? "default" : "secondary"}
        className={`ml-2 text-xs ${isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
      >
        {isOnline ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="extension">PJSIP Extension</Label>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-600" title="AMI Connected" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-600" title="AMI Disconnected" />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchExtensions}
            disabled={loading || !isConnected}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <Select value={value} onValueChange={onChange} disabled={disabled || !isConnected}>
        <SelectTrigger>
          <SelectValue placeholder={
            !isConnected ? "AMI not connected" : 
            loading ? "Loading extensions..." :
            extensions.length === 0 ? "No extensions found" :
            "Select your extension"
          } />
        </SelectTrigger>
        <SelectContent>
          {extensions.length === 0 && isConnected && !loading ? (
            <SelectItem value="no-extensions" disabled>
              No extensions found - try refresh
            </SelectItem>
          ) : (
            extensions.map((ext) => (
              <SelectItem key={ext.endpoint} value={ext.endpoint}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>PJSIP/{ext.endpoint}</span>
                  </div>
                  {getStatusBadge(ext.status)}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      
      <div className="text-xs text-muted-foreground space-y-1">
        {!isConnected && (
          <p className="text-red-600">Connect to AMI Bridge to load available PJSIP extensions</p>
        )}
        
        {isConnected && extensions.length > 0 && (
          <p className="text-green-600">
            {extensions.length} PJSIP extensions available
            {lastFetchTime && ` (last updated: ${lastFetchTime})`}
          </p>
        )}
        
        {isConnected && extensions.length === 0 && !loading && (
          <div className="text-yellow-600">
            <p>No extensions found. This could mean:</p>
            <ul className="list-disc list-inside ml-2 text-xs">
              <li>No PJSIP endpoints configured in FreePBX</li>
              <li>AMI user lacks PJSIP permissions</li>
              <li>Bridge communication issue</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtensionSelector;

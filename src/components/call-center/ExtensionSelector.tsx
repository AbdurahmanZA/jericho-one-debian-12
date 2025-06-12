
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Phone, CheckCircle, AlertCircle } from "lucide-react";
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

  const fetchExtensions = async () => {
    if (!isConnected) {
      toast({
        title: "AMI Not Connected",
        description: "Connect to AMI Bridge first to fetch extensions",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const endpoints = await amiBridgeClient.getPJSIPEndpoints();
      setExtensions(endpoints);
      
      if (endpoints.length === 0) {
        toast({
          title: "No Extensions Found",
          description: "No PJSIP endpoints found. Check FreePBX configuration.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Extensions Loaded",
          description: `Found ${endpoints.length} PJSIP extensions`,
        });
      }
    } catch (error) {
      console.error('Failed to fetch extensions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch PJSIP extensions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchExtensions();
    }
  }, [isConnected]);

  const getStatusBadge = (status: string) => {
    const isOnline = status.toLowerCase().includes('not_inuse') || status.toLowerCase().includes('inuse');
    return (
      <Badge 
        variant={isOnline ? "default" : "secondary"}
        className={`ml-2 ${isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
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
      
      <Select value={value} onValueChange={onChange} disabled={disabled || !isConnected}>
        <SelectTrigger>
          <SelectValue placeholder={isConnected ? "Select your extension" : "AMI not connected"} />
        </SelectTrigger>
        <SelectContent>
          {extensions.length === 0 && isConnected ? (
            <SelectItem value="no-extensions" disabled>
              No extensions found
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
      
      {!isConnected && (
        <p className="text-xs text-muted-foreground">
          Connect to AMI Bridge to load available PJSIP extensions
        </p>
      )}
      
      {extensions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {extensions.length} PJSIP extensions available
        </p>
      )}
    </div>
  );
};

export default ExtensionSelector;

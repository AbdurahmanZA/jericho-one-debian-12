
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Globe, 
  ChevronDown, 
  Clock, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  XCircle
} from "lucide-react";

interface APILogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  endpoint: string;
  method: string;
  status?: number;
  message: string;
  responseTime?: number;
}

interface APILogsCardProps {
  logs: APILogEntry[];
  onClearLogs: () => void;
}

const APILogsCard = ({ logs, onClearLogs }: APILogsCardProps) => {
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  const getLogIcon = (type: APILogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-600" />;
      default:
        return <Info className="h-3 w-3 text-blue-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-muted-foreground';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-blue-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-4 w-4" />
          API Integration Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Collapsible open={isLogsOpen} onOpenChange={setIsLogsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="text-sm text-muted-foreground">
                {logs.length} API log entries
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isLogsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="max-h-80 overflow-y-auto space-y-2">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-xs border">
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="font-mono text-xs bg-muted px-1 rounded">
                        {log.method}
                      </span>
                      {log.status && (
                        <span className={`font-mono text-xs ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      )}
                      {log.responseTime && (
                        <span className="text-muted-foreground">
                          {log.responseTime}ms
                        </span>
                      )}
                    </div>
                    <p className="text-foreground break-words mb-1">
                      <span className="font-medium">{log.endpoint}</span>
                    </p>
                    <p className="text-muted-foreground break-words">
                      {log.message}
                    </p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No API logs yet
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onClearLogs}
                className="w-full"
                disabled={logs.length === 0}
              >
                Clear API Logs
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default APILogsCard;

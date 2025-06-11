
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  FileText, 
  ChevronDown, 
  Clock, 
  Info, 
  CheckCircle, 
  AlertTriangle 
} from "lucide-react";

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface IntegrationLogsCardProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const IntegrationLogsCard = ({ logs, onClearLogs }: IntegrationLogsCardProps) => {
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-3 w-3 text-red-600" />;
      default:
        return <Info className="h-3 w-3 text-blue-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Integration Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Collapsible open={isLogsOpen} onOpenChange={setIsLogsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="text-sm text-muted-foreground">
                {logs.length} log entries
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isLogsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="max-h-80 overflow-y-auto space-y-2">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs">
                  {getLogIcon(log.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-foreground break-words">
                      {log.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onClearLogs}
                className="w-full"
              >
                Clear Logs
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default IntegrationLogsCard;


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
  AlertTriangle,
  XCircle,
  Copy,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

interface IntegrationLogsCardProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

const IntegrationLogsCard = ({ logs, onClearLogs }: IntegrationLogsCardProps) => {
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const { toast } = useToast();

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-600 flex-shrink-0" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />;
      default:
        return <Info className="h-3 w-3 text-blue-600 flex-shrink-0" />;
    }
  };

  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50/50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/50';
      case 'error':
        return 'border-l-red-500 bg-red-50/50';
      default:
        return 'border-l-blue-500 bg-blue-50/50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString('en-US', { hour12: false }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  };

  const copyLogToClipboard = (log: LogEntry) => {
    const logText = `[${formatTimestamp(log.timestamp).date} ${formatTimestamp(log.timestamp).time}] ${log.type.toUpperCase()}: ${log.message}${log.details ? '\nDetails: ' + log.details : ''}`;
    navigator.clipboard.writeText(logText);
    toast({
      title: "Log Copied",
      description: "Log entry copied to clipboard",
    });
  };

  const errorCount = logs.filter(log => log.type === 'error').length;
  const warningCount = logs.filter(log => log.type === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Integration Logs
          {(errorCount > 0 || warningCount > 0) && (
            <div className="flex gap-1 ml-auto">
              {errorCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {errorCount} errors
                </span>
              )}
              {warningCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {warningCount} warnings
                </span>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Collapsible open={isLogsOpen} onOpenChange={setIsLogsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between p-0 h-auto hover:bg-muted/50 rounded-md px-2 py-2"
            >
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" />
                {logs.length === 0 ? 'No log entries' : `${logs.length} log entries`}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isLogsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No log entries yet</p>
              </div>
            ) : (
              <>
                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-2 bg-muted/20">
                  {logs.map((log, index) => {
                    const timestamp = formatTimestamp(log.timestamp);
                    return (
                      <div 
                        key={index} 
                        className={`flex items-start gap-3 p-3 rounded-md border-l-2 ${getLogTypeColor(log.type)} relative group`}
                      >
                        {getLogIcon(log.type)}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">
                              {timestamp.time}
                            </span>
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {timestamp.date}
                            </span>
                            <span className={`uppercase text-xs font-medium px-1.5 py-0.5 rounded ${
                              log.type === 'error' ? 'bg-red-100 text-red-700' :
                              log.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                              log.type === 'success' ? 'bg-green-100 text-green-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {log.type}
                            </span>
                          </div>
                          <p className="text-sm text-foreground break-words leading-relaxed">
                            {log.message}
                          </p>
                          {log.details && (
                            <div className="mt-2 p-2 bg-muted/80 rounded text-xs font-mono text-muted-foreground border border-border/50">
                              <pre className="whitespace-pre-wrap break-words">{log.details}</pre>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => copyLogToClipboard(log)}
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
                    onClick={onClearLogs}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Logs
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const allLogs = logs.map(log => {
                        const timestamp = formatTimestamp(log.timestamp);
                        return `[${timestamp.date} ${timestamp.time}] ${log.type.toUpperCase()}: ${log.message}${log.details ? '\nDetails: ' + log.details : ''}`;
                      }).join('\n\n');
                      navigator.clipboard.writeText(allLogs);
                      toast({
                        title: "All Logs Copied",
                        description: "All log entries copied to clipboard",
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
      </CardContent>
    </Card>
  );
};

export default IntegrationLogsCard;

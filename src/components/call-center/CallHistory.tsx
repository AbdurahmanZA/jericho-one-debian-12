import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Play, Phone, Radio } from "lucide-react";

interface CallRecord {
  id: number;
  leadName: string;
  phone: string;
  duration: string;
  outcome: string;
  timestamp: string;
  hasRecording: boolean;
  notes: string;
  agent: string;
}

interface CallHistoryProps {
  calls: CallRecord[];
}

const CallHistory = ({ calls }: CallHistoryProps) => {
  const getOutcomeColor = (outcome: string) => {
    switch (outcome.toLowerCase()) {
      case "qualified": return "bg-green-100 text-green-800";
      case "callback scheduled": return "bg-blue-100 text-blue-800";
      case "answered": return "bg-green-100 text-green-800";
      case "not interested": return "bg-red-100 text-red-800";
      case "no answer": return "bg-gray-100 text-gray-800";
      case "busy": return "bg-yellow-100 text-yellow-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Call History
          <Badge variant="default" className="flex items-center gap-1">
            <Radio className="h-3 w-3" />
            Live AMI Data
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {calls.map((call) => (
            <Card key={call.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{call.leadName}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{call.phone}</span>
                        <span>{call.timestamp}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {call.duration}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          by {call.agent}
                        </span>
                      </div>
                      <Badge className={`mt-1 text-xs ${getOutcomeColor(call.outcome)}`}>
                        {call.outcome}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-2">{call.notes}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {call.hasRecording && (
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        Play
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Call Again
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CallHistory;

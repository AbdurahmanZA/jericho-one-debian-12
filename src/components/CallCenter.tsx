
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Play, 
  Pause,
  Download,
  Clock,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CallCenterProps {
  userRole: string;
}

const CallCenter = ({ userRole }: CallCenterProps) => {
  const { toast } = useToast();
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState("");

  const activeCalls = [
    {
      id: 1,
      leadName: "John Smith",
      phone: "+1-555-0123",
      duration: "00:02:15",
      status: "connected",
      agent: "Current User"
    }
  ];

  const recentCalls = [
    {
      id: 1,
      leadName: "Sarah Johnson",
      phone: "+1-555-0456",
      duration: "00:05:32",
      outcome: "Callback Scheduled",
      timestamp: "10:30 AM",
      hasRecording: true,
      notes: "Interested in premium package, callback scheduled for tomorrow"
    },
    {
      id: 2,
      leadName: "Mike Davis",
      phone: "+1-555-0789",
      duration: "00:03:45",
      outcome: "Not Interested",
      timestamp: "10:15 AM",
      hasRecording: true,
      notes: "Currently satisfied with existing solution"
    },
    {
      id: 3,
      leadName: "Lisa Wilson",
      phone: "+1-555-0321",
      duration: "00:08:12",
      outcome: "Qualified",
      timestamp: "09:45 AM",
      hasRecording: true,
      notes: "Very interested, requesting proposal and demo"
    }
  ];

  const handleEndCall = () => {
    if (activeCall) {
      toast({
        title: "Call Ended",
        description: `Call with ${activeCall.leadName} has ended.`,
      });
      setActiveCall(null);
    }
  };

  const handleSaveCallNotes = () => {
    if (!callNotes.trim() || !callOutcome) {
      toast({
        title: "Missing Information",
        description: "Please add notes and select an outcome.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Call Notes Saved",
      description: "Call outcome and notes have been recorded.",
    });
    setCallNotes("");
    setCallOutcome("");
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome.toLowerCase()) {
      case "qualified": return "bg-green-100 text-green-800";
      case "callback scheduled": return "bg-blue-100 text-blue-800";
      case "not interested": return "bg-red-100 text-red-800";
      case "no answer": return "bg-gray-100 text-gray-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Call Section */}
      {activeCalls.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <PhoneCall className="h-5 w-5" />
              Active Call
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCalls.map((call) => (
              <div key={call.id} className="flex items-center justify-between p-4 bg-white rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{call.leadName}</h3>
                    <p className="text-sm text-gray-600">{call.phone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-sm font-mono">{call.duration}</span>
                      <Badge className="bg-green-100 text-green-800 text-xs">Connected</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Pause className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={handleEndCall}
                  >
                    <PhoneOff className="h-3 w-3" />
                    End Call
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Post-Call Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Post-Call Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Call Outcome</label>
            <Select value={callOutcome} onValueChange={setCallOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Select call outcome..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qualified">Qualified Lead</SelectItem>
                <SelectItem value="callback">Callback Required</SelectItem>
                <SelectItem value="not-interested">Not Interested</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
                <SelectItem value="voicemail">Left Voicemail</SelectItem>
                <SelectItem value="wrong-number">Wrong Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Call Notes</label>
            <Textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="Enter detailed notes about the conversation..."
              rows={4}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSaveCallNotes} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Save & Next Lead
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Callback
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCalls.map((call) => (
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
    </div>
  );
};

export default CallCenter;

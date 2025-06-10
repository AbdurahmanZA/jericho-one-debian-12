import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Calendar,
  Mic,
  MicOff,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CallCenterProps {
  userRole: string;
}

interface ActiveCall {
  id: string;
  leadName: string;
  phone: string;
  duration: string;
  status: 'connected' | 'ringing' | 'on-hold';
  startTime: Date;
  leadId?: string;
}

interface CallOutcome {
  outcome: string;
  notes: string;
  followUpRequired: boolean;
  followUpDate?: string;
}

const CallCenter = ({ userRole }: CallCenterProps) => {
  const { toast } = useToast();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [extension, setExtension] = useState(localStorage.getItem('user_extension') || '');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Real-time call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall && activeCall.status === 'connected') {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeCall.startTime.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setActiveCall(prev => prev ? {
          ...prev,
          duration: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const initiateCall = async () => {
    if (!extension || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter your extension and phone number.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Save extension to localStorage
      localStorage.setItem('user_extension', extension);

      // Call FreePBX API to initiate call
      const response = await fetch('/api/originate-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extension: extension,
          number: phoneNumber,
          callerName: 'CRM Agent'
        })
      });

      if (response.ok) {
        const newCall: ActiveCall = {
          id: `call_${Date.now()}`,
          leadName: `Lead ${phoneNumber}`,
          phone: phoneNumber,
          duration: '00:00',
          status: 'ringing',
          startTime: new Date()
        };

        setActiveCall(newCall);
        toast({
          title: "Call Initiated",
          description: `Calling ${phoneNumber} from extension ${extension}`,
        });

        // Simulate call connection after 3 seconds
        setTimeout(() => {
          setActiveCall(prev => prev ? { ...prev, status: 'connected', startTime: new Date() } : null);
          toast({
            title: "Call Connected",
            description: "Call is now active",
          });
        }, 3000);
      } else {
        throw new Error('Failed to initiate call');
      }
    } catch (error) {
      toast({
        title: "Call Failed",
        description: "Could not initiate call. Check your FreePBX connection.",
        variant: "destructive"
      });
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      // Call FreePBX API to end call
      await fetch('/api/hangup-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId: activeCall.id,
          extension: extension
        })
      });

      toast({
        title: "Call Ended",
        description: `Call with ${activeCall.leadName} has ended. Duration: ${activeCall.duration}`,
      });

      // Log call to database
      await logCall(activeCall);
      
      setActiveCall(null);
      setIsRecording(false);
      setIsMuted(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end call properly",
        variant: "destructive"
      });
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    toast({
      title: isRecording ? "Recording Stopped" : "Recording Started",
      description: isRecording ? "Call recording has been stopped" : "Call recording has been started",
    });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Unmuted" : "Muted",
      description: isMuted ? "Your microphone is now active" : "Your microphone is now muted",
    });
  };

  const holdCall = () => {
    if (activeCall) {
      const newStatus = activeCall.status === 'on-hold' ? 'connected' : 'on-hold';
      setActiveCall({ ...activeCall, status: newStatus });
      toast({
        title: newStatus === 'on-hold' ? "Call On Hold" : "Call Resumed",
        description: newStatus === 'on-hold' ? "Call has been placed on hold" : "Call has been resumed",
      });
    }
  };

  const logCall = async (call: ActiveCall) => {
    try {
      await fetch('/api/log-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadPhone: call.phone,
          duration: call.duration,
          outcome: callOutcome,
          notes: callNotes,
          agentExtension: extension,
          startTime: call.startTime,
          endTime: new Date()
        })
      });
    } catch (error) {
      console.error('Failed to log call:', error);
    }
  };

  const saveCallNotes = async () => {
    if (!callNotes.trim() || !callOutcome) {
      toast({
        title: "Missing Information",
        description: "Please add notes and select an outcome.",
        variant: "destructive"
      });
      return;
    }

    try {
      await fetch('/api/save-call-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outcome: callOutcome,
          notes: callNotes,
          leadPhone: phoneNumber,
          agentExtension: extension
        })
      });

      toast({
        title: "Call Notes Saved",
        description: "Call outcome and notes have been recorded.",
      });
      
      setCallNotes("");
      setCallOutcome("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save call notes",
        variant: "destructive"
      });
    }
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

  return (
    <div className="space-y-6">
      {/* Dialer Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Dialer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="extension">Your Extension</Label>
              <Input
                id="extension"
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                placeholder="e.g., 101"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., +1234567890"
              />
            </div>
          </div>
          <Button 
            onClick={initiateCall} 
            disabled={!!activeCall || !extension || !phoneNumber}
            className="w-full"
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            Make Call
          </Button>
        </CardContent>
      </Card>

      {/* Active Call Section */}
      {activeCall && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <PhoneCall className="h-5 w-5" />
              Active Call - {activeCall.status === 'ringing' ? 'Ringing' : activeCall.status === 'on-hold' ? 'On Hold' : 'Connected'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-white rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{activeCall.leadName}</h3>
                  <p className="text-sm text-gray-600">{activeCall.phone}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm font-mono">{activeCall.duration}</span>
                    <Badge className={`text-xs ${
                      activeCall.status === 'connected' ? 'bg-green-100 text-green-800' :
                      activeCall.status === 'ringing' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {activeCall.status === 'ringing' ? 'Ringing' : 
                       activeCall.status === 'on-hold' ? 'On Hold' : 'Connected'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={isMuted ? "destructive" : "outline"}
                  onClick={toggleMute}
                >
                  {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                </Button>
                <Button 
                  size="sm" 
                  variant={activeCall.status === 'on-hold' ? "default" : "outline"}
                  onClick={holdCall}
                >
                  {activeCall.status === 'on-hold' ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                </Button>
                <Button 
                  size="sm" 
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={toggleRecording}
                >
                  <Volume2 className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={endCall}
                >
                  <PhoneOff className="h-3 w-3" />
                  End Call
                </Button>
              </div>
            </div>
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
            <Button onClick={saveCallNotes} className="flex items-center gap-2">
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

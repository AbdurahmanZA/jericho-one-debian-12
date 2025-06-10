
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import CallDialer from "./call-center/CallDialer";
import ActiveCallDisplay from "./call-center/ActiveCallDisplay";
import PostCallActions from "./call-center/PostCallActions";
import CallHistory from "./call-center/CallHistory";

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

const CallCenter = ({ userRole }: CallCenterProps) => {
  const { toast } = useToast();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [extension, setExtension] = useState(localStorage.getItem('user_extension') || '');

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

  const handleCallInitiated = (callData: ActiveCall) => {
    setActiveCall(callData);
    
    // Simulate call connection after 3 seconds
    setTimeout(() => {
      setActiveCall(prev => prev ? { ...prev, status: 'connected', startTime: new Date() } : null);
      toast({
        title: "Call Connected",
        description: "Call is now active",
      });
    }, 3000);
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
      <CallDialer 
        onCallInitiated={handleCallInitiated}
        disabled={!!activeCall}
      />

      {activeCall && (
        <ActiveCallDisplay
          activeCall={activeCall}
          isRecording={isRecording}
          isMuted={isMuted}
          onEndCall={endCall}
          onToggleRecording={toggleRecording}
          onToggleMute={toggleMute}
          onHoldCall={holdCall}
        />
      )}

      <PostCallActions
        callNotes={callNotes}
        callOutcome={callOutcome}
        onNotesChange={setCallNotes}
        onOutcomeChange={setCallOutcome}
        onSaveNotes={saveCallNotes}
      />

      <CallHistory calls={recentCalls} />
    </div>
  );
};

export default CallCenter;

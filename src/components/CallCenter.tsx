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

interface CallHistoryEntry {
  id: number;
  leadName: string;
  phone: string;
  duration: string;
  outcome: string;
  timestamp: string;
  hasRecording: boolean;
  notes: string;
}

const CallCenter = ({ userRole }: CallCenterProps) => {
  const { toast } = useToast();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [extension, setExtension] = useState(localStorage.getItem('user_extension') || '');
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([
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
    }
  ]);

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
    
    // Simulate call connection after 2-4 seconds (random for realism)
    const connectionDelay = Math.random() * 2000 + 2000;
    setTimeout(() => {
      setActiveCall(prev => {
        if (prev && prev.id === callData.id) {
          return { ...prev, status: 'connected', startTime: new Date() };
        }
        return prev;
      });
      toast({
        title: "Call Connected",
        description: `Connected to ${callData.leadName}`,
      });
    }, connectionDelay);
  };

  const handleLeadCreated = (leadData: { name: string; phone: string; notes: string }) => {
    console.log('New lead created from call:', leadData);
    
    // In a real application, this would save to the database
    toast({
      title: "Lead Created",
      description: `New lead "${leadData.name}" has been added to the system.`,
    });

    // Send Discord notification if available
    if ((window as any).sendDiscordNotification) {
      (window as any).sendDiscordNotification(
        leadData.name, 
        'created', 
        `New lead created from call to ${leadData.phone}`
      );
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      toast({
        title: "Call Ended",
        description: `Call with ${activeCall.leadName} has ended. Duration: ${activeCall.duration}`,
      });

      // Add call to history
      const newHistoryEntry: CallHistoryEntry = {
        id: Date.now(),
        leadName: activeCall.leadName,
        phone: activeCall.phone,
        duration: activeCall.duration,
        outcome: callOutcome || 'Call Completed',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasRecording: isRecording,
        notes: callNotes || 'No notes added'
      };

      setCallHistory(prev => [newHistoryEntry, ...prev]);
      
      setActiveCall(null);
      setIsRecording(false);
      setIsMuted(false);
      setCallNotes('');
      setCallOutcome('');
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
      toast({
        title: "Call Notes Saved",
        description: "Call outcome and notes have been recorded.",
      });
      
      // Notes are saved but not cleared - they'll be used when call ends
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save call notes",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <CallDialer 
        onCallInitiated={handleCallInitiated}
        onLeadCreated={handleLeadCreated}
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

      <CallHistory calls={callHistory} />
    </div>
  );
};

export default CallCenter;

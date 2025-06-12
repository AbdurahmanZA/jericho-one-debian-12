import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAMIContext } from "@/contexts/AMIContext";
import { callRecordsService, CallRecord } from "@/services/callRecordsService";
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
  const { pendingCall, clearPendingCall } = useAMIContext();
  
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [extension, setExtension] = useState(localStorage.getItem('user_extension') || '');
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);

  // Subscribe to call records service
  useEffect(() => {
    const unsubscribe = callRecordsService.subscribe((records) => {
      setCallHistory(records.slice(0, 10)); // Show latest 10 calls
    });

    // Initial load
    setCallHistory(callRecordsService.getRecords().slice(0, 10));

    return unsubscribe;
  }, []);

  // Handle pending calls from Lead Management
  useEffect(() => {
    if (pendingCall && !activeCall) {
      console.log('Processing pending call from leads:', pendingCall);
      
      const newCall: ActiveCall = {
        id: `call_${pendingCall.timestamp}`,
        leadName: pendingCall.leadName,
        phone: pendingCall.phone,
        duration: '00:00',
        status: 'ringing',
        startTime: new Date(),
        leadId: pendingCall.leadId.toString()
      };

      setActiveCall(newCall);
      clearPendingCall();

      toast({
        title: "Call from Lead Management",
        description: `Calling ${pendingCall.leadName} at ${pendingCall.phone}`,
      });

      // Simulate call connection after 2-4 seconds
      const connectionDelay = Math.random() * 2000 + 2000;
      setTimeout(() => {
        setActiveCall(prev => {
          if (prev && prev.id === newCall.id) {
            return { ...prev, status: 'connected', startTime: new Date() };
          }
          return prev;
        });
        toast({
          title: "Call Connected",
          description: `Connected to ${pendingCall.leadName}`,
        });
      }, connectionDelay);
    }
  }, [pendingCall, activeCall, clearPendingCall, toast]);

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

      // Add call to shared service instead of local state
      const currentUser = localStorage.getItem('current_user') || 'Unknown Agent';
      callRecordsService.addRecord({
        leadName: activeCall.leadName,
        phone: activeCall.phone,
        duration: activeCall.duration,
        outcome: callOutcome || 'Call Completed',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0],
        hasRecording: isRecording,
        notes: callNotes || 'No notes added',
        agent: currentUser,
        callType: 'outgoing',
        leadId: activeCall.leadId
      });
      
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

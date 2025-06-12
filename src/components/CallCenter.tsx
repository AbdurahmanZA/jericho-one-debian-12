import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAMIContext } from "@/contexts/AMIContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const { pendingCall, clearPendingCall, userExtension, isConnected, originateCall, callEvents } = useAMIContext();
  
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callNotes, setCallNotes] = useState("");
  const [callOutcome, setCallOutcome] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);

  // Subscribe to call records service
  useEffect(() => {
    const unsubscribe = callRecordsService.subscribe((records) => {
      setCallHistory(records.slice(0, 10));
    });

    setCallHistory(callRecordsService.getRecords().slice(0, 10));
    return unsubscribe;
  }, []);

  // Display AMI connection status and user extension info
  useEffect(() => {
    if (user && userExtension) {
      console.log(`📞 [CallCenter] User ${user.name} assigned PJSIP extension: PJSIP/${userExtension}`);
      console.log(`🔗 [CallCenter] AMI Connection Status: ${isConnected ? 'Connected' : 'Disconnected'}`);
      
      if (isConnected) {
        toast({
          title: "AMI Connected",
          description: `Ready for PJSIP calls from extension ${userExtension}`,
        });
      }
    }
  }, [user, userExtension, isConnected, toast]);

  // Listen to REAL AMI call events instead of simulating
  useEffect(() => {
    if (callEvents.length > 0) {
      const latestEvent = callEvents[0];
      console.log(`📞 [CallCenter] Processing REAL AMI event:`, latestEvent);
      
      // Handle real call events
      if (latestEvent.event === 'DialBegin' && latestEvent.calleridnum === userExtension) {
        console.log(`📞 [CallCenter] REAL CALL DETECTED: User ${userExtension} dialing ${latestEvent.destcalleridnum}`);
        
        if (pendingCall) {
          const newCall: ActiveCall = {
            id: `real_call_${latestEvent.uniqueid}`,
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
            title: "REAL Call in Progress",
            description: `Calling ${pendingCall.leadName} via PJSIP/${userExtension}`,
          });
        }
      }
      
      // Handle call answer events
      if (latestEvent.event === 'DialEnd' && latestEvent.dialstatus === 'ANSWER') {
        setActiveCall(prev => {
          if (prev) {
            toast({
              title: "Call Answered",
              description: `Connected to ${prev.leadName}`,
            });
            return { ...prev, status: 'connected', startTime: new Date() };
          }
          return prev;
        });
      }
      
      // Handle call hangup events
      if (latestEvent.event === 'Hangup' && activeCall) {
        console.log(`📞 [CallCenter] REAL HANGUP detected for ${latestEvent.channel}`);
        endCall();
      }
    }
  }, [callEvents, userExtension, pendingCall, activeCall, clearPendingCall, toast]);

  // Handle pending calls from Lead Management with REAL AMI calls
  useEffect(() => {
    if (pendingCall && !activeCall && isConnected) {
      console.log(`📞 [CallCenter] Processing pending call with REAL AMI: ${pendingCall.phone}`);
      
      // Make REAL AMI call
      const makeRealCall = async () => {
        const success = await originateCall(
          `PJSIP/${userExtension}`,
          pendingCall.phone,
          'from-internal'
        );
        
        if (success) {
          toast({
            title: "Real Call Initiated",
            description: `AMI originating call from PJSIP/${userExtension} to ${pendingCall.phone}`,
          });
        } else {
          toast({
            title: "Call Failed",
            description: "Could not initiate call via AMI",
            variant: "destructive"
          });
          clearPendingCall();
        }
      };
      
      makeRealCall();
    }
  }, [pendingCall, activeCall, isConnected, originateCall, userExtension, clearPendingCall, toast]);

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
    console.log(`📞 [CallCenter] REAL Call initiated by ${user?.name} from PJSIP/${userExtension}`);
    setActiveCall(callData);
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
      {/* SIMULATION WARNING */}
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          <h3 className="font-bold text-red-900">⚠️ BROWSER SIMULATION MODE ⚠️</h3>
        </div>
        <div className="text-sm text-red-800 space-y-1">
          <p><strong>This Call Center is running in simulation mode because:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Browsers cannot make raw TCP connections to FreePBX AMI</li>
            <li>Real AMI calls require server-side implementation</li>
            <li>The exact call format being sent is logged in browser console</li>
          </ul>
          <p className="mt-2"><strong>To see real AMI commands:</strong> Open browser developer tools → Console tab</p>
          <p><strong>Real FreePBX Integration:</strong> Requires WebSocket proxy or server-side AMI bridge</p>
        </div>
      </div>

      {/* AMI Status Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">
              PJSIP Extension: PJSIP/{userExtension} | User: {user?.name}
            </h3>
            <p className="text-sm text-blue-700">
              AMI Status: {isConnected ? '🟢 Simulated Connected' : '🔴 Disconnected'}
            </p>
          </div>
          <div className="text-sm text-blue-600">
            Simulated PJSIP calls from PJSIP/{userExtension}
          </div>
        </div>
        {callEvents.length > 0 && (
          <div className="mt-2 text-xs text-blue-600">
            Latest Simulated Event: {callEvents[0].event} - {callEvents[0].channel || callEvents[0].status || 'System'}
          </div>
        )}
      </div>

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

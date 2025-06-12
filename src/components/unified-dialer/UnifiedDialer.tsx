import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Minimize2, 
  Maximize2,
  User,
  Clock,
  Mic,
  MicOff,
  Play,
  Pause
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAMIContext } from "@/contexts/AMIContext";
import { useAuth } from "@/contexts/AuthContext";
import { callRecordsService } from "@/services/callRecordsService";

interface ActiveCall {
  id: string;
  leadName: string;
  phone: string;
  duration: string;
  status: 'connected' | 'ringing' | 'on-hold';
  startTime: Date;
  leadId?: string;
}

interface UnifiedDialerProps {
  onLeadCreated?: (leadData: { name: string; phone: string; notes: string }) => void;
}

const UnifiedDialer = ({ onLeadCreated }: UnifiedDialerProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected, originateCall, callEvents } = useAMIContext();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);

  // Listen for calls from LeadManagement
  useEffect(() => {
    const handleUnifiedDialerCall = async (event: CustomEvent) => {
      const callData = event.detail;
      console.log('📞 [UnifiedDialer] Received call request from LeadManagement:', callData);
      
      // Populate dialer fields
      setPhoneNumber(callData.phone);
      setContactName(callData.name);
      
      // Automatically initiate the call
      await performCall(callData.phone, callData.name, callData.leadId);
    };

    window.addEventListener('unifiedDialerCall', handleUnifiedDialerCall as EventListener);
    return () => window.removeEventListener('unifiedDialerCall', handleUnifiedDialerCall as EventListener);
  }, []);

  // Real-time call timer - starts immediately when call begins
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeCall && callStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const newDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        console.log('📞 [UnifiedDialer] Updating call duration:', newDuration);
        
        setActiveCall(prev => prev ? {
          ...prev,
          duration: newDuration
        } : null);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeCall, callStartTime]);

  // Listen for real AMI call events
  useEffect(() => {
    if (callEvents.length > 0 && activeCall) {
      const latestEvent = callEvents[0];
      console.log('📞 [UnifiedDialer] Processing AMI event:', latestEvent);
      
      // Check if this event relates to our user's extension
      const userExtension = user?.extension;
      const isUserChannel = userExtension && (
        latestEvent.channel?.includes(`PJSIP/${userExtension}`) ||
        latestEvent.destchannel?.includes(`PJSIP/${userExtension}`) ||
        latestEvent.calleridnum === userExtension
      );

      if (!isUserChannel) {
        console.log('📞 [UnifiedDialer] Event not for our extension, ignoring');
        return;
      }
      
      // Handle hangup events to end active calls
      if (latestEvent.event === 'Hangup') {
        console.log('📞 [UnifiedDialer] Call hangup detected, ending call');
        endCall();
      }
      
      // Handle call answer events - switch to connected status
      if (latestEvent.event === 'DialEnd' && latestEvent.dialstatus === 'ANSWER') {
        console.log('📞 [UnifiedDialer] Call answered, switching to connected');
        setActiveCall(prev => prev ? { 
          ...prev, 
          status: 'connected'
        } : null);
        
        toast({
          title: "Call Connected",
          description: `Connected to ${activeCall.leadName}`,
        });
      }

      // Handle call failure events
      if (latestEvent.event === 'DialEnd' && 
          (latestEvent.dialstatus === 'BUSY' || 
           latestEvent.dialstatus === 'NOANSWER' || 
           latestEvent.dialstatus === 'CONGESTION')) {
        console.log('📞 [UnifiedDialer] Call failed:', latestEvent.dialstatus);
        endCall();
      }
    }
  }, [callEvents, activeCall, user?.extension]);

  const performCall = async (phone: string, name: string, leadId?: string) => {
    if (!user?.extension || !phone) {
      toast({
        title: "Missing Information",
        description: !user?.extension 
          ? "No extension assigned. Contact administrator."
          : "Please enter phone number to call.",
        variant: "destructive"
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "AMI Not Connected",
        description: "Please connect to FreePBX AMI in Integration Settings first.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('📞 [UnifiedDialer] Initiating call via AMI:', {
        channel: `PJSIP/${user.extension}`,
        extension: phone,
        context: 'from-internal'
      });

      const success = await originateCall(
        `PJSIP/${user.extension}`,
        phone,
        'from-internal'
      );

      if (success) {
        const startTime = new Date();
        const newCall: ActiveCall = {
          id: `call_${Date.now()}`,
          leadName: name || 'Unknown Contact',
          phone: phone,
          duration: '00:00',
          status: 'ringing',
          startTime: startTime,
          leadId: leadId
        };

        console.log('📞 [UnifiedDialer] Call initiated, starting timer');
        setActiveCall(newCall);
        setCallStartTime(startTime); // Start the timer immediately
        setIsMinimized(false); // Expand when call starts
        
        toast({
          title: "Call Initiated",
          description: `Calling ${newCall.leadName} from extension ${user.extension}`,
        });

        // Create lead if needed (for manual calls)
        if (onLeadCreated && name && !leadId) {
          onLeadCreated({
            name: name,
            phone: phone,
            notes: 'Lead created from call'
          });
        }
      } else {
        throw new Error('Failed to originate call');
      }
    } catch (error) {
      console.error('Call origination error:', error);
      toast({
        title: "Call Failed",
        description: "Could not initiate call. Check AMI connection.",
        variant: "destructive"
      });
    }
  };

  const initiateCall = async () => {
    await performCall(phoneNumber, contactName);
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      // Record the call with final duration
      const currentUser = localStorage.getItem('current_user') || 'Unknown Agent';
      callRecordsService.addRecord({
        leadName: activeCall.leadName,
        phone: activeCall.phone,
        duration: activeCall.duration,
        outcome: 'Call Completed',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0],
        hasRecording: isRecording,
        notes: 'Call ended by user',
        agent: currentUser,
        callType: 'outgoing',
        leadId: activeCall.leadId
      });

      console.log('📞 [UnifiedDialer] Call ended, final duration:', activeCall.duration);

      setActiveCall(null);
      setCallStartTime(null); // Reset timer
      setIsRecording(false);
      setIsMuted(false);
      setPhoneNumber('');
      setContactName('');
      
      toast({
        title: "Call Ended",
        description: `Call with ${activeCall.leadName} ended. Duration: ${activeCall.duration}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end call properly",
        variant: "destructive"
      });
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast({
      title: isMuted ? "Unmuted" : "Muted",
      description: isMuted ? "Microphone active" : "Microphone muted",
    });
  };

  const holdCall = () => {
    if (activeCall) {
      const newStatus = activeCall.status === 'on-hold' ? 'connected' : 'on-hold';
      setActiveCall({ ...activeCall, status: newStatus });
      toast({
        title: newStatus === 'on-hold' ? "Call On Hold" : "Call Resumed",
        description: newStatus === 'on-hold' ? "Call placed on hold" : "Call resumed",
      });
    }
  };

  if (isMinimized && !activeCall) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full w-12 h-12 bg-primary hover:bg-primary/90"
        >
          <Phone className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
      isMinimized ? 'translate-y-full' : 'translate-y-0'
    }`}>
      <Card className="rounded-t-lg border-b-0 shadow-lg">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="font-medium">Phone</span>
              {user?.extension && (
                <Badge variant="outline" className="text-xs">
                  Ext: {user.extension}
                </Badge>
              )}
              {isConnected ? (
                <Badge className="bg-green-100 text-green-800 text-xs">Connected</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Disconnected</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Call Display */}
          {activeCall && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">{activeCall.leadName}</div>
                    <div className="text-sm text-gray-600">{activeCall.phone}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-sm font-mono font-bold text-green-700">
                        {activeCall.duration}
                      </span>
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
                    variant="destructive"
                    onClick={endCall}
                  >
                    <PhoneOff className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Dialer Interface */}
          {!activeCall && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Phone number"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Contact name (optional)"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={initiateCall} 
                  disabled={!user?.extension || !phoneNumber || !isConnected}
                  className="w-full"
                  size="sm"
                >
                  <PhoneCall className="h-3 w-3 mr-2" />
                  {!isConnected ? 'AMI Not Connected' : !user?.extension ? 'No Extension' : 'Call'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedDialer;

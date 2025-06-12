
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneCall, Users, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAMIContext } from "@/contexts/AMIContext";
import { useAuth } from "@/contexts/AuthContext";

interface CallDialerProps {
  onCallInitiated: (callData: {
    id: string;
    leadName: string;
    phone: string;
    duration: string;
    status: 'connected' | 'ringing' | 'on-hold' | 'ended';
    startTime: Date;
    leadId?: string;
  }) => void;
  disabled: boolean;
  onLeadCreated?: (leadData: {
    name: string;
    phone: string;
    notes: string;
  }) => void;
}

const CallDialer = ({ onCallInitiated, disabled, onLeadCreated }: CallDialerProps) => {
  const { toast } = useToast();
  const { isConnected, originateCall, lastEvent, callEvents } = useAMIContext();
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callType, setCallType] = useState('manual');
  const [selectedLead, setSelectedLead] = useState('');
  const [activeCall, setActiveCall] = useState<{
    id: string;
    uniqueId?: string;
    leadName: string;
    phone: string;
    startTime: Date;
    status: 'ringing' | 'connected' | 'on-hold' | 'ended';
  } | null>(null);

  // Sample leads for testing
  const testLeads = [
    { id: '1', name: 'John Smith', phone: '+1-555-0123', company: 'Acme Corp' },
    { id: '2', name: 'Sarah Johnson', phone: '+1-555-0456', company: 'Tech Solutions' },
    { id: '3', name: 'Mike Davis', phone: '+1-555-0789', company: 'Global Systems' }
  ];

  // Monitor AMI events for call status updates
  useEffect(() => {
    if (!lastEvent || !activeCall) return;

    const userExtension = user?.extension;
    if (!userExtension) return;

    console.log('📞 [CallDialer] Processing AMI event:', lastEvent);
    console.log('📞 [CallDialer] Active call:', activeCall);
    console.log('📞 [CallDialer] User extension:', userExtension);

    // Check if this event is related to our user's extension
    const isUserChannel = lastEvent.channel?.includes(`PJSIP/${userExtension}`) ||
                         lastEvent.destchannel?.includes(`PJSIP/${userExtension}`) ||
                         lastEvent.calleridnum === userExtension;

    if (!isUserChannel) return;

    let newStatus = activeCall.status;
    let shouldUpdate = false;

    switch (lastEvent.event) {
      case 'Newchannel':
        if (lastEvent.channelstate === '4' || lastEvent.channelstate === '5') {
          newStatus = 'ringing';
          shouldUpdate = true;
        }
        break;

      case 'DialBegin':
        newStatus = 'ringing';
        shouldUpdate = true;
        break;

      case 'DialEnd':
        if (lastEvent.dialstatus === 'ANSWER') {
          newStatus = 'connected';
          shouldUpdate = true;
        } else if (lastEvent.dialstatus === 'BUSY' || lastEvent.dialstatus === 'NOANSWER') {
          newStatus = 'ended';
          shouldUpdate = true;
        }
        break;

      case 'Bridge':
        newStatus = 'connected';
        shouldUpdate = true;
        break;

      case 'Hangup':
        newStatus = 'ended';
        shouldUpdate = true;
        // Clear active call after a delay
        setTimeout(() => {
          setActiveCall(null);
        }, 2000);
        break;

      case 'Hold':
        newStatus = 'on-hold';
        shouldUpdate = true;
        break;

      case 'Unhold':
        newStatus = 'connected';
        shouldUpdate = true;
        break;
    }

    if (shouldUpdate && newStatus !== activeCall.status) {
      console.log(`📞 [CallDialer] Status change: ${activeCall.status} -> ${newStatus}`);
      
      const updatedCall = {
        ...activeCall,
        status: newStatus
      };
      
      setActiveCall(updatedCall);
      
      // Calculate duration
      const duration = Math.floor((new Date().getTime() - activeCall.startTime.getTime()) / 1000);
      const durationStr = `${Math.floor(duration / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`;
      
      // Update parent component
      onCallInitiated({
        id: activeCall.id,
        leadName: activeCall.leadName,
        phone: activeCall.phone,
        duration: durationStr,
        status: newStatus,
        startTime: activeCall.startTime
      });

      toast({
        title: "Call Status Update",
        description: `Call ${newStatus}: ${activeCall.leadName}`,
      });
    }
  }, [lastEvent, activeCall, user?.extension, onCallInitiated, toast]);

  const createLeadFromCall = (name: string, phone: string, notes: string) => {
    const newLead = {
      name: name || 'Unknown Contact',
      phone: phone,
      notes: notes || 'Lead created from manual call'
    };

    // Dispatch custom event to notify LeadManagement component
    const event = new CustomEvent('newLeadCreated', { detail: newLead });
    window.dispatchEvent(event);

    if (onLeadCreated) {
      onLeadCreated(newLead);
    }

    toast({
      title: "Lead Created",
      description: `New lead created for ${newLead.name}`,
    });

    return newLead;
  };

  const initiateCall = async () => {
    let targetPhone = phoneNumber;
    let targetName = contactName || 'Unknown Contact';
    let leadId: string | undefined;

    if (callType === 'lead' && selectedLead) {
      const lead = testLeads.find(l => l.id === selectedLead);
      if (lead) {
        targetPhone = lead.phone;
        targetName = lead.name;
        leadId = lead.id;
      }
    } else if (callType === 'manual' && phoneNumber) {
      const newLead = createLeadFromCall(targetName, phoneNumber, callNotes);
      leadId = `manual_${Date.now()}`;
    }

    if (!user?.extension || !targetPhone) {
      toast({
        title: "Missing Information",
        description: !user?.extension 
          ? "No extension assigned to your user account. Contact administrator."
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
      console.log('Initiating real AMI call:', {
        channel: `PJSIP/${user.extension}`,
        extension: targetPhone,
        context: 'from-internal'
      });

      const success = await originateCall(
        `PJSIP/${user.extension}`,
        targetPhone,
        'from-internal'
      );

      if (success) {
        const newCall = {
          id: `call_${Date.now()}`,
          leadName: targetName,
          phone: targetPhone,
          startTime: new Date(),
          status: 'ringing' as const
        };

        setActiveCall(newCall);
        
        // Initial call record with ringing status
        onCallInitiated({
          id: newCall.id,
          leadName: targetName,
          phone: targetPhone,
          duration: '00:00',
          status: 'ringing',
          startTime: newCall.startTime,
          leadId
        });
        
        toast({
          title: "Call Initiated",
          description: `Calling ${targetName} at ${targetPhone} from PJSIP extension ${user.extension}`,
        });

        if (callType === 'manual') {
          setPhoneNumber('');
          setContactName('');
          setCallNotes('');
        }
        setSelectedLead('');
      } else {
        throw new Error('AMI originate call failed');
      }
    } catch (error) {
      console.error('Call origination error:', error);
      toast({
        title: "Call Failed",
        description: "Could not initiate call. Check AMI connection and extension configuration.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="h-4 w-4" />
          Quick Dial
          {!isConnected && (
            <span className="text-xs text-destructive font-normal">
              (AMI Not Connected)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Compact agent info */}
        <div className="bg-muted p-2 rounded text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {user?.name}
            </span>
            {user?.extension && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                PJSIP/{user.extension}
              </span>
            )}
          </div>
          {!user?.extension && (
            <p className="text-destructive mt-1">
              No extension assigned
            </p>
          )}
        </div>

        {/* Active call status */}
        {activeCall && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-blue-900">
                {activeCall.leadName}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                activeCall.status === 'connected' ? 'bg-green-100 text-green-800' :
                activeCall.status === 'ringing' ? 'bg-yellow-100 text-yellow-800' :
                activeCall.status === 'on-hold' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {activeCall.status}
              </span>
            </div>
            <div className="text-blue-700 mt-1">
              {activeCall.phone}
            </div>
          </div>
        )}

        {/* Compact call type selector */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={callType === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCallType('manual')}
            className="text-xs"
            disabled={!!activeCall}
          >
            Manual
          </Button>
          <Button
            variant={callType === 'lead' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCallType('lead')}
            className="text-xs"
            disabled={!!activeCall}
          >
            Lead
          </Button>
        </div>

        {callType === 'manual' && !activeCall && (
          <div className="space-y-2">
            <div>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                className="text-sm"
              />
            </div>
            <div>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact name (optional)"
                className="text-sm"
              />
            </div>
          </div>
        )}

        {callType === 'lead' && !activeCall && (
          <div>
            <Select value={selectedLead} onValueChange={setSelectedLead}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Choose lead" />
              </SelectTrigger>
              <SelectContent>
                {testLeads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      <span className="text-sm">{lead.name} - {lead.phone}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!activeCall && (
          <Button 
            onClick={initiateCall} 
            disabled={disabled || !user?.extension || (callType === 'manual' && !phoneNumber) || (callType === 'lead' && !selectedLead) || !isConnected}
            className="w-full"
            size="sm"
          >
            <PhoneCall className="h-3 w-3 mr-2" />
            {!isConnected ? 'AMI Not Connected' : !user?.extension ? 'No Extension' : 'Call'}
          </Button>
        )}
        
        {!isConnected && (
          <p className="text-xs text-muted-foreground text-center">
            Connect AMI in Integration Settings
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CallDialer;

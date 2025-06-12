
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Phone, PhoneCall, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAMIContext } from "@/contexts/AMIContext";

interface CallDialerProps {
  onCallInitiated: (callData: {
    id: string;
    leadName: string;
    phone: string;
    duration: string;
    status: 'connected' | 'ringing' | 'on-hold';
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
  const { isConnected, originateCall } = useAMIContext();
  const [extension, setExtension] = useState(localStorage.getItem('user_extension') || '1000');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [callType, setCallType] = useState('manual');
  const [selectedLead, setSelectedLead] = useState('');

  // Sample leads for testing
  const testLeads = [
    { id: '1', name: 'John Smith', phone: '+1-555-0123', company: 'Acme Corp' },
    { id: '2', name: 'Sarah Johnson', phone: '+1-555-0456', company: 'Tech Solutions' },
    { id: '3', name: 'Mike Davis', phone: '+1-555-0789', company: 'Global Systems' }
  ];

  const createLeadFromCall = (name: string, phone: string, notes: string) => {
    const newLead = {
      name: name || 'Unknown Contact',
      phone: phone,
      notes: notes || 'Lead created from manual call'
    };

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

    if (!extension || !targetPhone) {
      toast({
        title: "Missing Information",
        description: "Please enter your extension and phone number to call.",
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
      localStorage.setItem('user_extension', extension);

      console.log('Initiating real AMI call:', {
        channel: `PJSIP/${extension}`,
        extension: targetPhone,
        context: 'from-internal'
      });

      // Use real AMI originate call
      const success = await originateCall(
        `PJSIP/${extension}`, // Channel for PJSIP extension
        targetPhone,           // Number to call
        'from-internal'        // Context
      );

      if (success) {
        const newCall = {
          id: `call_${Date.now()}`,
          leadName: targetName,
          phone: targetPhone,
          duration: '00:00',
          status: 'ringing' as const,
          startTime: new Date(),
          leadId
        };

        onCallInitiated(newCall);
        
        toast({
          title: "Call Initiated",
          description: `Calling ${targetName} at ${targetPhone} from PJSIP extension ${extension}`,
        });

        // Clear form after successful call
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call Dialer
          {!isConnected && (
            <span className="text-sm text-destructive font-normal">
              (AMI Not Connected)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="extension">Your PJSIP Extension</Label>
          <Input
            id="extension"
            value={extension}
            onChange={(e) => setExtension(e.target.value)}
            placeholder="e.g., 1000"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Extension must be registered in FreePBX PJSIP
          </p>
        </div>

        <div>
          <Label htmlFor="callType">Call Type</Label>
          <Select value={callType} onValueChange={setCallType}>
            <SelectTrigger>
              <SelectValue placeholder="Select call type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Dial</SelectItem>
              <SelectItem value="lead">Call Lead</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {callType === 'manual' && (
          <>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., +1234567890"
              />
            </div>
            <div>
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact name (optional)"
              />
            </div>
            <div>
              <Label htmlFor="callNotes">Initial Notes</Label>
              <Textarea
                id="callNotes"
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Notes about this contact..."
                rows={3}
              />
            </div>
          </>
        )}

        {callType === 'lead' && (
          <div>
            <Label htmlFor="lead">Select Lead</Label>
            <Select value={selectedLead} onValueChange={setSelectedLead}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a lead to call" />
              </SelectTrigger>
              <SelectContent>
                {testLeads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{lead.name} - {lead.phone}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button 
          onClick={initiateCall} 
          disabled={disabled || !extension || (callType === 'manual' && !phoneNumber) || (callType === 'lead' && !selectedLead) || !isConnected}
          className="w-full"
        >
          <PhoneCall className="h-4 w-4 mr-2" />
          {isConnected ? 'Make Call via AMI' : 'AMI Not Connected'}
        </Button>
        
        {!isConnected && (
          <p className="text-sm text-muted-foreground text-center">
            Connect to FreePBX AMI in Integration Settings to make real calls
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CallDialer;

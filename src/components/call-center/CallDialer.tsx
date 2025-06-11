
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneCall, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

const CallDialer = ({ onCallInitiated, disabled }: CallDialerProps) => {
  const { toast } = useToast();
  const [extension, setExtension] = useState(localStorage.getItem('user_extension') || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callType, setCallType] = useState('manual');
  const [selectedLead, setSelectedLead] = useState('');

  // Sample leads for testing
  const testLeads = [
    { id: '1', name: 'John Smith', phone: '+1-555-0123', company: 'Acme Corp' },
    { id: '2', name: 'Sarah Johnson', phone: '+1-555-0456', company: 'Tech Solutions' },
    { id: '3', name: 'Mike Davis', phone: '+1-555-0789', company: 'Global Systems' }
  ];

  const initiateCall = async () => {
    let targetPhone = phoneNumber;
    let targetName = 'Unknown Contact';
    let leadId: string | undefined;

    if (callType === 'lead' && selectedLead) {
      const lead = testLeads.find(l => l.id === selectedLead);
      if (lead) {
        targetPhone = lead.phone;
        targetName = lead.name;
        leadId = lead.id;
      }
    }

    if (!extension || !targetPhone) {
      toast({
        title: "Missing Information",
        description: "Please enter your extension and select a contact to call.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Save extension to localStorage
      localStorage.setItem('user_extension', extension);

      // Simulate call initiation (in real implementation, this would call FreePBX API)
      console.log('Initiating call:', {
        extension,
        phone: targetPhone,
        leadName: targetName,
        leadId
      });

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
        description: `Calling ${targetName} at ${targetPhone} from extension ${extension}`,
      });

      // Clear form after successful call
      if (callType === 'manual') {
        setPhoneNumber('');
      }
      setSelectedLead('');
    } catch (error) {
      toast({
        title: "Call Failed",
        description: "Could not initiate call. Check your configuration.",
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g., +1234567890"
            />
          </div>
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
          disabled={disabled || !extension || (callType === 'manual' && !phoneNumber) || (callType === 'lead' && !selectedLead)}
          className="w-full"
        >
          <PhoneCall className="h-4 w-4 mr-2" />
          Make Call
        </Button>
      </CardContent>
    </Card>
  );
};

export default CallDialer;

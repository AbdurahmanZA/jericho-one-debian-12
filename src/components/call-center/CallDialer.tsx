
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, PhoneCall } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CallDialerProps {
  onCallInitiated: (callData: {
    id: string;
    leadName: string;
    phone: string;
    duration: string;
    status: 'connected' | 'ringing' | 'on-hold';
    startTime: Date;
  }) => void;
  disabled: boolean;
}

const CallDialer = ({ onCallInitiated, disabled }: CallDialerProps) => {
  const { toast } = useToast();
  const [extension, setExtension] = useState(localStorage.getItem('user_extension') || '');
  const [phoneNumber, setPhoneNumber] = useState('');

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
        const newCall = {
          id: `call_${Date.now()}`,
          leadName: `Lead ${phoneNumber}`,
          phone: phoneNumber,
          duration: '00:00',
          status: 'ringing' as const,
          startTime: new Date()
        };

        onCallInitiated(newCall);
        toast({
          title: "Call Initiated",
          description: `Calling ${phoneNumber} from extension ${extension}`,
        });
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

  return (
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
          disabled={disabled || !extension || !phoneNumber}
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

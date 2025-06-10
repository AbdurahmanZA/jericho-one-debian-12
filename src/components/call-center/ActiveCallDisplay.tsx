
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Play, 
  Pause,
  Clock,
  Mic,
  MicOff,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActiveCall {
  id: string;
  leadName: string;
  phone: string;
  duration: string;
  status: 'connected' | 'ringing' | 'on-hold';
  startTime: Date;
}

interface ActiveCallDisplayProps {
  activeCall: ActiveCall;
  isRecording: boolean;
  isMuted: boolean;
  onEndCall: () => void;
  onToggleRecording: () => void;
  onToggleMute: () => void;
  onHoldCall: () => void;
}

const ActiveCallDisplay = ({ 
  activeCall, 
  isRecording, 
  isMuted, 
  onEndCall, 
  onToggleRecording, 
  onToggleMute, 
  onHoldCall 
}: ActiveCallDisplayProps) => {
  return (
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
              onClick={onToggleMute}
            >
              {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            </Button>
            <Button 
              size="sm" 
              variant={activeCall.status === 'on-hold' ? "default" : "outline"}
              onClick={onHoldCall}
            >
              {activeCall.status === 'on-hold' ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
            <Button 
              size="sm" 
              variant={isRecording ? "destructive" : "outline"}
              onClick={onToggleRecording}
            >
              <Volume2 className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={onEndCall}
            >
              <PhoneOff className="h-3 w-3" />
              End Call
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveCallDisplay;

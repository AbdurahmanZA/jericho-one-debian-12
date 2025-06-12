
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAMIContext } from "@/contexts/AMIContext";
import { useAuth } from "@/contexts/AuthContext";
import { callRecordsService, CallRecord } from "@/services/callRecordsService";
import CallHistory from "./call-center/CallHistory";
import UnifiedDialer from "./unified-dialer/UnifiedDialer";

interface CallCenterProps {
  userRole: string;
}

const CallCenter = ({ userRole }: CallCenterProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isConnected, userExtension } = useAMIContext();
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
    }
  }, [user, userExtension, isConnected]);

  const handleLeadCreated = (leadData: { name: string; phone: string; notes: string }) => {
    console.log('New lead created from call:', leadData);
    
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

  return (
    <div className="space-y-6 pb-32"> {/* Add bottom padding for unified dialer */}
      {/* Compact Status Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium text-blue-900">
              Agent: {user?.name} | PJSIP/{userExtension}
            </span>
            <span className="ml-4 text-blue-700">
              AMI: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Call History */}
      <div className="w-full">
        <CallHistory calls={callHistory} />
      </div>

      {/* Unified Dialer - Fixed at bottom */}
      <UnifiedDialer onLeadCreated={handleLeadCreated} />
    </div>
  );
};

export default CallCenter;

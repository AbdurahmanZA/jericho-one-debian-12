
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Wifi } from "lucide-react";

interface SyncSettingsCardProps {
  config: {
    autoSync: boolean;
    callLogging: boolean;
    notifications: boolean;
    syncInterval: number;
  };
  onConfigUpdate: (field: string, value: any) => void;
}

const SyncSettingsCard = ({ config, onConfigUpdate }: SyncSettingsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          Synchronization Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-sync">Automatic Synchronization</Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync contacts and call logs between FreePBX and CRM
            </p>
          </div>
          <Switch 
            id="auto-sync"
            checked={config.autoSync}
            onCheckedChange={(checked) => onConfigUpdate('autoSync', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="call-logging">Call Logging</Label>
            <p className="text-sm text-muted-foreground">
              Log all incoming and outgoing calls to CRM
            </p>
          </div>
          <Switch 
            id="call-logging"
            checked={config.callLogging}
            onCheckedChange={(checked) => onConfigUpdate('callLogging', checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Send notifications for missed calls and new contacts
            </p>
          </div>
          <Switch 
            id="notifications"
            checked={config.notifications}
            onCheckedChange={(checked) => onConfigUpdate('notifications', checked)}
          />
        </div>
        
        <div>
          <Label htmlFor="sync-interval">Sync Interval (minutes)</Label>
          <Input 
            id="sync-interval" 
            value={config.syncInterval}
            onChange={(e) => onConfigUpdate('syncInterval', parseInt(e.target.value) || 5)}
            placeholder="Sync interval in minutes"
            type="number"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncSettingsCard;

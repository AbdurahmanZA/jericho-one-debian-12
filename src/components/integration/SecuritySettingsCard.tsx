
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield } from "lucide-react";

interface SecuritySettingsCardProps {
  config: {
    url: string;
    secret: string;
  };
  onConfigUpdate: (field: string, value: string) => void;
}

const SecuritySettingsCard = ({ config, onConfigUpdate }: SecuritySettingsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Security & API Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <Input 
            id="webhook-url" 
            value={config.url}
            onChange={(e) => onConfigUpdate('url', e.target.value)}
            placeholder="Webhook endpoint"
          />
        </div>
        <div>
          <Label htmlFor="webhook-secret">Webhook Secret</Label>
          <Input 
            id="webhook-secret" 
            type="password"
            value={config.secret}
            onChange={(e) => onConfigUpdate('secret', e.target.value)}
            placeholder="Webhook secret key"
          />
        </div>
        <div>
          <Label htmlFor="encryption">Encryption Settings</Label>
          <Textarea 
            id="encryption" 
            value="SSL/TLS encryption enabled for all connections"
            placeholder="Encryption configuration"
            readOnly
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SecuritySettingsCard;

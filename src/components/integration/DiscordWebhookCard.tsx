
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  MessageCircle, 
  Send, 
  ExternalLink,
  Check,
  X
} from "lucide-react";

interface DiscordWebhookCardProps {
  config: {
    url: string;
    channelName: string;
    enabled: boolean;
  };
  onConfigUpdate: (field: string, value: string | boolean) => void;
}

const DiscordWebhookCard = ({ config, onConfigUpdate }: DiscordWebhookCardProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [testMessage, setTestMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if Discord webhook is configured
    if (config.url && config.channelName) {
      setIsConnected(true);
    }
  }, [config.url, config.channelName]);

  const saveWebhookConfig = () => {
    if (!config.url.includes('discord.com/api/webhooks/')) {
      toast({
        title: "Invalid Webhook URL",
        description: "Please enter a valid Discord webhook URL",
        variant: "destructive"
      });
      return;
    }

    onConfigUpdate('enabled', true);
    setIsConnected(true);

    toast({
      title: "Discord Integration Configured",
      description: "Webhook settings saved successfully",
    });
  };

  const sendTestMessage = async () => {
    if (!config.url || !testMessage.trim()) {
      toast({
        title: "Missing Information",
        description: "Please configure webhook and enter a test message",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `🧪 **Test Message from JERICHO ONE**\n\n${testMessage}\n\n**Sent by:** ${user?.name || 'Unknown User'} (${user?.extension || 'No Extension'})`,
          username: 'JERICHO ONE CRM',
          avatar_url: 'https://via.placeholder.com/64x64/2D5563/ffffff?text=J1'
        })
      });

      if (response.ok) {
        toast({
          title: "Test Message Sent",
          description: "Check your Discord channel for the test message",
        });
        setTestMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      toast({
        title: "Failed to Send Message",
        description: "Please check your webhook URL and try again",
        variant: "destructive"
      });
    }
  };

  const sendLeadUpdate = async (leadName: string, action: string, details: string) => {
    if (!config.enabled || !config.url) return;

    const actionEmoji = action === 'called' ? '📞' : action === 'updated' ? '✏️' : '👤';
    
    try {
      await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `${actionEmoji} **Lead ${action.charAt(0).toUpperCase() + action.slice(1)}**\n\n**Lead:** ${leadName}\n**Action:** ${details}\n**Agent:** ${user?.name || 'Unknown User'} (Ext: ${user?.extension || 'N/A'})\n**Time:** ${new Date().toLocaleString()}`,
          username: 'JERICHO ONE CRM',
          avatar_url: 'https://via.placeholder.com/64x64/2D5563/ffffff?text=J1'
        })
      });
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
    }
  };

  // Store the sendLeadUpdate function globally so other components can use it
  useEffect(() => {
    (window as any).sendDiscordNotification = sendLeadUpdate;
  }, [config.enabled, config.url, user]);

  const openDiscordApp = () => {
    window.open('https://discord.com/app', '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Discord Integration
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Configured" : "Not Connected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Access */}
        <div className="flex gap-2 mb-4">
          <Button onClick={openDiscordApp} className="flex items-center gap-2" size="sm">
            <ExternalLink className="h-4 w-4" />
            Open Discord
          </Button>
        </div>

        {/* Webhook Configuration */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Discord Webhook URL</label>
            <Input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={config.url}
              onChange={(e) => onConfigUpdate('url', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get this from your Discord server settings → Integrations → Webhooks
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Channel Name</label>
            <Input
              placeholder="#leads"
              value={config.channelName}
              onChange={(e) => onConfigUpdate('channelName', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The Discord channel where notifications will be sent
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={saveWebhookConfig} className="flex items-center gap-2" size="sm">
            <Check className="h-4 w-4" />
            Save Configuration
          </Button>
          {config.enabled && (
            <Button 
              variant="outline" 
              onClick={() => {
                onConfigUpdate('enabled', false);
                toast({
                  title: "Discord Notifications Disabled",
                  description: "Lead notifications will no longer be sent to Discord",
                });
              }}
              className="flex items-center gap-2"
              size="sm"
            >
              <X className="h-4 w-4" />
              Disable
            </Button>
          )}
        </div>

        {/* Test Message */}
        {config.enabled && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Test Webhook</h3>
            <div className="flex gap-2">
              <Textarea
                placeholder="Enter a test message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="flex-1"
                rows={2}
              />
              <Button onClick={sendTestMessage} className="flex items-center gap-2" size="sm">
                <Send className="h-4 w-4" />
                Send Test
              </Button>
            </div>
          </div>
        )}

        {/* Notification Types */}
        {config.enabled && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Auto Notifications</h3>
            <div className="grid md:grid-cols-3 gap-2">
              <div className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-xs">Lead Called</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-xs">Lead Updated</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-xs">Status Changed</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscordWebhookCard;

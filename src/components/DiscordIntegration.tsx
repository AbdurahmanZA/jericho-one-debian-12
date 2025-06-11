
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Settings, 
  Send, 
  Webhook, 
  Users, 
  Phone,
  ExternalLink,
  Bell,
  Hash,
  Check,
  X
} from "lucide-react";

interface DiscordIntegrationProps {
  userRole: string;
}

interface WebhookConfig {
  url: string;
  channelName: string;
  enabled: boolean;
}

const DiscordIntegration = ({ userRole }: DiscordIntegrationProps) => {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('discord_webhook') || '');
  const [channelName, setChannelName] = useState(localStorage.getItem('discord_channel') || '#leads');
  const [webhookEnabled, setWebhookEnabled] = useState(
    localStorage.getItem('discord_webhook_enabled') === 'true'
  );
  const [testMessage, setTestMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if Discord webhook is configured
    if (webhookUrl && channelName) {
      setIsConnected(true);
    }
  }, [webhookUrl, channelName]);

  const saveWebhookConfig = () => {
    if (!webhookUrl.includes('discord.com/api/webhooks/')) {
      toast({
        title: "Invalid Webhook URL",
        description: "Please enter a valid Discord webhook URL",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem('discord_webhook', webhookUrl);
    localStorage.setItem('discord_channel', channelName);
    localStorage.setItem('discord_webhook_enabled', 'true');
    setWebhookEnabled(true);
    setIsConnected(true);

    toast({
      title: "Discord Integration Configured",
      description: "Webhook settings saved successfully",
    });
  };

  const sendTestMessage = async () => {
    if (!webhookUrl || !testMessage.trim()) {
      toast({
        title: "Missing Information",
        description: "Please configure webhook and enter a test message",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `🧪 **Test Message from JERICHO ONE**\n\n${testMessage}`,
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
    if (!webhookEnabled || !webhookUrl) return;

    const actionEmoji = action === 'called' ? '📞' : action === 'updated' ? '✏️' : '👤';
    
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `${actionEmoji} **Lead ${action.charAt(0).toUpperCase() + action.slice(1)}**\n\n**Lead:** ${leadName}\n**Action:** ${details}\n**Time:** ${new Date().toLocaleString()}`,
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
  }, [webhookEnabled, webhookUrl]);

  const openDiscordApp = () => {
    window.open('https://discord.com/app', '_blank');
  };

  const openDiscordLogin = () => {
    window.open('https://discord.com/login', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Discord Chat Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Discord Chat Access
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Configured" : "Not Connected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Quick Access to Discord</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Access Discord directly from JERICHO ONE. Sign in with your existing Discord account.
                </p>
                <div className="flex gap-2">
                  <Button onClick={openDiscordApp} className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open Discord App
                  </Button>
                  <Button variant="outline" onClick={openDiscordLogin} className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Discord Login
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Embedded Discord</h3>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    For security reasons, Discord doesn't allow embedding their chat directly. 
                    Use the buttons above to access Discord in a new tab.
                  </p>
                  <Badge variant="outline" className="text-xs">
                    Opens in new window
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Lead Notifications Setup
            <Badge variant={webhookEnabled ? "default" : "secondary"}>
              {webhookEnabled ? "Active" : "Inactive"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Discord Webhook URL</label>
                <Input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get this from your Discord server settings → Integrations → Webhooks
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Channel Name</label>
                <Input
                  placeholder="#leads"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The Discord channel where notifications will be sent
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveWebhookConfig} className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Save Configuration
              </Button>
              {webhookEnabled && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setWebhookEnabled(false);
                    localStorage.setItem('discord_webhook_enabled', 'false');
                    toast({
                      title: "Discord Notifications Disabled",
                      description: "Lead notifications will no longer be sent to Discord",
                    });
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Disable
                </Button>
              )}
            </div>

            {/* Test Message */}
            {webhookEnabled && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Test Webhook</h3>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Enter a test message..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={sendTestMessage} className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Test
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      {webhookEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Lead Called</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Lead Updated</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Lead Status Changed</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Notifications are automatically sent when leads are called or updated from the Lead Management tab.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiscordIntegration;

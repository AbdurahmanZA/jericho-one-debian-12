
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  MessageCircle, 
  Send, 
  Minimize2, 
  Maximize2,
  X
} from "lucide-react";

interface DiscordChatProps {
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  user: string;
}

const DiscordChat = ({ isMinimized, onToggleMinimize }: DiscordChatProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  // Load Discord webhook config from localStorage
  useEffect(() => {
    const url = localStorage.getItem('discord_webhook') || '';
    const enabled = localStorage.getItem('discord_webhook_enabled') === 'true';
    setWebhookUrl(url);
    setWebhookEnabled(enabled);
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || !webhookUrl || !webhookEnabled) {
      toast({
        title: "Cannot Send Message",
        description: !webhookUrl ? "Discord webhook not configured" : "Please enter a message",
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
          content: `💬 **${user?.name || 'Agent'}** (Ext: ${user?.extension || 'N/A'}): ${message}`,
          username: 'JERICHO ONE Chat',
          avatar_url: 'https://via.placeholder.com/64x64/2D5563/ffffff?text=J1'
        })
      });

      if (response.ok) {
        // Add message to local chat history
        const newMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          content: message,
          timestamp: new Date(),
          user: user?.name || 'Agent'
        };
        
        setMessages(prev => [...prev, newMessage]);
        setMessage('');
        
        toast({
          title: "Message Sent",
          description: "Message sent to Discord channel",
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      toast({
        title: "Failed to Send Message",
        description: "Please check your Discord webhook configuration",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isMinimized) {
    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={onToggleMinimize}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Discord Chat
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-80 h-96 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="font-medium text-sm">Discord Chat</span>
            {webhookEnabled ? (
              <Badge className="bg-green-100 text-green-800 text-xs">Connected</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">Not Connected</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimize}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-3 space-y-3">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 border rounded-md p-2">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-4">
              {webhookEnabled ? "Start chatting with your Discord channel" : "Configure Discord webhook in Integrations to enable chat"}
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="font-medium">{msg.user}</span>
                    <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-foreground">{msg.content}</div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={webhookEnabled ? "Type a message..." : "Configure Discord webhook first"}
            disabled={!webhookEnabled}
            className="text-sm"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!message.trim() || !webhookEnabled}
            size="sm"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>

        {!webhookEnabled && (
          <div className="text-xs text-muted-foreground text-center">
            Go to Integrations → Discord to set up webhook
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscordChat;

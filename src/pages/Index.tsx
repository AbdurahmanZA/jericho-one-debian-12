
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Phone, 
  Users, 
  Database, 
  Settings, 
  Github, 
  Server, 
  Activity,
  ExternalLink,
  Download,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import SystemStatus from "@/components/SystemStatus";
import ContactManager from "@/components/ContactManager";
import CallLogs from "@/components/CallLogs";
import IntegrationSettings from "@/components/IntegrationSettings";
import GitHubRecommendations from "@/components/GitHubRecommendations";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            FreePBX CRM Integration Hub
          </h1>
          <p className="text-lg text-gray-600">
            Manage your Debian-based FreePBX and CRM integration from a single dashboard
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-max">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="calls" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Logs
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="github" className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              GitHub CRMs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SystemStatus />
          </TabsContent>

          <TabsContent value="contacts">
            <ContactManager />
          </TabsContent>

          <TabsContent value="calls">
            <CallLogs />
          </TabsContent>

          <TabsContent value="settings">
            <IntegrationSettings />
          </TabsContent>

          <TabsContent value="github">
            <GitHubRecommendations />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;

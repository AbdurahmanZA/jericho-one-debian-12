import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { AMIProvider } from "@/contexts/AMIContext";
import CallCenter from "@/components/CallCenter";
import LeadManagement from "@/components/LeadManagement";
import ContactManager from "@/components/ContactManager";
import CallLogs from "@/components/CallLogs";
import UserManagement from "@/components/UserManagement";
import ReportsAnalytics from "@/components/ReportsAnalytics";
import IntegrationSettings from "@/components/IntegrationSettings";
import SystemStatus from "@/components/SystemStatus";

const Index = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("call-center");

  if (!user) {
    return null; // This shouldn't happen as auth is handled in App.tsx
  }

  const isAdmin = user.role === 'Administrator';
  const isManager = user.role === 'Manager' || isAdmin;

  return (
    <AMIProvider>
      <div className="container mx-auto p-6 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8">
            <TabsTrigger value="call-center">Call Center</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="call-logs">Call Logs</TabsTrigger>
            {isManager && <TabsTrigger value="users">Users</TabsTrigger>}
            {isManager && <TabsTrigger value="reports">Reports</TabsTrigger>}
            {isAdmin && <TabsTrigger value="integration">Integration</TabsTrigger>}
            {isAdmin && <TabsTrigger value="system">System</TabsTrigger>}
          </TabsList>

          <TabsContent value="call-center" className="space-y-4">
            <CallCenter userRole={user.role} />
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <LeadManagement userRole={user.role} />
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <ContactManager />
          </TabsContent>

          <TabsContent value="call-logs" className="space-y-4">
            <CallLogs />
          </TabsContent>

          {isManager && (
            <TabsContent value="users" className="space-y-4">
              <UserManagement />
            </TabsContent>
          )}

          {isManager && (
            <TabsContent value="reports" className="space-y-4">
              <ReportsAnalytics userRole={user.role} />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="integration" className="space-y-4">
              <IntegrationSettings />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="system" className="space-y-4">
              <SystemStatus />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AMIProvider>
  );
};

export default Index;

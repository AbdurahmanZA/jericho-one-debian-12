
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeadManagement from "@/components/LeadManagement";
import CallCenter from "@/components/CallCenter";
import CallbackCalendar from "@/components/callback-calendar/CallbackCalendar";
import ReportsAnalytics from "@/components/ReportsAnalytics";
import IntegrationSettings from "@/components/IntegrationSettings";
import UserManagement from "@/components/UserManagement";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("leads");

  if (!user) return null;

  const canManageUsers = user.role === "Manager" || user.role === "Administrator";

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.name}
        </h1>
        <p className="text-muted-foreground">
          Manage your leads, calls, and team performance from your dashboard.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${canManageUsers ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="leads">Lead Management</TabsTrigger>
          <TabsTrigger value="calls">Call Center</TabsTrigger>
          <TabsTrigger value="calendar">Callback Calendar</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="users">User Management</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="leads">
          <LeadManagement userRole={user.role} />
        </TabsContent>

        <TabsContent value="calls">
          <CallCenter userRole={user.role} />
        </TabsContent>

        <TabsContent value="calendar">
          <CallbackCalendar userRole={user.role} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsAnalytics userRole={user.role} />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationSettings />
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Index;

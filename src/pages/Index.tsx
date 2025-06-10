
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Phone, 
  Users, 
  Database, 
  Settings, 
  Github, 
  Server, 
  Activity,
  Upload,
  FileSpreadsheet,
  UserCheck,
  BarChart3,
  Clock
} from "lucide-react";
import SystemStatus from "@/components/SystemStatus";
import LeadManagement from "@/components/LeadManagement";
import CallCenter from "@/components/CallCenter";
import IntegrationSettings from "@/components/IntegrationSettings";
import ReportsAnalytics from "@/components/ReportsAnalytics";
import UserManagement from "@/components/UserManagement";

const Index = () => {
  const [activeTab, setActiveTab] = useState("leads");
  const [userRole, setUserRole] = useState("agent"); // agent, manager, administrator

  const getRoleBasedTabs = () => {
    const baseTabs = [
      { id: "leads", label: "Lead Management", icon: Users },
      { id: "calls", label: "Call Center", icon: Phone }
    ];

    if (userRole === "manager" || userRole === "administrator") {
      baseTabs.push(
        { id: "reports", label: "Reports & Analytics", icon: BarChart3 }
      );
    }

    if (userRole === "administrator") {
      baseTabs.push(
        { id: "users", label: "User Management", icon: UserCheck },
        { id: "system", label: "System Status", icon: Server },
        { id: "settings", label: "Integration Settings", icon: Settings }
      );
    }

    return baseTabs;
  };

  const roleBasedTabs = getRoleBasedTabs();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              FreePBX CRM Integration
            </h1>
            <p className="text-lg text-gray-600">
              Streamlined lead management with VoIP integration
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Role:</span>
              <Select value={userRole} onValueChange={setUserRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="administrator">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Online
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-max">
            {roleBasedTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="leads">
            <LeadManagement userRole={userRole} />
          </TabsContent>

          <TabsContent value="calls">
            <CallCenter userRole={userRole} />
          </TabsContent>

          {(userRole === "manager" || userRole === "administrator") && (
            <TabsContent value="reports">
              <ReportsAnalytics userRole={userRole} />
            </TabsContent>
          )}

          {userRole === "administrator" && (
            <>
              <TabsContent value="users">
                <UserManagement />
              </TabsContent>

              <TabsContent value="system">
                <SystemStatus />
              </TabsContent>

              <TabsContent value="settings">
                <IntegrationSettings />
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Quick Stats Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Session: 2h 15m</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="text-sm">Calls Today: 23</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Assigned Leads: 47</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">FreePBX Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;


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
  Clock,
  Shield
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg jericho-gradient text-white font-bold text-lg">
              J1
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary mb-1">
                JERICHO ONE
              </h1>
              <p className="text-lg text-muted-foreground font-medium">
                Professional CRM & Communications Platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Role:</span>
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
            <Badge variant="outline" className="flex items-center gap-1 border-primary/20 text-primary">
              <Shield className="h-3 w-3" />
              Secure Connection
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-max bg-card border">
            {roleBasedTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
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

        {/* Professional Status Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Session: 2h 15m</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Calls Today: 23</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Assigned Leads: 47</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-muted-foreground">JERICHO ONE Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

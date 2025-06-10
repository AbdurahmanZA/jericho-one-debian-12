
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Server, 
  Database, 
  Phone, 
  Activity,
  CheckCircle,
  AlertCircle,
  Wifi,
  HardDrive
} from "lucide-react";

const SystemStatus = () => {
  const systemStats = [
    {
      title: "ESXi Server",
      status: "online",
      value: "192.168.1.100",
      icon: Server,
      details: "VM Resources: 8GB RAM, 4 vCPU"
    },
    {
      title: "FreePBX Status",
      status: "online",
      value: "Active",
      icon: Phone,
      details: "Version: 16.0.19, Extensions: 25"
    },
    {
      title: "CRM Database",
      status: "online",
      value: "Connected",
      icon: Database,
      details: "MySQL 8.0, 1,247 contacts"
    },
    {
      title: "Network",
      status: "online",
      value: "Stable",
      icon: Wifi,
      details: "Latency: 2ms, Uptime: 99.9%"
    }
  ];

  const recentActivity = [
    { time: "10:30 AM", event: "New contact added", type: "info" },
    { time: "10:15 AM", event: "Incoming call from +1-555-0123", type: "success" },
    { time: "09:45 AM", event: "CRM sync completed", type: "success" },
    { time: "09:30 AM", event: "FreePBX backup completed", type: "info" },
    { time: "09:00 AM", event: "System maintenance check", type: "warning" }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <Badge 
                    variant={stat.status === "online" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {stat.status === "online" ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertCircle className="h-3 w-3 mr-1" />
                    )}
                    {stat.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{stat.details}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{activity.event}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <Badge 
                    variant={
                      activity.type === "success" ? "default" : 
                      activity.type === "warning" ? "secondary" : "outline"
                    }
                  >
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              System Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CPU Usage</span>
                  <span>45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Memory Usage</span>
                  <span>62%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Disk Usage</span>
                  <span>78%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemStatus;

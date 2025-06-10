
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Phone,
  Clock,
  Target,
  Download,
  Calendar
} from "lucide-react";

interface ReportsAnalyticsProps {
  userRole: string;
}

const ReportsAnalytics = ({ userRole }: ReportsAnalyticsProps) => {
  const performanceMetrics = [
    {
      title: "Total Calls Today",
      value: "127",
      change: "+12%",
      trend: "up",
      icon: Phone
    },
    {
      title: "Contact Rate",
      value: "68%",
      change: "+5%",
      trend: "up",
      icon: Target
    },
    {
      title: "Qualified Leads",
      value: "23",
      change: "+18%",
      trend: "up",
      icon: Users
    },
    {
      title: "Avg Call Duration",
      value: "4:32",
      change: "-8%",
      trend: "down",
      icon: Clock
    }
  ];

  const agentPerformance = [
    {
      name: "Sarah Wilson",
      calls: 45,
      contactRate: "72%",
      qualified: 8,
      avgDuration: "5:12"
    },
    {
      name: "Mike Davis",
      calls: 38,
      contactRate: "65%",
      qualified: 6,
      avgDuration: "4:48"
    },
    {
      name: "John Parker",
      calls: 44,
      contactRate: "70%",
      qualified: 9,
      avgDuration: "3:56"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reports & Analytics</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center space-x-2 text-xs">
                  <TrendingUp className={`h-3 w-3 ${
                    metric.trend === "up" ? "text-green-500" : "text-red-500"
                  }`} />
                  <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>
                    {metric.change}
                  </span>
                  <span className="text-muted-foreground">vs last week</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Agent Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Agent Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Agent</th>
                  <th className="text-left p-3">Calls Made</th>
                  <th className="text-left p-3">Contact Rate</th>
                  <th className="text-left p-3">Qualified Leads</th>
                  <th className="text-left p-3">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((agent, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{agent.name}</td>
                    <td className="p-3">{agent.calls}</td>
                    <td className="p-3">
                      <Badge variant="outline">{agent.contactRate}</Badge>
                    </td>
                    <td className="p-3">{agent.qualified}</td>
                    <td className="p-3">{agent.avgDuration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Source Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { source: "Website", count: 45, percentage: 38 },
                { source: "Referrals", count: 32, percentage: 27 },
                { source: "Cold Calls", count: 28, percentage: 24 },
                { source: "Social Media", count: 13, percentage: 11 }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{item.source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { stage: "Total Leads", count: 247, percentage: 100 },
                { stage: "Contacted", count: 168, percentage: 68 },
                { stage: "Qualified", count: 89, percentage: 36 },
                { stage: "Proposal Sent", count: 34, percentage: 14 },
                { stage: "Converted", count: 12, percentage: 5 }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{item.stage}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsAnalytics;

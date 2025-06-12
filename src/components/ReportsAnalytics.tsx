
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Phone, Target, Calendar, Download, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportsAnalyticsProps {
  userRole: string;
}

const ReportsAnalytics = ({ userRole }: ReportsAnalyticsProps) => {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("week");

  // Sample data for charts
  const callVolumeData = [
    { name: 'Mon', calls: 45, answered: 38 },
    { name: 'Tue', calls: 52, answered: 44 },
    { name: 'Wed', calls: 38, answered: 32 },
    { name: 'Thu', calls: 61, answered: 53 },
    { name: 'Fri', calls: 55, answered: 48 },
    { name: 'Sat', calls: 28, answered: 24 },
    { name: 'Sun', calls: 22, answered: 18 }
  ];

  const conversionData = [
    { name: 'Week 1', leads: 120, qualified: 45, converted: 12 },
    { name: 'Week 2', leads: 135, qualified: 52, converted: 15 },
    { name: 'Week 3', leads: 98, qualified: 38, converted: 9 },
    { name: 'Week 4', leads: 142, qualified: 58, converted: 18 }
  ];

  const leadSourceData = [
    { name: 'Website', value: 35, color: '#8884d8' },
    { name: 'Cold Call', value: 25, color: '#82ca9d' },
    { name: 'Referral', value: 20, color: '#ffc658' },
    { name: 'LinkedIn', value: 15, color: '#ff7300' },
    { name: 'Other', value: 5, color: '#8dd1e1' }
  ];

  // Sample leads data for export
  const sampleLeads = [
    {
      id: 1,
      name: "John Smith",
      company: "Acme Corp",
      phone: "+1-555-0123",
      email: "john@acme.com",
      status: "qualified",
      priority: "high",
      source: "Website",
      assignedAgent: "Sarah Wilson",
      lastContact: "2024-06-12",
      dateCreated: "2024-06-01",
      notes: "Interested in enterprise solution. Requested follow-up call for next week."
    },
    {
      id: 2,
      name: "Sarah Johnson",
      company: "Tech Solutions",
      phone: "+1-555-0456",
      email: "sarah@techsol.com",
      status: "contacted",
      priority: "medium",
      source: "Referral",
      assignedAgent: "Mike Davis",
      lastContact: "2024-06-11",
      dateCreated: "2024-06-05",
      notes: "Requested callback for pricing. Very interested in custom development package."
    },
    {
      id: 3,
      name: "Mike Davis",
      company: "Global Systems",
      phone: "+1-555-0789",
      email: "mike@global.com",
      status: "converted",
      priority: "high",
      source: "Cold Call",
      assignedAgent: "Sarah Wilson",
      lastContact: "2024-06-10",
      dateCreated: "2024-05-28",
      notes: "CONVERTED: Signed contract for $50k annual license. Implementation starts next month."
    },
    {
      id: 4,
      name: "Emily Brown",
      company: "Innovation Labs",
      phone: "+1-555-0321",
      email: "emily@innovlabs.com",
      status: "new",
      priority: "medium",
      source: "LinkedIn",
      assignedAgent: "John Doe",
      lastContact: "Never",
      dateCreated: "2024-06-12",
      notes: "Inquiry about custom development. Needs technical consultation call."
    },
    {
      id: 5,
      name: "Robert Wilson",
      company: "Digital Agency",
      phone: "+1-555-0654",
      email: "robert@digitalagency.com",
      status: "follow-up",
      priority: "low",
      source: "Trade Show",
      assignedAgent: "Sarah Wilson",
      lastContact: "2024-06-08",
      dateCreated: "2024-05-15",
      notes: "Needs budget approval from management. Follow up in 2 weeks."
    }
  ];

  const exportAllLeads = () => {
    try {
      // Prepare CSV headers
      const headers = [
        'ID',
        'Name', 
        'Company',
        'Phone',
        'Email',
        'Status',
        'Priority',
        'Source',
        'Assigned Agent',
        'Last Contact',
        'Date Created',
        'Notes'
      ];

      // Convert leads data to CSV format
      const csvContent = [
        headers.join(','),
        ...sampleLeads.map(lead => [
          lead.id,
          `"${lead.name}"`,
          `"${lead.company}"`,
          `"${lead.phone}"`,
          `"${lead.email}"`,
          lead.status,
          lead.priority,
          lead.source,
          `"${lead.assignedAgent}"`,
          lead.lastContact,
          lead.dateCreated,
          `"${lead.notes.replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `${sampleLeads.length} leads exported successfully with latest notes and details.`,
      });

      console.log('Leads exported:', sampleLeads.length, 'records');
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export leads data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportCallReports = () => {
    try {
      const callReports = [
        {
          date: '2024-06-12',
          totalCalls: 45,
          answered: 38,
          missed: 7,
          avgDuration: '4:32',
          conversions: 3
        },
        {
          date: '2024-06-11',
          totalCalls: 52,
          answered: 44,
          missed: 8,
          avgDuration: '3:58',
          conversions: 5
        }
      ];

      const headers = ['Date', 'Total Calls', 'Answered', 'Missed', 'Avg Duration', 'Conversions'];
      const csvContent = [
        headers.join(','),
        ...callReports.map(report => [
          report.date,
          report.totalCalls,
          report.answered,
          report.missed,
          report.avgDuration,
          report.conversions
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `call_reports_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Call Reports Exported",
        description: "Call analytics data exported successfully.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export call reports. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Export Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Reports & Analytics
            </CardTitle>
            <div className="flex items-center gap-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={exportAllLeads} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export All Leads
                </Button>
                <Button onClick={exportCallReports} variant="outline" className="flex items-center gap-2">
                  <FileDown className="h-4 w-4" />
                  Export Call Reports
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">1,234</p>
                <p className="text-xs text-green-600">+12% from last week</p>
              </div>
              <Phone className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leads</p>
                <p className="text-2xl font-bold">856</p>
                <p className="text-xs text-green-600">+8% from last week</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">12.5%</p>
                <p className="text-xs text-red-600">-2% from last week</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Call Duration</p>
                <p className="text-2xl font-bold">4:32</p>
                <p className="text-xs text-green-600">+15% from last week</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Call Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={callVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="calls" fill="#8884d8" name="Total Calls" />
                <Bar dataKey="answered" fill="#82ca9d" name="Answered" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="leads" stroke="#8884d8" name="Total Leads" />
              <Line type="monotone" dataKey="qualified" stroke="#82ca9d" name="Qualified" />
              <Line type="monotone" dataKey="converted" stroke="#ffc658" name="Converted" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsAnalytics;

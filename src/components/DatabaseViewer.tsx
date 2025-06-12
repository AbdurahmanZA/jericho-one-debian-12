
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Database, 
  Download, 
  Search, 
  FileText,
  FileSpreadsheet,
  Calendar,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CallRecord {
  id: number;
  leadName: string;
  phone: string;
  duration: string;
  outcome: string;
  timestamp: string;
  date: string;
  hasRecording: boolean;
  notes: string;
  agent: string;
  callType: 'incoming' | 'outgoing';
}

const DatabaseViewer = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'xlsx'>('csv');

  // Mock data - in real app this would come from a database
  const callRecords: CallRecord[] = [
    {
      id: 1,
      leadName: "Sarah Johnson",
      phone: "+1-555-0456",
      duration: "00:05:32",
      outcome: "Callback Scheduled",
      timestamp: "10:30 AM",
      date: "2024-06-12",
      hasRecording: true,
      notes: "Interested in premium package, callback scheduled for tomorrow",
      agent: "John Parker",
      callType: "outgoing"
    },
    {
      id: 2,
      leadName: "Mike Davis",
      phone: "+1-555-0789",
      duration: "00:03:45",
      outcome: "Not Interested",
      timestamp: "10:15 AM",
      date: "2024-06-12",
      hasRecording: true,
      notes: "Currently satisfied with existing solution",
      agent: "Sarah Wilson",
      callType: "outgoing"
    },
    {
      id: 3,
      leadName: "John Smith",
      phone: "+1-555-0123",
      duration: "5:32",
      timestamp: "10:15 AM",
      date: "2024-06-10",
      hasRecording: false,
      notes: "Follow up call needed",
      agent: "Mike Davis",
      callType: "incoming",
      outcome: "Qualified"
    },
    {
      id: 4,
      leadName: "Tech Support",
      phone: "+1-555-0111",
      duration: "25:15",
      timestamp: "02:10 PM",
      date: "2024-06-09",
      hasRecording: true,
      notes: "Technical support call - resolved issue",
      agent: "John Parker",
      callType: "outgoing",
      outcome: "Resolved"
    }
  ];

  const filteredRecords = callRecords.filter(record =>
    record.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.phone.includes(searchTerm) ||
    record.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.outcome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportData = (format: 'csv' | 'json' | 'xlsx') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'csv':
        const headers = ['ID', 'Lead Name', 'Phone', 'Duration', 'Outcome', 'Date', 'Time', 'Agent', 'Type', 'Notes'];
        const csvData = [
          headers.join(','),
          ...filteredRecords.map(record => [
            record.id,
            `"${record.leadName}"`,
            record.phone,
            record.duration,
            `"${record.outcome}"`,
            record.date,
            record.timestamp,
            `"${record.agent}"`,
            record.callType,
            `"${record.notes}"`
          ].join(','))
        ].join('\n');
        content = csvData;
        filename = `call_records_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
        break;

      case 'json':
        content = JSON.stringify(filteredRecords, null, 2);
        filename = `call_records_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
        break;

      case 'xlsx':
        // For XLSX, we'll create a simple format that can be opened in Excel
        const xlsxHeaders = ['ID\tLead Name\tPhone\tDuration\tOutcome\tDate\tTime\tAgent\tType\tNotes'];
        const xlsxData = [
          xlsxHeaders.join(''),
          ...filteredRecords.map(record => 
            `${record.id}\t${record.leadName}\t${record.phone}\t${record.duration}\t${record.outcome}\t${record.date}\t${record.timestamp}\t${record.agent}\t${record.callType}\t${record.notes}`
          )
        ].join('\n');
        content = xlsxData;
        filename = `call_records_${new Date().toISOString().split('T')[0]}.xlsx`;
        mimeType = 'application/vnd.ms-excel';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Call records exported as ${format.toUpperCase()} format`,
    });
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome.toLowerCase()) {
      case "qualified": return "bg-green-100 text-green-800";
      case "callback scheduled": return "bg-blue-100 text-blue-800";
      case "not interested": return "bg-red-100 text-red-800";
      case "resolved": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Database Viewer
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </Button>
        </div>
      </div>

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button
                variant={selectedFormat === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFormat('csv')}
                className="flex items-center gap-1"
              >
                <FileText className="h-3 w-3" />
                CSV
              </Button>
              <Button
                variant={selectedFormat === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFormat('json')}
                className="flex items-center gap-1"
              >
                <FileText className="h-3 w-3" />
                JSON
              </Button>
              <Button
                variant={selectedFormat === 'xlsx' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFormat('xlsx')}
                className="flex items-center gap-1"
              >
                <FileSpreadsheet className="h-3 w-3" />
                Excel
              </Button>
            </div>
            <Button onClick={() => exportData(selectedFormat)} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export {selectedFormat.toUpperCase()}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search and Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Call Records Database</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Badge variant="outline">
                {filteredRecords.length} records
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.id}</TableCell>
                    <TableCell>{record.leadName}</TableCell>
                    <TableCell>{record.phone}</TableCell>
                    <TableCell>{record.duration}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getOutcomeColor(record.outcome)}`}>
                        {record.outcome}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{record.date}</div>
                        <div className="text-muted-foreground">{record.timestamp}</div>
                      </div>
                    </TableCell>
                    <TableCell>{record.agent}</TableCell>
                    <TableCell>
                      <Badge variant={record.callType === 'incoming' ? 'default' : 'secondary'}>
                        {record.callType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.hasRecording ? (
                        <Badge className="bg-green-100 text-green-800">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm text-muted-foreground">
                        {record.notes}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseViewer;

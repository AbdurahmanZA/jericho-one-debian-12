
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Building,
  Upload,
  Download,
  Filter,
  PhoneCall,
  MessageSquare,
  Calendar,
  AlertCircle,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LeadManagementProps {
  userRole: string;
}

interface Lead {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  status: string;
  priority: string;
  source: string;
  assignedAgent: string;
  lastContact: string;
  notes: string;
}

const LeadManagement = ({ userRole }: LeadManagementProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: 1,
      name: "John Smith",
      company: "Acme Corp",
      phone: "+1-555-0123",
      email: "john@acme.com",
      status: "new",
      priority: "high",
      source: "Website",
      assignedAgent: "Sarah Wilson",
      lastContact: "Never",
      notes: "Interested in enterprise solution"
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
      lastContact: "2024-06-09",
      notes: "Requested callback for pricing"
    },
    {
      id: 3,
      name: "Mike Davis",
      company: "Global Systems",
      phone: "+1-555-0789",
      email: "mike@global.com",
      status: "qualified",
      priority: "high",
      source: "Cold Call",
      assignedAgent: "Sarah Wilson",
      lastContact: "2024-06-08",
      notes: "Ready to move forward, send proposal"
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
      notes: "Inquiry about custom development"
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
      lastContact: "2024-06-10",
      notes: "Needs budget approval from management"
    }
  ]);

  const handleClickToDial = (phone: string, leadName: string, leadId: number) => {
    // Update lead status to show they've been contacted
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: 'contacted', lastContact: new Date().toISOString().split('T')[0] }
          : lead
      )
    );

    toast({
      title: "Call Initiated",
      description: `Initiating call to ${leadName} at ${phone}. Switch to Call Center tab to manage the call.`,
    });

    // In a real application, this would trigger the call center module
    console.log('Initiating call:', { phone, leadName, leadId });
  };

  const handleUpdateLeadStatus = (leadId: number, newStatus: string) => {
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
    
    toast({
      title: "Lead Updated",
      description: `Lead status updated to ${newStatus}`,
    });
  };

  const handleBulkAssign = () => {
    if (selectedLeads.length === 0) {
      toast({
        title: "No Leads Selected",
        description: "Please select leads to assign.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Leads Assigned",
      description: `${selectedLeads.length} leads assigned successfully.`,
    });
    setSelectedLeads([]);
  };

  const addNewLead = () => {
    const newLead: Lead = {
      id: Math.max(...leads.map(l => l.id)) + 1,
      name: "New Lead",
      company: "Company Name",
      phone: "+1-555-0000",
      email: "new@lead.com",
      status: "new",
      priority: "medium",
      source: "Manual Entry",
      assignedAgent: "Current User",
      lastContact: "Never",
      notes: "New lead - needs qualification"
    };

    setLeads(prev => [newLead, ...prev]);
    toast({
      title: "New Lead Added",
      description: "Lead added successfully. You can edit the details.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800";
      case "contacted": return "bg-yellow-100 text-yellow-800";
      case "qualified": return "bg-green-100 text-green-800";
      case "follow-up": return "bg-orange-100 text-orange-800";
      case "converted": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600";
      case "medium": return "text-yellow-600";
      case "low": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lead Management
              <Badge variant="outline">{filteredLeads.length} leads</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={addNewLead} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Lead
              </Button>
              {(userRole === "manager" || userRole === "administrator") && (
                <>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>
                  <Button variant="outline" onClick={handleBulkAssign} className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Bulk Assign
                  </Button>
                </>
              )}
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, company, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {(userRole === "manager" || userRole === "administrator") && (
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeads([...selectedLeads, lead.id]);
                            } else {
                              setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                      )}
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{lead.name}</h3>
                          <Badge className={`text-xs ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </Badge>
                          <AlertCircle className={`h-4 w-4 ${getPriorityColor(lead.priority)}`} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {lead.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </span>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="text-gray-600">Assigned to: </span>
                          <span className="font-medium">{lead.assignedAgent}</span>
                          <span className="text-gray-600 ml-4">Last Contact: </span>
                          <span className="font-medium">{lead.lastContact}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{lead.notes}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleClickToDial(lead.phone, lead.name, lead.id)}
                        className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                      >
                        <PhoneCall className="h-3 w-3" />
                        Call
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleUpdateLeadStatus(lead.id, 'qualified')}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Qualify
                      </Button>
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Notes
                      </Button>
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadManagement;

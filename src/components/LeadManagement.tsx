
import { useState, useEffect } from "react";
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
  Filter,
  PhoneCall,
  MessageSquare,
  Calendar,
  AlertCircle,
  Edit,
  Save,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAMIContext } from "@/contexts/AMIContext";
import { useAuth } from "@/contexts/AuthContext";

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
  const { originateCall, isConnected } = useAMIContext();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [editingLead, setEditingLead] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
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

  // Listen for new leads created from manual calls
  useEffect(() => {
    const handleNewLead = (event: CustomEvent) => {
      const newLead = event.detail;
      const leadEntry: Lead = {
        id: Math.max(...leads.map(l => l.id), 0) + 1,
        name: newLead.name || 'Unknown Contact',
        company: 'Unknown Company',
        phone: newLead.phone,
        email: 'unknown@email.com',
        status: 'contacted',
        priority: 'medium',
        source: 'Manual Call',
        assignedAgent: 'Current User',
        lastContact: new Date().toISOString().split('T')[0],
        notes: newLead.notes || 'Lead created from manual call'
      };
      
      setLeads(prev => [leadEntry, ...prev]);
      toast({
        title: "New Lead Added",
        description: `Lead ${leadEntry.name} created from manual call`,
      });
    };

    window.addEventListener('newLeadCreated', handleNewLead as EventListener);
    return () => window.removeEventListener('newLeadCreated', handleNewLead as EventListener);
  }, [leads, toast]);

  const handleClickToDial = async (phone: string, leadName: string, leadId: number) => {
    if (!user?.extension || !phone) {
      toast({
        title: "Missing Information",
        description: !user?.extension 
          ? "No extension assigned to your user account. Contact administrator."
          : "Phone number is missing for this lead.",
        variant: "destructive"
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "AMI Not Connected",
        description: "Please connect to FreePBX AMI in Integration Settings first.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Initiating call via unified dialer:', {
        channel: `PJSIP/${user.extension}`,
        extension: phone,
        context: 'from-internal'
      });

      const success = await originateCall(
        `PJSIP/${user.extension}`,
        phone,
        'from-internal'
      );

      if (success) {
        // Update lead status to show they've been contacted
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, status: 'contacted', lastContact: new Date().toISOString().split('T')[0] }
              : lead
          )
        );

        // Create lead for unified dialer
        const event = new CustomEvent('newLeadCreated', { 
          detail: {
            name: leadName,
            phone: phone,
            notes: `Lead contacted from Lead Management`
          }
        });
        window.dispatchEvent(event);

        toast({
          title: "Call Initiated",
          description: `Calling ${leadName} at ${phone} from extension ${user.extension}`,
        });

        // Send Discord notification
        if ((window as any).sendDiscordNotification) {
          (window as any).sendDiscordNotification(
            leadName, 
            'called', 
            `Call initiated to ${phone}`
          );
        }
      } else {
        throw new Error('Failed to originate call');
      }
    } catch (error) {
      console.error('Call origination error:', error);
      toast({
        title: "Call Failed",
        description: "Could not initiate call. Check AMI connection and extension configuration.",
        variant: "destructive"
      });
    }
  };

  const handleToggleQualified = (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const newStatus = lead.status === 'qualified' ? 'new' : 'qualified';
    
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
    
    toast({
      title: "Lead Updated",
      description: `Lead status updated to ${newStatus}`,
    });

    // Send Discord notification
    if ((window as any).sendDiscordNotification) {
      (window as any).sendDiscordNotification(
        lead.name, 
        'updated', 
        `Status changed to ${newStatus}`
      );
    }
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead.id);
    setEditForm(lead);
  };

  const handleSaveEdit = () => {
    if (!editingLead || !editForm) return;

    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === editingLead ? { ...lead, ...editForm } : lead
      )
    );

    setEditingLead(null);
    setEditForm({});
    
    toast({
      title: "Lead Updated",
      description: "Lead information has been saved successfully.",
    });
  };

  const handleCancelEdit = () => {
    setEditingLead(null);
    setEditForm({});
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

  const canEditLeads = userRole === "Manager" || userRole === "Administrator";

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

  const downloadLeadsTemplate = () => {
    const template = [
      {
        name: "John Smith",
        company: "Example Corp",
        phone: "+1-555-0123",
        email: "john@example.com",
        status: "new",
        priority: "high",
        source: "Website",
        assignedAgent: "Agent Name",
        notes: "Sample lead entry"
      }
    ];

    const csvContent = [
      "name,company,phone,email,status,priority,source,assignedAgent,notes",
      template.map(lead => 
        `"${lead.name}","${lead.company}","${lead.phone}","${lead.email}","${lead.status}","${lead.priority}","${lead.source}","${lead.assignedAgent}","${lead.notes}"`
      ).join('\n')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "Leads import template has been downloaded successfully.",
    });
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
                  {editingLead === lead.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                          placeholder="Name"
                        />
                        <Input
                          value={editForm.company || ''}
                          onChange={(e) => setEditForm(prev => ({...prev, company: e.target.value}))}
                          placeholder="Company"
                        />
                        <Input
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm(prev => ({...prev, phone: e.target.value}))}
                          placeholder="Phone"
                        />
                        <Input
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm(prev => ({...prev, email: e.target.value}))}
                          placeholder="Email"
                        />
                      </div>
                      <textarea
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm(prev => ({...prev, notes: e.target.value}))}
                        placeholder="Notes"
                        className="w-full p-2 border rounded"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} size="sm">
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button onClick={handleCancelEdit} variant="outline" size="sm">
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
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
                          disabled={!user?.extension || !isConnected}
                          className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                        >
                          <PhoneCall className="h-3 w-3" />
                          Call
                        </Button>
                        {canEditLeads && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEditLead(lead)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleToggleQualified(lead.id)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          {lead.status === 'qualified' ? 'Unqualify' : 'Qualify'}
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
                  )}
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


import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Search, User, Phone } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  phone: string;
  company: string;
  email: string;
}

interface AddCallbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddCallback: (callback: {
    leadName: string;
    leadPhone: string;
    leadCompany: string;
    scheduledDate: Date;
    scheduledTime: string;
    assignedAgent: string;
    notes: string;
    priority: 'high' | 'medium' | 'low';
  }) => void;
  userRole: string;
  selectedDate: Date;
}

const AddCallbackDialog = ({ 
  open, 
  onOpenChange, 
  onAddCallback, 
  userRole,
  selectedDate 
}: AddCallbackDialogProps) => {
  const [entryMode, setEntryMode] = useState<'search' | 'manual'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [date, setDate] = useState<Date>(selectedDate);
  const [time, setTime] = useState('');
  const [assignedAgent, setAssignedAgent] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState('');

  // Manual entry fields
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCompany, setManualCompany] = useState('');

  // Sample leads for search
  const sampleLeads: Lead[] = [
    { id: '1', name: 'John Smith', phone: '+1-555-0123', company: 'Acme Corp', email: 'john@acme.com' },
    { id: '2', name: 'Sarah Johnson', phone: '+1-555-0456', company: 'Tech Solutions', email: 'sarah@tech.com' },
    { id: '3', name: 'Mike Davis', phone: '+1-555-0789', company: 'Global Systems', email: 'mike@global.com' },
    { id: '4', name: 'Emily Brown', phone: '+1-555-0321', company: 'Innovation Labs', email: 'emily@innov.com' }
  ];

  // Sample agents
  const agents = ['John Parker', 'Sarah Wilson', 'Mike Rodriguez', 'Emily Chen'];

  const filteredLeads = sampleLeads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  );

  const timeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
  ];

  const handleSubmit = () => {
    let leadData;
    
    if (entryMode === 'search' && selectedLead) {
      leadData = {
        leadName: selectedLead.name,
        leadPhone: selectedLead.phone,
        leadCompany: selectedLead.company
      };
    } else if (entryMode === 'manual') {
      leadData = {
        leadName: manualName,
        leadPhone: manualPhone,
        leadCompany: manualCompany
      };
    } else {
      return;
    }

    if (!date || !time || !assignedAgent) {
      return;
    }

    onAddCallback({
      ...leadData,
      scheduledDate: date,
      scheduledTime: time,
      assignedAgent,
      notes,
      priority
    });

    // Reset form
    setSearchTerm('');
    setSelectedLead(null);
    setDate(selectedDate);
    setTime('');
    setAssignedAgent('');
    setPriority('medium');
    setNotes('');
    setManualName('');
    setManualPhone('');
    setManualCompany('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Callback</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Entry Mode Selection */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={entryMode === 'search' ? 'default' : 'outline'}
              onClick={() => setEntryMode('search')}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search Existing Lead
            </Button>
            <Button
              variant={entryMode === 'manual' ? 'default' : 'outline'}
              onClick={() => setEntryMode('manual')}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Manual Entry
            </Button>
          </div>

          {/* Lead Selection/Entry */}
          {entryMode === 'search' ? (
            <div className="space-y-4">
              <div>
                <Label>Search for Lead</Label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, company, or phone..."
                  className="mt-1"
                />
              </div>

              {searchTerm && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {filteredLeads.map((lead) => (
                    <Card 
                      key={lead.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedLead?.id === lead.id ? 'ring-2 ring-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{lead.name}</h4>
                            <p className="text-sm text-muted-foreground">{lead.company}</p>
                            <p className="text-sm text-muted-foreground">{lead.phone}</p>
                          </div>
                          {selectedLead?.id === lead.id && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="manual-name">Lead Name *</Label>
                <Input
                  id="manual-name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Enter lead name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="manual-phone">Phone Number *</Label>
                <Input
                  id="manual-phone"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="manual-company">Company</Label>
                <Input
                  id="manual-company"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  placeholder="Enter company name"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Time *</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Agent Assignment and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assigned Agent *</Label>
              <Select value={assignedAgent} onValueChange={setAssignedAgent}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent} value={agent}>
                      {agent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value: 'high' | 'medium' | 'low') => setPriority(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or context for this callback..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={
                !date || 
                !time || 
                !assignedAgent ||
                (entryMode === 'search' && !selectedLead) ||
                (entryMode === 'manual' && (!manualName || !manualPhone))
              }
            >
              Schedule Callback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCallbackDialog;

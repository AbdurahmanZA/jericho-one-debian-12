
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus } from "lucide-react";

interface AddUserFormProps {
  onSave: () => void;
  onCancel: () => void;
}

const AddUserForm = ({ onSave, onCancel }: AddUserFormProps) => {
  const permissions = [
    { id: 'view_leads', label: 'View Leads' },
    { id: 'edit_leads', label: 'Edit Leads' },
    { id: 'make_calls', label: 'Make Calls' },
    { id: 'view_reports', label: 'View Reports' },
    { id: 'manage_users', label: 'Manage Users' },
    { id: 'system_admin', label: 'System Administration' }
  ];

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add New User
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" placeholder="Enter full name" />
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="email@example.com" />
          </div>
          <div>
            <Label htmlFor="extension">Extension Number</Label>
            <Input id="extension" placeholder="1001" />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="administrator">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Enter password" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" placeholder="Confirm password" />
          </div>
        </div>
        
        <div className="mt-6">
          <Label className="text-base font-medium">Permissions</Label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex items-center space-x-2">
                <Checkbox id={permission.id} />
                <Label htmlFor={permission.id} className="text-sm font-normal">
                  {permission.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <Button onClick={onSave}>Create User</Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddUserForm;

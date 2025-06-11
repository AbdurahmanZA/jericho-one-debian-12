
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Download } from "lucide-react";
import UserStats from "./user-management/UserStats";
import UserFilters from "./user-management/UserFilters";
import AddUserForm from "./user-management/AddUserForm";
import UserCard from "./user-management/UserCard";

const UserManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);

  const users = [
    {
      id: 1,
      name: "Admin User",
      email: "admin@company.com",
      role: "Administrator",
      extension: "1000",
      status: "active",
      lastActive: "Today",
      permissions: ["manage_users", "system_admin", "view_reports"]
    },
    {
      id: 2,
      name: "John Manager",
      email: "john@company.com",
      role: "Manager",
      extension: "1001",
      status: "active",
      lastActive: "2 hours ago",
      permissions: ["view_reports", "edit_leads", "make_calls"]
    },
    {
      id: 3,
      name: "Sarah Agent",
      email: "sarah@company.com",
      role: "Agent",
      extension: "1002",
      status: "active",
      lastActive: "5 minutes ago",
      permissions: ["view_leads", "make_calls"]
    },
    {
      id: 4,
      name: "Mike Agent",
      email: "mike@company.com",
      role: "Agent",
      extension: "1003",
      status: "inactive",
      lastActive: "Yesterday",
      permissions: ["view_leads", "make_calls"]
    }
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role.toLowerCase() === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddUser = () => {
    toast({
      title: "User Created",
      description: "New user has been successfully added to the system.",
    });
    setShowAddForm(false);
  };

  const handleEditUser = (user: any) => {
    toast({
      title: "Edit User",
      description: `Editing user: ${user.name}`,
    });
  };

  const handleDeleteUser = (userId: number) => {
    toast({
      title: "User Deleted",
      description: "User has been removed from the system.",
      variant: "destructive"
    });
  };

  const handleResetPassword = (userId: number) => {
    toast({
      title: "Password Reset",
      description: "Password reset email has been sent to the user.",
    });
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const administrators = users.filter(u => u.role === 'Administrator').length;
  const agents = users.filter(u => u.role === 'Agent').length;

  return (
    <div className="space-y-6">
      <UserStats 
        totalUsers={totalUsers}
        activeUsers={activeUsers}
        administrators={administrators}
        agents={agents}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UserFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          {showAddForm && (
            <div className="mb-6">
              <AddUserForm 
                onSave={handleAddUser}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          )}

          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onResetPassword={handleResetPassword}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;


import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Download } from "lucide-react";
import UserStats from "./user-management/UserStats";
import UserFilters from "./user-management/UserFilters";
import AddUserForm from "./user-management/AddUserForm";
import UserCard from "./user-management/UserCard";
import DeleteUserDialog from "./user-management/DeleteUserDialog";
import PasswordResetDialog from "./user-management/PasswordResetDialog";
import { userService, User, CreateUserData } from "@/services/userService";

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null
  });
  const [passwordDialog, setPasswordDialog] = useState<{ isOpen: boolean; user: User | null }>({
    isOpen: false,
    user: null
  });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userData = await userService.getAllUsers();
      setUsers(userData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role.toLowerCase() === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddUser = async (userData: CreateUserData) => {
    try {
      await userService.createUser(userData);
      await loadUsers();
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setShowAddForm(false);
      setEditingUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowAddForm(true);
  };

  const handleUpdateUser = async (userData: CreateUserData) => {
    if (!editingUser) return;
    
    try {
      await userService.updateUser(editingUser.id, userData);
      await loadUsers();
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setShowAddForm(false);
      setEditingUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog.user) return;
    
    try {
      await userService.deleteUser(deleteDialog.user.id);
      await loadUsers();
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setDeleteDialog({ isOpen: false, user: null });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!passwordDialog.user) return;
    
    try {
      await userService.resetPassword(passwordDialog.user.id, newPassword);
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setPasswordDialog({ isOpen: false, user: null });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive"
      });
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Extension', 'Status', 'Last Active'].join(','),
      ...filteredUsers.map(user => 
        [user.name, user.email, user.role, user.extension, user.status, user.lastActive].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Users exported successfully",
    });
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    administrators: users.filter(u => u.role === 'Administrator').length,
    agents: users.filter(u => u.role === 'Agent').length
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <UserStats 
        totalUsers={stats.totalUsers}
        activeUsers={stats.activeUsers}
        administrators={stats.administrators}
        agents={stats.agents}
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
                onClick={() => {
                  setEditingUser(null);
                  setShowAddForm(!showAddForm);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={exportUsers}
              >
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
                onSave={editingUser ? handleUpdateUser : handleAddUser}
                onCancel={() => {
                  setShowAddForm(false);
                  setEditingUser(null);
                }}
                editingUser={editingUser}
              />
            </div>
          )}

          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                  ? "No users match your filters" 
                  : "No users found"
                }
              </div>
            ) : (
              filteredUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onEdit={handleEditUser}
                  onDelete={(userId) => {
                    const user = users.find(u => u.id === userId);
                    if (user) setDeleteDialog({ isOpen: true, user });
                  }}
                  onResetPassword={(userId) => {
                    const user = users.find(u => u.id === userId);
                    if (user) setPasswordDialog({ isOpen: true, user });
                  }}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <DeleteUserDialog
        isOpen={deleteDialog.isOpen}
        onOpenChange={(open) => setDeleteDialog({ isOpen: open, user: null })}
        onConfirm={handleDeleteUser}
        userName={deleteDialog.user?.name || ""}
      />

      <PasswordResetDialog
        isOpen={passwordDialog.isOpen}
        onOpenChange={(open) => setPasswordDialog({ isOpen: open, user: null })}
        onConfirm={handleResetPassword}
        userName={passwordDialog.user?.name || ""}
      />
    </div>
  );
};

export default UserManagement;


import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  UserCheck,
  Phone,
  Mail,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UserManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const users = [
    {
      id: 1,
      name: "Sarah Wilson",
      email: "sarah@company.com",
      role: "agent",
      extension: "201",
      status: "active",
      lastLogin: "2024-06-10 09:30",
      callsMade: 45,
      leadsAssigned: 23
    },
    {
      id: 2,
      name: "Mike Davis",
      email: "mike@company.com",
      role: "agent",
      extension: "202",
      status: "active",
      lastLogin: "2024-06-10 08:45",
      callsMade: 38,
      leadsAssigned: 19
    },
    {
      id: 3,
      name: "John Parker",
      email: "john@company.com",
      role: "manager",
      extension: "301",
      status: "active",
      lastLogin: "2024-06-10 07:30",
      callsMade: 12,
      leadsAssigned: 0
    },
    {
      id: 4,
      name: "Lisa Chen",
      email: "lisa@company.com",
      role: "administrator",
      extension: "401",
      status: "active",
      lastLogin: "2024-06-09 18:20",
      callsMade: 0,
      leadsAssigned: 0
    }
  ];

  const handleAddUser = () => {
    toast({
      title: "Add New User",
      description: "User creation form would open here.",
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "administrator": return "bg-red-100 text-red-800";
      case "manager": return "bg-blue-100 text-blue-800";
      case "agent": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              User Management
              <Badge variant="outline">{filteredUsers.length} users</Badge>
            </CardTitle>
            <Button onClick={handleAddUser} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Extension</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Performance</th>
                  <th className="text-left p-3">Last Login</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-gray-500" />
                        {user.extension}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-xs ${getStatusColor(user.status)}`}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>Calls: {user.callsMade}</div>
                        <div>Leads: {user.leadsAssigned}</div>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {user.lastLogin}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Administrators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">1</div>
            <p className="text-sm text-gray-600">System administrators</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Managers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">1</div>
            <p className="text-sm text-gray-600">Team managers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">2</div>
            <p className="text-sm text-gray-600">Active call agents</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;

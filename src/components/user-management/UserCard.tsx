
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Edit,
  Trash2,
  Shield,
  Lock
} from "lucide-react";

interface UserCardProps {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    extension: string;
    status: string;
    lastActive: string;
    permissions: string[];
  };
  onEdit: (user: any) => void;
  onDelete: (userId: number) => void;
  onResetPassword: (userId: number) => void;
}

const UserCard = ({ user, onEdit, onDelete, onResetPassword }: UserCardProps) => {
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'administrator':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'agent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{user.name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Ext. {user.extension}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {user.lastActive}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge className={getRoleColor(user.role)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role}
                </Badge>
                <Badge className={getStatusColor(user.status)}>
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onResetPassword(user.id)}>
              <Lock className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => onDelete(user.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;

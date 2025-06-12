
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UserCheck } from 'lucide-react';

const RoleSwitcher = () => {
  const { user, switchRole, canSwitchRoles, availableRoles } = useAuth();
  const { toast } = useToast();

  if (!canSwitchRoles || !user) {
    return null;
  }

  const handleRoleChange = (newRole: string) => {
    switchRole(newRole);
    toast({
      title: "Role Switched",
      description: `You are now viewing as: ${newRole}`,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <UserCheck className="h-4 w-4 text-muted-foreground" />
      <Select value={user.role} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RoleSwitcher;


import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User } from 'lucide-react';
import RoleSwitcher from '@/components/auth/RoleSwitcher';

const Header = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">JERICHO ONE</h1>
          <p className="text-sm text-muted-foreground">Professional CRM Platform</p>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <RoleSwitcher />
            
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <div className="text-right">
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.role}
                  {user.originalRole !== user.role && (
                    <span className="text-primary"> (as {user.role})</span>
                  )}
                </p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;


import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  originalRole: string; // Track the original role for permissions
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (newRole: string) => void;
  canSwitchRoles: boolean;
  availableRoles: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user database
const USERS = [
  {
    id: '1',
    email: 'admin@abdurahman.co.za',
    password: 'M@rwan1395',
    name: 'Admin User',
    role: 'Administrator'
  },
  {
    id: '2',
    email: 'manager@abdurahman.co.za',
    password: 'manager123',
    name: 'Manager User',
    role: 'Manager'
  },
  {
    id: '3',
    email: 'agent@abdurahman.co.za',
    password: 'agent123',
    name: 'Agent User',
    role: 'Agent'
  }
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    const savedUser = localStorage.getItem('crm_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('crm_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = USERS.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const userSession = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        role: foundUser.role,
        originalRole: foundUser.role
      };
      
      setUser(userSession);
      localStorage.setItem('crm_user', JSON.stringify(userSession));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('crm_user');
  };

  const switchRole = (newRole: string) => {
    if (!user || !canSwitchRoles) return;
    
    const updatedUser = { ...user, role: newRole };
    setUser(updatedUser);
    localStorage.setItem('crm_user', JSON.stringify(updatedUser));
  };

  // Determine if user can switch roles and what roles are available
  const canSwitchRoles = user ? user.originalRole === 'Administrator' || user.originalRole === 'Manager' : false;
  
  const getAvailableRoles = () => {
    if (!user) return [];
    
    if (user.originalRole === 'Administrator') {
      return ['Administrator', 'Manager', 'Agent'];
    } else if (user.originalRole === 'Manager') {
      return ['Manager', 'Agent'];
    }
    
    return [user.originalRole];
  };

  const value = {
    user,
    login,
    logout,
    switchRole,
    canSwitchRoles,
    availableRoles: getAvailableRoles(),
    isAuthenticated: !!user,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

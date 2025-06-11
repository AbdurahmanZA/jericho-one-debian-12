
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  extension: string;
  status: 'active' | 'inactive';
  lastActive: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: string;
  extension: string;
  password: string;
  permissions: string[];
}

export interface UpdateUserData extends Partial<CreateUserData> {
  status?: 'active' | 'inactive';
}

class UserService {
  private users: User[] = [
    {
      id: 1,
      name: "Admin User",
      email: "admin@company.com",
      role: "Administrator",
      extension: "1000",
      status: "active",
      lastActive: "Today",
      permissions: ["manage_users", "system_admin", "view_reports"],
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01"
    },
    {
      id: 2,
      name: "John Manager",
      email: "john@company.com",
      role: "Manager",
      extension: "1001",
      status: "active",
      lastActive: "2 hours ago",
      permissions: ["view_reports", "edit_leads", "make_calls"],
      createdAt: "2024-01-02",
      updatedAt: "2024-01-02"
    },
    {
      id: 3,
      name: "Sarah Agent",
      email: "sarah@company.com",
      role: "Agent",
      extension: "1002",
      status: "active",
      lastActive: "5 minutes ago",
      permissions: ["view_leads", "make_calls"],
      createdAt: "2024-01-03",
      updatedAt: "2024-01-03"
    },
    {
      id: 4,
      name: "Mike Agent",
      email: "mike@company.com",
      role: "Agent",
      extension: "1003",
      status: "inactive",
      lastActive: "Yesterday",
      permissions: ["view_leads", "make_calls"],
      createdAt: "2024-01-04",
      updatedAt: "2024-01-04"
    }
  ];

  private nextId = 5;

  async getAllUsers(): Promise<User[]> {
    return [...this.users];
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const newUser: User = {
      id: this.nextId++,
      ...userData,
      role: userData.role.charAt(0).toUpperCase() + userData.role.slice(1),
      status: 'active',
      lastActive: 'Just created',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: number, userData: UpdateUserData): Promise<User | null> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    const updatedUser = {
      ...this.users[userIndex],
      ...userData,
      role: userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : this.users[userIndex].role,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    this.users[userIndex] = updatedUser;
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return false;

    this.users.splice(userIndex, 1);
    return true;
  }

  async resetPassword(id: number, newPassword: string): Promise<boolean> {
    const user = this.users.find(user => user.id === id);
    if (!user) return false;

    // In a real implementation, you would hash the password
    console.log(`Password reset for user ${user.name}: ${newPassword}`);
    user.updatedAt = new Date().toISOString().split('T')[0];
    return true;
  }

  async toggleUserStatus(id: number): Promise<User | null> {
    const user = this.users.find(user => user.id === id);
    if (!user) return null;

    user.status = user.status === 'active' ? 'inactive' : 'active';
    user.updatedAt = new Date().toISOString().split('T')[0];
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.users.filter(user => user.role.toLowerCase() === role.toLowerCase());
  }

  async getUserStats() {
    return {
      total: this.users.length,
      active: this.users.filter(u => u.status === 'active').length,
      inactive: this.users.filter(u => u.status === 'inactive').length,
      administrators: this.users.filter(u => u.role === 'Administrator').length,
      managers: this.users.filter(u => u.role === 'Manager').length,
      agents: this.users.filter(u => u.role === 'Agent').length
    };
  }
}

export const userService = new UserService();

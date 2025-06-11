
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, UserCheck, UserX } from "lucide-react";

interface UserStatsProps {
  totalUsers: number;
  activeUsers: number;
  administrators: number;
  agents: number;
}

const UserStats = ({ totalUsers, activeUsers, administrators, agents }: UserStatsProps) => {
  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Users",
      value: activeUsers,
      icon: UserCheck,
      color: "text-green-600"
    },
    {
      title: "Administrators",
      value: administrators,
      icon: Shield,
      color: "text-red-600"
    },
    {
      title: "Agents",
      value: agents,
      icon: UserX,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default UserStats;

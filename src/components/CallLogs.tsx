
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Clock, 
  User,
  Search,
  Download
} from "lucide-react";
import { useState } from "react";

const CallLogs = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const callLogs = [
    {
      id: 1,
      type: "incoming",
      contact: "John Smith",
      number: "+1-555-0123",
      duration: "5:32",
      time: "10:15 AM",
      date: "2024-06-10",
      status: "answered"
    },
    {
      id: 2,
      type: "outgoing",
      contact: "Sarah Johnson",
      number: "+1-555-0456",
      duration: "12:45",
      time: "09:30 AM",
      date: "2024-06-10",
      status: "answered"
    },
    {
      id: 3,
      type: "missed",
      contact: "Unknown",
      number: "+1-555-0999",
      duration: "0:00",
      time: "08:45 AM",
      date: "2024-06-10",
      status: "missed"
    },
    {
      id: 4,
      type: "incoming",
      contact: "Mike Davis",
      number: "+1-555-0789",
      duration: "3:21",
      time: "04:20 PM",
      date: "2024-06-09",
      status: "answered"
    },
    {
      id: 5,
      type: "outgoing",
      contact: "Tech Support",
      number: "+1-555-0111",
      duration: "25:15",
      time: "02:10 PM",
      date: "2024-06-09",
      status: "answered"
    }
  ];

  const getCallIcon = (type: string, status: string) => {
    if (status === "missed") return PhoneMissed;
    if (type === "incoming") return PhoneIncoming;
    return PhoneOutgoing;
  };

  const getCallColor = (type: string, status: string) => {
    if (status === "missed") return "text-red-500";
    if (type === "incoming") return "text-green-500";
    return "text-blue-500";
  };

  const filteredLogs = callLogs.filter(log =>
    log.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.number.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Logs & History
            </CardTitle>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search call logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <PhoneIncoming className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">127</div>
                <div className="text-sm text-green-700">Incoming Calls</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 text-center">
                <PhoneOutgoing className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">89</div>
                <div className="text-sm text-blue-700">Outgoing Calls</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <PhoneMissed className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">12</div>
                <div className="text-sm text-red-700">Missed Calls</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-600">2.5h</div>
                <div className="text-sm text-gray-700">Total Duration</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const CallIcon = getCallIcon(log.type, log.status);
              const callColor = getCallColor(log.type, log.status);

              return (
                <Card key={log.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full bg-gray-100 ${callColor}`}>
                          <CallIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{log.contact}</h3>
                            {log.contact === "Unknown" && (
                              <Badge variant="outline" className="text-xs">
                                Unknown
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{log.number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-sm font-medium">{log.time}</p>
                            <p className="text-xs text-muted-foreground">{log.date}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{log.duration}</p>
                            <Badge 
                              variant={log.status === "answered" ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {log.status}
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline">
                            <Phone className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallLogs;

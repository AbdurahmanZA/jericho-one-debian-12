
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserPlus, RefreshCw, Phone, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { CreateUserData } from "@/services/userService";
import { amiBridgeClient } from "@/services/amiBridgeClient";
import { useAMIContext } from "@/contexts/AMIContext";

interface PJSIPPeer {
  objectName: string;
  endpoint: string;
  status: string;
  contact?: string;
}

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  extension: z.string().min(3, "Extension must be at least 3 characters"),
  role: z.enum(["agent", "manager", "administrator"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  permissions: z.array(z.string())
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface AddUserFormProps {
  onSave: (userData: CreateUserData) => void;
  onCancel: () => void;
  editingUser?: any;
}

const AddUserForm = ({ onSave, onCancel, editingUser }: AddUserFormProps) => {
  const { toast } = useToast();
  const { isConnected } = useAMIContext();
  const [extensions, setExtensions] = useState<PJSIPPeer[]>([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);

  const permissions = [
    { id: 'view_leads', label: 'View Leads' },
    { id: 'edit_leads', label: 'Edit Leads' },
    { id: 'make_calls', label: 'Make Calls' },
    { id: 'view_reports', label: 'View Reports' },
    { id: 'manage_users', label: 'Manage Users' },
    { id: 'system_admin', label: 'System Administration' }
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editingUser?.name || "",
      email: editingUser?.email || "",
      extension: editingUser?.extension || "",
      role: editingUser?.role?.toLowerCase() || "agent",
      password: "",
      confirmPassword: "",
      permissions: editingUser?.permissions || []
    }
  });

  const fetchExtensions = async () => {
    if (!isConnected) {
      toast({
        title: "AMI Not Connected",
        description: "Connect to AMI Bridge first to fetch extensions",
        variant: "destructive"
      });
      return;
    }

    setLoadingExtensions(true);
    try {
      const endpoints = await amiBridgeClient.getPJSIPEndpoints();
      setExtensions(endpoints);
      
      if (endpoints.length === 0) {
        toast({
          title: "No Extensions Found",
          description: "No PJSIP endpoints found. Check FreePBX configuration.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to fetch extensions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch PJSIP extensions",
        variant: "destructive"
      });
    } finally {
      setLoadingExtensions(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchExtensions();
    }
  }, [isConnected]);

  const getStatusBadge = (status: string) => {
    const isOnline = status.toLowerCase().includes('not_inuse') || status.toLowerCase().includes('inuse');
    return (
      <Badge 
        variant={isOnline ? "default" : "secondary"}
        className={`ml-2 ${isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
      >
        {isOnline ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
    );
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Transform the form data to match CreateUserData interface
    const userData: CreateUserData = {
      name: values.name,
      email: values.email,
      extension: values.extension,
      role: values.role,
      password: values.password,
      permissions: values.permissions
    };
    onSave(userData);
    form.reset();
  };

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          {editingUser ? "Edit User" : "Add New User"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="extension"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PJSIP Extension</FormLabel>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={field.onChange} value={field.value} disabled={!isConnected}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isConnected ? "Select PJSIP extension" : "AMI not connected"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {extensions.length === 0 && isConnected ? (
                            <SelectItem value="no-extensions" disabled>
                              No extensions found
                            </SelectItem>
                          ) : (
                            extensions.map((ext) => (
                              <SelectItem key={ext.endpoint} value={ext.endpoint}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-2" />
                                    <span>PJSIP/{ext.endpoint}</span>
                                  </div>
                                  {getStatusBadge(ext.status)}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchExtensions}
                        disabled={loadingExtensions || !isConnected}
                        className="h-10 px-3"
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingExtensions ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    {!isConnected && (
                      <p className="text-xs text-muted-foreground">
                        Connect to AMI Bridge to load available PJSIP extensions
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="administrator">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Permissions</FormLabel>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {permissions.map((permission) => (
                      <FormField
                        key={permission.id}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={permission.id}
                              className="flex flex-row items-center space-x-2 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(permission.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, permission.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== permission.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {permission.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex gap-2 mt-6">
              <Button type="submit">
                {editingUser ? "Update User" : "Create User"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AddUserForm;

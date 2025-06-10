
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Database,
  Phone,
  Wifi
} from "lucide-react";

interface ConnectionTestProps {
  onTestComplete: (results: { freepbx: boolean; database: boolean }) => void;
}

const ConnectionTest = ({ onTestComplete }: ConnectionTestProps) => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    freepbx: boolean | null;
    database: boolean | null;
  }>({
    freepbx: null,
    database: null
  });

  const runTests = async () => {
    setTesting(true);
    setResults({ freepbx: null, database: null });

    try {
      // Test FreePBX connection
      const freepbxResult = await testFreePBX();
      setResults(prev => ({ ...prev, freepbx: freepbxResult }));

      // Test Database connection
      const dbResult = await testDatabase();
      setResults(prev => ({ ...prev, database: dbResult }));

      onTestComplete({ freepbx: freepbxResult, database: dbResult });
    } finally {
      setTesting(false);
    }
  };

  const testFreePBX = async (): Promise<boolean> => {
    try {
      // In production, this would test actual FreePBX connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      return Math.random() > 0.3; // 70% success rate for demo
    } catch {
      return false;
    }
  };

  const testDatabase = async (): Promise<boolean> => {
    try {
      // In production, this would test actual database connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      return Math.random() > 0.2; // 80% success rate for demo
    } catch {
      return false;
    }
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null && !testing) return <Wifi className="h-4 w-4 text-gray-400" />;
    if (status === null && testing) return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    if (status === true) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (status: boolean | null, label: string) => {
    if (status === null && !testing) {
      return <Badge variant="outline">Not Tested</Badge>;
    }
    if (status === null && testing) {
      return <Badge className="bg-blue-100 text-blue-800">Testing...</Badge>;
    }
    if (status === true) {
      return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Connection Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">FreePBX</p>
                <p className="text-sm text-gray-600">PBX Server Connection</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.freepbx)}
              {getStatusBadge(results.freepbx, "FreePBX")}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium">Database</p>
                <p className="text-sm text-gray-600">CRM Database Connection</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(results.database)}
              {getStatusBadge(results.database, "Database")}
            </div>
          </div>
        </div>

        {(results.freepbx === false || results.database === false) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Some connections failed. Please check your configuration settings and try again.
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing Connections...
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 mr-2" />
              Test All Connections
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConnectionTest;

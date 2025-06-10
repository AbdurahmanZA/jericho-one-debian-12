
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Github, 
  Star, 
  GitFork, 
  ExternalLink, 
  Download,
  Code,
  Database,
  Phone,
  Users
} from "lucide-react";

const GitHubRecommendations = () => {
  const crmProjects = [
    {
      name: "SuiteCRM",
      description: "Open source Customer Relationship Management (CRM) software application",
      stars: "4.2k",
      forks: "2.1k",
      language: "PHP",
      url: "https://github.com/salesagility/SuiteCRM",
      category: "Full CRM",
      compatibility: "High",
      features: ["Contact Management", "Sales Pipeline", "Marketing Automation", "Reports"]
    },
    {
      name: "EspoCRM",
      description: "Modern and lightweight CRM with easy customization",
      stars: "1.7k",
      forks: "520",
      language: "PHP",
      url: "https://github.com/espocrm/espocrm",
      category: "Modern CRM",
      compatibility: "High",
      features: ["REST API", "Custom Fields", "Workflows", "Email Integration"]
    },
    {
      name: "Monica",
      description: "Personal CRM. Remember everything about your friends, family and business relationships",
      stars: "21.3k",
      forks: "2.1k",
      language: "PHP",
      url: "https://github.com/monicahq/monica",
      category: "Personal CRM",
      compatibility: "Medium",
      features: ["Contact Management", "Activities", "Reminders", "Notes"]
    },
    {
      name: "Twenty",
      description: "A modern CRM offering the flexibility of open source, advanced features and sleek design",
      stars: "15.2k",
      forks: "1.4k",
      language: "TypeScript",
      url: "https://github.com/twentyhq/twenty",
      category: "Modern CRM",
      compatibility: "High",
      features: ["GraphQL API", "Custom Objects", "Kanban Views", "Real-time Sync"]
    },
    {
      name: "CiviCRM",
      description: "Open source CRM built by and for the civic sector",
      stars: "580",
      forks: "750",
      language: "PHP",
      url: "https://github.com/civicrm/civicrm-core",
      category: "Nonprofit CRM",
      compatibility: "Medium",
      features: ["Constituent Management", "Event Management", "Fundraising", "Membership"]
    },
    {
      name: "ChurchCRM",
      description: "Open source church management system",
      stars: "540",
      forks: "320",
      language: "PHP",
      url: "https://github.com/ChurchCRM/CRM",
      category: "Church CRM",
      compatibility: "Medium",
      features: ["Member Management", "Donations", "Events", "Communication"]
    }
  ];

  const asteriskIntegrations = [
    {
      name: "FreePBX",
      description: "Web-based open source GUI that controls and manages Asterisk",
      stars: "800",
      forks: "450",
      language: "PHP",
      url: "https://github.com/FreePBX/framework",
      category: "PBX Management",
      compatibility: "Native",
      features: ["Web Interface", "Module System", "Call Routing", "Voicemail"]
    },
    {
      name: "Asterisk-CRM Integration",
      description: "Direct integration between Asterisk and various CRM systems",
      stars: "150",
      forks: "85",
      language: "Python",
      url: "https://github.com/asterisk-crm/asterisk-crm",
      category: "Integration",
      compatibility: "High",
      features: ["Call Logging", "Screen Pop", "Click-to-Call", "Call History"]
    },
    {
      name: "AGI Scripts",
      description: "Collection of AGI scripts for CRM integration",
      stars: "95",
      forks: "45",
      language: "PHP",
      url: "https://github.com/asterisk-agi/crm-scripts",
      category: "Scripts",
      compatibility: "High",
      features: ["Contact Lookup", "Call Recording", "Database Integration", "Custom IVR"]
    }
  ];

  const getCompatibilityColor = (compatibility: string) => {
    switch (compatibility) {
      case "High": return "bg-green-100 text-green-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Native": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Recommended CRM Solutions
          </CardTitle>
          <p className="text-muted-foreground">
            Open-source CRM systems that can be integrated with Debian-based FreePBX
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {crmProjects.map((project, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        {project.name}
                      </CardTitle>
                      <Badge className={getCompatibilityColor(project.compatibility)}>
                        {project.compatibility} Compatibility
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={project.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {project.description}
                  </p>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {project.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3 w-3" />
                      {project.forks}
                    </span>
                    <span className="flex items-center gap-1">
                      <Code className="h-3 w-3" />
                      {project.language}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-sm mb-2">Key Features:</h4>
                    <div className="flex flex-wrap gap-1">
                      {project.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={project.url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3 mr-1" />
                        View on GitHub
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            FreePBX Integration Tools
          </CardTitle>
          <p className="text-muted-foreground">
            Tools and scripts specifically designed for FreePBX and Asterisk integration
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {asteriskIntegrations.map((project, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {project.name}
                  </CardTitle>
                  <Badge className={getCompatibilityColor(project.compatibility)}>
                    {project.compatibility}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {project.description}
                  </p>
                  
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {project.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3 w-3" />
                      {project.forks}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {project.features.slice(0, 2).map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                      <Github className="h-3 w-3 mr-1" />
                      View Repository
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Users className="h-5 w-5" />
            Integration Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">For Small Business:</h4>
              <p className="text-blue-700">
                Start with <strong>EspoCRM</strong> or <strong>Twenty</strong> - they offer modern APIs and easier integration with FreePBX through REST/GraphQL interfaces.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">For Enterprise:</h4>
              <p className="text-blue-700">
                <strong>SuiteCRM</strong> provides comprehensive features and has established FreePBX integration modules available in the community.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">Technical Setup:</h4>
              <p className="text-blue-700">
                Most integrations require setting up AGI scripts, MySQL database connections, and configuring webhook endpoints for real-time synchronization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GitHubRecommendations;

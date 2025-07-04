import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { Shield, BarChart3, TestTube, Users, Settings, LogOut, Plus } from "lucide-react";
import DashboardOverview from "@/components/dashboard-overview";
import ExperimentsList from "@/components/experiments-list";
import ExperimentWizard from "@/components/experiment-wizard";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

export default function Console() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showCreateExperiment, setShowCreateExperiment] = useState(false);

  const { data: authData, isLoading: isLoadingAuth } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!user && !!user.id,
  });

  const currentProject = authData?.projects?.[0];

  useEffect(() => {
    if (!user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user || isLoadingAuth || !currentProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your console...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar */}
        <Sidebar className="w-64 bg-sidebar border-r border-sidebar-border">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">Xgaming Nova</span>
            </div>
          </SidebarHeader>

          <SidebarContent className="flex-1 p-4 space-y-2">
            <Button
              variant={activeSection === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveSection("dashboard")}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              Dashboard
            </Button>
            <Button
              variant={activeSection === "experiments" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveSection("experiments")}
            >
              <TestTube className="w-5 h-5 mr-3" />
              Experiments
            </Button>
            <Button
              variant={activeSection === "analytics" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveSection("analytics")}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              Analytics
            </Button>
            <Button
              variant={activeSection === "team" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveSection("team")}
            >
              <Users className="w-5 h-5 mr-3" />
              Team
            </Button>
            <Button
              variant={activeSection === "settings" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveSection("settings")}
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Button>
          </SidebarContent>

          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-sidebar-primary-foreground">
                  {user.name?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-sidebar-foreground">
                  {user.name || "Product Manager"}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-card border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-card-foreground">
                  {activeSection === "dashboard" && "Dashboard"}
                  {activeSection === "experiments" && "Experiments"}
                  {activeSection === "analytics" && "Analytics"}
                  {activeSection === "team" && "Team"}
                  {activeSection === "settings" && "Settings"}
                </h1>
                <p className="text-muted-foreground">
                  {activeSection === "dashboard" && "Overview of your FTUE experiments"}
                  {activeSection === "experiments" && "Manage your FTUE A/B tests"}
                  {activeSection === "analytics" && "Detailed analytics and insights"}
                  {activeSection === "team" && "Manage team members and permissions"}
                  {activeSection === "settings" && "Configure your project settings"}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setShowCreateExperiment(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Experiment
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto">
            {activeSection === "dashboard" && <DashboardOverview projectId={currentProject.id} />}
            {activeSection === "experiments" && <ExperimentsList projectId={currentProject.id} />}
            {activeSection === "analytics" && (
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Analytics view coming soon...</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {activeSection === "team" && (
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Team management view coming soon...</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {activeSection === "settings" && (
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Settings view coming soon...</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>

      <ExperimentWizard
        open={showCreateExperiment}
        onClose={() => setShowCreateExperiment(false)}
        projectId={currentProject.id}
      />
    </SidebarProvider>
  );
}

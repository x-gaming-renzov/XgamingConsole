import { ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { Shield, Target, Layers, UserCheck, Users, Lightbulb, Settings, LogOut, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

interface ConsoleLayoutProps {
  children: ReactNode;
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Shield,
      path: "/dashboard",
      description: "Overview and metrics"
    },
    {
      id: "experiences",
      label: "Experiences",
      icon: Target,
      path: "/experiences",
      description: "FTUE experiences"
    },
    {
      id: "objects",
      label: "Objects",
      icon: Layers,
      path: "/objects",
      description: "Flagged game elements"
    },
    {
      id: "segments",
      label: "Segments",
      icon: Users,
      path: "/segments",
      description: "Player segments"
    },
    {
      id: "campaigns",
      label: "Campaigns",
      icon: UserCheck,
      path: "/campaigns",
      description: "Marketing campaigns"
    },

  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Xgaming Nova</h2>
                <p className="text-xs text-muted-foreground">FTUE Console</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <div className="space-y-6">
              {/* Primary Navigation */}
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <Link key={item.id} href={item.path}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className={`w-full justify-start h-auto p-3 ${
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs opacity-75">{item.description}</span>
                        </div>
                      </Button>
                    </Link>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-3 px-3">QUICK ACTIONS</p>
                <Link href="/experiences/new">
                  <Button className="w-full justify-start mb-2">
                    <Plus className="w-4 h-4 mr-3" />
                    New Experience
                  </Button>
                </Link>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-border space-y-2">
                <Link href="/settings">
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="h-16 border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-foreground">
                {user?.name ? `Welcome back, ${user.name}` : "Console"}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className="text-sm text-muted-foreground">
                {user?.email}
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
import { ReactNode, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Target, Layers, UserCheck, Users, Lightbulb, Settings, LogOut, Plus, ChevronDown, Sparkles, Gamepad2, ChartNoAxesColumn, Zap, Wand2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";

interface ConsoleLayoutProps {
  children: ReactNode;
}

export default function ConsoleLayout({ children }: ConsoleLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [selectedProject, setSelectedProject] = useState("project-1");

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  // Mock projects - in real app, this would come from API
  const projects = [
    { id: "project-1", name: "Mobile RPG", description: "Main game project" },
    { id: "project-2", name: "Puzzle Quest", description: "Casual puzzle game" },
    { id: "project-3", name: "Racing Elite", description: "Racing game project" }
  ];

  const navigationItems = [
    // {
    //   id: "dashboard",
    //   label: "Dashboard",
    //   icon: Shield,
    //   path: "/dashboard",
    //   description: "Overview and metrics"
    // },
    {
      id: "personalisations",
      label: "Personalisations",
      icon: Sparkles,
      path: "/personalisations",
      description: "Personalised Experiences"
    },
    {
      id: "segments",
      label: "Segments",
      icon: Users,
      path: "/segments",
      description: "Player segments"
    },
     // {
    //   id: "campaigns",
    //   label: "Campaigns",
    //   icon: UserCheck,
    //   path: "/campaigns",
    //   description: "Marketing campaigns"
    // },
    {
      id: "metrics",
      label: "Metrics",
      icon: ChartNoAxesColumn,
      path: "/metrics",
      description: "Analytics and KPIs"
    },
    {
      id: "divider-1",
      type: "divider",
    },
    {
      id: "experiences",
      label: "Experiences",
      icon: Gamepad2,
      path: "/experiences",
      description: "In Game experiences"
    },
    {
      id: "objects",
      label: "Objects",
      icon: Layers,
      path: "/objects",
      description: "Flagged game elements"
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 pt-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-foreground">Xgaming Nova</h2>
                {/* <p className="text-xs text-muted-foreground">Personalize Experiences</p> */}
              </div>
            </div>
            
            {/* Project Selector */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">PROJECT</p>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-muted-foreground">{project.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SidebarHeader>
          
          <div className="px-4 mb-2">
            <Link href="/create-personalisation">
              <Button className="w-full h-[58px] bg-gradient-to-r from-primary via-blue-500 to-purple-500 hover:from-primary/90 hover:via-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                <Wand2 className="w-4 h-4 text-white mr-3" />
                <div className="flex flex-col items-start flex-1 z-10">
                  <span className="font-semibold text-[15px]">Create Magic</span>
                  <span className="text-[13px] opacity-90">Build personalisation</span>
                </div>
              </Button>
            </Link>
          </div>

          <SidebarContent className="p-4 pl-0 flex flex-col h-full">
            <div className="flex-1">
              {/* Prominent CTA Button */}
              {/* Primary Navigation */}
              <div>
                {navigationItems.map((item) => {
                  if (item.type === "divider") {
                    return <div key={item.id} className="h-px border-t border-border my-4 ml-4" />;
                  }
                  
                  if (!item.path) return null;
                  
                  const Icon = item.icon;
                  const isActive = location.startsWith(item.path);

                  return (
                    <Link key={item.id} href={item.path}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start h-auto p-3 pl-6 mb-1 transition-all duration-200 relative rounded-l-none hover:text-current ${
                          isActive 
                            ? "bg-green-500/10 hover:bg-green-500/10 text-green-400" 
                            : "text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center transition-colors ${
                          isActive 
                            ? "bg-green-500 text-white" 
                            : "bg-muted/50 text-muted-foreground"
                        }`}>
                          {Icon && <Icon className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col items-start">
                          <span className={`font-medium text-sm ${
                            isActive ? "text-green-400" : ""
                          }`}>{item.label}</span>
                          <span className={`text-xs opacity-75 ${
                            isActive ? "text-green-400/70" : ""
                          }`}>{item.description}</span>
                        </div>
                      </Button>
                    </Link>
                  );
                })}
              </div>

              {/* Quick Actions */}
              {/* <div className="pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-3 px-3">QUICK ACTIONS</p>
                <Button 
                  className="w-full justify-start mb-2"
                  onClick={onQuickExperience || (() => {})}
                >
                  <Plus className="w-4 h-4 mr-3" />
                  Quick Experience
                </Button>
              </div> */}
            </div>

            {/* Bottom Actions - Positioned at bottom */}
            <div className="pt-4 border-t border-border space-y-2 mt-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/personal-settings">
                    <DropdownMenuItem>
                      Personal Settings
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/project-settings">
                    <DropdownMenuItem>
                      Project Settings
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-muted-foreground hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-primary/5 to-blue-50/50 dark:from-background dark:via-primary/10 dark:to-blue-950/20">
          {/* Top Bar */}
          <div className="h-16 border-b border-border flex items-center justify-between p-6 ml-4">
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
          <div className="flex flex-col flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
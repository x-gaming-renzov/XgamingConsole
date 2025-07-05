import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Landing from "@/pages/landing";
import Console from "@/pages/console";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import Segments from "@/pages/segments";
import Objects from "@/pages/objects";
import ObjectDetails from "@/pages/object-details";
import Experiences from "@/pages/experiences";
import ExperienceDetails from "@/pages/experience-details";
import ExperienceWizard from "@/pages/experience-wizard";
import Settings from "@/pages/settings";
import PersonalSettings from "@/pages/personal-settings";
import ProjectSettings from "@/pages/project-settings";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/console" component={Console} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/segments" component={Segments} />
      <Route path="/objects" component={Objects} />
      <Route path="/objects/:id" component={ObjectDetails} />
      <Route path="/experiences" component={Experiences} />
      <Route path="/experiences/:experienceId" component={ExperienceDetails} />
      <Route path="/experiences/new" component={ExperienceWizard} />
      <Route path="/experience-wizard" component={ExperienceWizard} />
      <Route path="/settings" component={Settings} />
      <Route path="/personal-settings" component={PersonalSettings} />
      <Route path="/project-settings" component={ProjectSettings} />
      <Route path="/insights" component={() => { window.location.href = "/dashboard"; return null; }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

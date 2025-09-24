import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useInitializeAuth } from "@/lib/auth";
import Landing from "@/pages/landing";
import Console from "@/pages/console";
import Dashboard from "@/pages/dashboard";
import Campaigns from "@/pages/campaigns";
import CampaignDetails from "@/pages/campaign-details";
import Segments from "@/pages/segments";
import SegmentDetails from "@/pages/segment-details";
import Objects from "@/pages/objects";
import ObjectDetails from "@/pages/object-details";
import Experiences from "@/pages/experiences";
import ExperienceDetails from "@/pages/experience-details";
import Metrics from "@/pages/metrics";
import MetricBuilder from "./pages/metric-builder";
import Settings from "@/pages/settings";
import PersonalSettings from "@/pages/personal-settings";
import ProjectSettings from "@/pages/project-settings";
import PersonalisationsCreate from "@/pages/personalisations/create";
import PersonalisationsEdit from "@/pages/personalisations/edit";
import Onboarding from "@/pages/onboarding";
import Signup from "@/pages/signup";
import ExperimentCompass from "@/pages/experiment-compass";
import ExperimentCompassDeepDive from "@/pages/experiment-compass-deep-dive";
import LiveOpsRefinery from "@/pages/liveops-refinery";
import SampleTryPage from "@/pages/sample-try";

import NotFound from "@/pages/not-found";
import Personalisations from "./pages/personalisations";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/signup" component={Signup} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/console" component={Console} />
      <Route path="/dashboard" component={Dashboard} />
      {/* <Route path="/campaigns" component={Campaigns} />
      <Route path="/campaigns/:campaignId" component={CampaignDetails} /> */}
      <Route path="/segments" component={Segments} />
      <Route path="/segments/:id" component={SegmentDetails} />
      <Route path="/objects" component={Objects} />
      <Route path="/objects/:id" component={ObjectDetails} />
      <Route path="/experiences" component={Experiences} />
      <Route path="/experiences/:experienceId" component={ExperienceDetails} />
      <Route path="/personalisations" component={Personalisations} />
      <Route path="/personalisations/edit/:id" component={PersonalisationsEdit} />
      <Route path="/personalisations/create" component={PersonalisationsCreate} />
      <Route path="/metrics" component={Metrics} />
      <Route path="/metrics/builder" component={MetricBuilder} />
      <Route path="/experiment-compass" component={ExperimentCompass} />
      <Route path="/experiment-compass/deep-dive" component={ExperimentCompassDeepDive} />
      <Route path="/liveops-refinery" component={LiveOpsRefinery} />
      <Route path="/settings" component={Settings} />
      <Route path="/personal-settings" component={PersonalSettings} />
      <Route path="/project-settings" component={ProjectSettings} />
  <Route path="/sample-try" component={SampleTryPage} />
      <Route path="/insights" component={() => { window.location.href = "/dashboard"; return null; }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize auth session restoration on app mount
  useInitializeAuth();

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

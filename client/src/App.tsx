import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "@/pages/landing";
import Console from "@/pages/console";
import AppSelector from "@/components/AppSelector";
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
import MetricDetails from "@/pages/metric-details";
import Settings from "@/pages/settings";
import PersonalSettings from "@/pages/personal-settings";
import AppSettings from "@/pages/app-settings";
import OrganizationSettings from "@/pages/organization-settings";
import CreatePersonalisation from "@/pages/create-personalisation";

import NotFound from "@/pages/not-found";
import Personalisations from "@/pages/personalisations";
import PersonalisationDetails from "@/pages/experience-personalisation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/console" component={Console} />
      <Route path="/selector" component={AppSelector} />
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
      <Route path="/create-personalisation" component={CreatePersonalisation} />
      <Route path="/experiences/:experienceId/personalisations" component={PersonalisationDetails} />
      <Route path="/metrics" component={Metrics} />
      <Route path="/metrics/:id" component={MetricDetails} />
      <Route path="/settings" component={Settings} />
      <Route path="/personal-settings" component={PersonalSettings} />
      <Route path="/app-settings" component={AppSettings} />
      <Route path="/organization-settings" component={OrganizationSettings} />
      <Route path="/insights" component={() => { window.location.href = "/dashboard"; return null; }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

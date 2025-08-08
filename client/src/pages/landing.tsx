import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Zap, BarChart3, CheckCircle, Target, TrendingUp } from "lucide-react";
import LoginModal from "@/components/login-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import heroimage from "@/assets/heroimage.png";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const openLogin = () => setLoginModalOpen(true);
  const openSignup = () => setLocation('/signup');
  const closeAuth = () => setLoginModalOpen(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Xgaming Nova</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button variant="ghost" onClick={openLogin} className="text-muted-foreground hover:text-foreground">
                Login
              </Button>
              <Button onClick={openSignup} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Optimize Your FTUE 
              <span className="text-primary"> in Real-Time</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Rapid experimentation console for mobile game PMs. A/B test onboarding flows, tutorials, and first-time user experiences without waiting for app store updates.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
              <Button onClick={openSignup} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Start Experimenting Now
              </Button>
              <Button variant="outline" size="lg" className="border-border text-foreground hover:bg-accent">
                View Demo
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative max-w-5xl mx-auto">
            <img 
              src={heroimage}
              alt="Gaming analytics dashboard interface" 
              className="rounded-xl shadow-2xl w-full h-auto border border-border" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent rounded-xl"></div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-card-foreground mb-4">Built for Mobile Gaming PMs</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to optimize player onboarding and first-time experiences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="gaming-card">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">Instant FTUE Tweaks</h3>
                <p className="text-muted-foreground">Modify onboarding flows, tutorial steps, and first-time rewards without app store updates</p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="gaming-card">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">Level-Based Targeting</h3>
                <p className="text-muted-foreground">Target experiments by player level, progress, or behavioral segments for precise testing</p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="gaming-card">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">Retention Uplift Tracking</h3>
                <p className="text-muted-foreground">Real-time analytics showing how experiments impact day-1, day-3, and day-7 retention</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Test Like the Industry Leaders</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-foreground">One-time SDK integration for unlimited experiments</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-foreground">Configure A/B tests in minutes, not weeks</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-foreground">Real-time results without waiting for app reviews</span>
                </div>
              </div>
            </div>
            <div>
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400" 
                alt="Mobile gaming analytics interface" 
                className="rounded-xl shadow-lg w-full h-auto border border-border" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-card-foreground mb-4">Start Optimizing Your FTUE Today</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join mobile gaming teams who are already improving their onboarding conversion rates
          </p>
          <Button onClick={openSignup} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
            Get Started Free
          </Button>
        </div>
      </div>

      <LoginModal 
        open={loginModalOpen} 
        onClose={closeAuth}
      />
    </div>
  );
}

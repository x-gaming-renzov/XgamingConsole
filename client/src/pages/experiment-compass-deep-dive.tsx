import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Compass, Zap, Target, Shield, Check, X, TrendingUp } from "lucide-react";
import { Link } from "wouter";

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const useCases = [
  {
    scenario: "PvP vs Rumble Event Variant",
    sparrowFit: true,
    shifuFit: false,
    reasoning: "Event modes are tactical levers; wasted players hurt engagement. Sparrow reallocates quickly."
  },
  {
    scenario: "Starter Pack Pricing ($0.99 vs $1.99 vs $4.99)",
    sparrowFit: true,
    shifuFit: false,
    reasoning: "Every lost new user = lost lifetime value. Sparrow adapts faster."
  },
  {
    scenario: "Ad Frequency Tuning (1 vs 2 ads/session)",
    sparrowFit: true,
    shifuFit: false,
    reasoning: "Player tolerance changes quickly; Sparrow finds sweet spot fast."
  },
  {
    scenario: "Season Pass Redesign ($4.99 vs $9.99)",
    sparrowFit: false,
    shifuFit: true,
    reasoning: "Long-term system, must be defensible. Shifu proves it rigorously."
  },
  {
    scenario: "Core Difficulty Curve (Level 1–50)",
    sparrowFit: false,
    shifuFit: true,
    reasoning: "Structural, affects retention for months. Shifu needed."
  },
  {
    scenario: "Notification Template Optimization",
    sparrowFit: true,
    shifuFit: false,
    reasoning: "Tactical, reversible; Sparrow learns best copy fast."
  },
  {
    scenario: "Economy Framework Shift (Loot vs Crafting)",
    sparrowFit: false,
    shifuFit: true,
    reasoning: "Strategic change; requires long-term proof. Shifu essential."
  }
];

const comparisons = [
  {
    dimension: "Philosophy",
    sparrow: "Speed > Certainty; opportunistic",
    shifu: "Certainty > Speed; disciplined"
  },
  {
    dimension: "Traffic Allocation",
    sparrow: "Dynamic, adapts over time",
    shifu: "Fixed, equal split"
  },
  {
    dimension: "Optimization Goal",
    sparrow: "Cumulative reward during test",
    shifu: "Statistical confidence at end"
  },
  {
    dimension: "Best For",
    sparrow: "LiveOps levers (events, IAP, ads, notifications)",
    shifu: "Structural systems (economy, progression, monetization models)"
  },
  {
    dimension: "Wasted Users",
    sparrow: "Few (quickly shifted off losers)",
    shifu: "~50% stuck in losers until end"
  },
  {
    dimension: "Stakeholder Fit",
    sparrow: "Fast wins, tactical insights",
    shifu: "Proof for leadership, CI/power"
  },
  {
    dimension: "Guardrail Horizon",
    sparrow: "Short-term (D1/D7 retention, uninstall)",
    shifu: "Long-term (D30 retention, fairness, inflation)"
  },
  {
    dimension: "Metaphor",
    sparrow: "Pirate steering by instinct",
    shifu: "Master teaching with patience"
  }
];

export default function ExperimentCompassDeepDive() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0A12] via-[#14102A] to-[#1C1338] text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <Link href="/experiment-compass" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Compass</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Compass className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl sm:text-2xl font-semibold">Inside the Decision Engine</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <AnimatedSection>
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              🧭 Experiment Compass Deep Dive
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              <strong>Plain English in. Experiment strategy out.</strong>
            </p>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Every game team faces the same problem: <em>Should we go fast and adapt, or go slow and prove?</em><br/>
              That's why we built the <strong>Decision Engine</strong> inside Experiment Compass.
            </p>
          </div>
        </AnimatedSection>

        {/* Two Modes Introduction */}
        <AnimatedSection delay={0.2}>
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="bg-gradient-to-br from-blue-900/30 to-blue-700/20 border-blue-500/30">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">🏴‍☠️</span>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-300">Sparrow Mode</h3>
                    <p className="text-blue-200">Bandits</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-4">
                  Fast, opportunistic, and adaptive. <em>Jack Sparrow chasing treasure in shifting seas.</em>
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-200">
                  <Zap className="w-4 h-4" />
                  Speed over Certainty
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/30 to-green-700/20 border-green-500/30">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">🐼</span>
                  <div>
                    <h3 className="text-2xl font-bold text-green-300">Shifu Mode</h3>
                    <p className="text-green-200">A/B Testing</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-4">
                  Patient, precise, and disciplined. <em>Master Shifu teaching kung fu through deliberate practice.</em>
                </p>
                <div className="flex items-center gap-2 text-sm text-green-200">
                  <Target className="w-4 h-4" />
                  Certainty over Speed
                </div>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>

        {/* The Philosophies */}
        <AnimatedSection delay={0.4}>
          <Card className="bg-gray-900/50 border-gray-700 mb-12">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                ⚔️ The Philosophies
              </h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold mb-4 text-blue-400">🏴‍☠️ Sparrow Mode: Speed over Certainty</h3>
                  <p className="text-gray-300 mb-4">
                    Jack Sparrow doesn't waste time debating maps — he sails where the wind blows and adjusts course quickly. 
                    Sparrow Mode is about <strong>maximizing value during the test</strong>, reallocating to winners as fast as possible.
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      Perfect for <strong>tactical LiveOps levers</strong>: event variants, IAP pack prices, ad frequency, notifications.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <strong>Strength:</strong> Fewer wasted players on losers, quick learning.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">⚠</span>
                      <strong>Weakness:</strong> Less statistical proof; more about "what works now" than "why."
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4 text-green-400">🐼 Shifu Mode: Certainty over Speed</h3>
                  <p className="text-gray-300 mb-4">
                    Master Shifu doesn't rush. Every strike is tested, every movement deliberate. 
                    Shifu Mode is about <strong>maximizing statistical proof</strong>, running fixed splits until confidence is undeniable.
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      Perfect for <strong>structural design bets</strong>: core difficulty curves, economy frameworks, subscription models, onboarding flows.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <strong>Strength:</strong> Stakeholder-ready, rigorous inference.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">⚠</span>
                      <strong>Weakness:</strong> Slower, 50% of players are "wasted" on losers until the end.
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Side-by-Side Comparison */}
        <AnimatedSection delay={0.6}>
          <Card className="bg-gray-900/50 border-gray-700 mb-12">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                📊 Sparrow vs Shifu: Side-by-Side
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-2 font-semibold text-gray-300">Dimension</th>
                      <th className="text-left py-3 px-2 font-semibold text-blue-400">🏴‍☠️ Sparrow Mode</th>
                      <th className="text-left py-3 px-2 font-semibold text-green-400">🐼 Shifu Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {comparisons.map((comp, i) => (
                      <tr key={i}>
                        <td className="py-4 px-2 font-medium text-gray-200">{comp.dimension}</td>
                        <td className="py-4 px-2 text-blue-200">{comp.sparrow}</td>
                        <td className="py-4 px-2 text-green-200">{comp.shifu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Use Cases */}
        <AnimatedSection delay={0.8}>
          <Card className="bg-gray-900/50 border-gray-700 mb-12">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                🎮 Use Cases: Which Mode Fits Best?
              </h2>
              
              <div className="space-y-4">
                {useCases.map((useCase, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-2">{useCase.scenario}</h4>
                        <p className="text-gray-400 text-sm">{useCase.reasoning}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 text-sm">Sparrow</span>
                          {useCase.sparrowFit ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <X className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 text-sm">Shifu</span>
                          {useCase.shifuFit ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <X className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* The Math Behind It */}
        <AnimatedSection delay={1.0}>
          <Card className="bg-gray-900/50 border-gray-700 mb-12">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                🔮 The Reasoning Behind the Math
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold mb-4 text-blue-400">🏴‍☠️ Sparrow Mode (Bandits)</h3>
                  <ul className="text-gray-300 space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <strong>Goal:</strong> Maximize cumulative reward during the test
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <strong>Core Idea:</strong> Reallocate to winners early, minimizing regret
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <strong>Algorithms:</strong> Epsilon-Greedy, UCB, Thompson Sampling
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <strong>Property:</strong> Sublinear regret (wasted exposure shrinks with time)
                    </li>
                  </ul>
                  <div className="mt-4 p-4 bg-blue-900/20 rounded-lg">
                    <p className="text-blue-200 text-sm italic">
                      "Sparrow tries different treasure chests but keeps opening the richest one faster each round."
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-4 text-green-400">🐼 Shifu Mode (A/B Testing)</h3>
                  <ul className="text-gray-300 space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <strong>Goal:</strong> Estimate effect size with statistical confidence
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <strong>Tools:</strong> t-tests, z-tests for mean/prop differences
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <strong>Output:</strong> Confidence intervals (95%) and power calculations
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <strong>Property:</strong> Guarantees inference accuracy but wastes half your traffic until completion
                    </li>
                  </ul>
                  <div className="mt-4 p-4 bg-green-900/20 rounded-lg">
                    <p className="text-green-200 text-sm italic">
                      "Shifu insists Po break 1,000 boards before declaring mastery — slow, but undeniable."
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Guardrails Philosophy */}
        <AnimatedSection delay={1.2}>
          <Card className="bg-gray-900/50 border-gray-700 mb-12">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Shield className="w-8 h-8 text-yellow-400" />
                🛡 Guardrails Philosophy
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                    <span className="text-2xl">🏴‍☠️</span>
                    Sparrow Guardrails
                  </h3>
                  <p className="text-gray-300 mb-4">Focus on <strong>short-term safety</strong></p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      Retention non-degradation (D1/D7)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      Uninstalls
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      Session drop length
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      Complaints/refunds
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-4 text-green-400 flex items-center gap-2">
                    <span className="text-2xl">🐼</span>
                    Shifu Guardrails
                  </h3>
                  <p className="text-gray-300 mb-4">Focus on <strong>long-term sustainability</strong></p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      D30 retention
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      Economy fairness & inflation
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      Whale retention & satisfaction
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      Player sentiment / review health
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Key Takeaway */}
        <AnimatedSection delay={1.4}>
          <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/30">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-6 text-purple-400">✅ Key Takeaway</h2>
              <div className="text-lg text-gray-200 space-y-4 max-w-4xl mx-auto">
                <p>
                  <strong className="text-blue-400">🏴‍☠️ Sparrow Mode = Pirate opportunism</strong><br/>
                  Great for tactical LiveOps decisions, maximizing short-term value.
                </p>
                <p>
                  <strong className="text-green-400">🐼 Shifu Mode = Master patience</strong><br/>
                  Great for structural game bets, maximizing long-term proof.
                </p>
                <div className="mt-8 p-6 bg-black/20 rounded-lg">
                  <p className="text-xl font-semibold text-white mb-2">Together, they form the <span className="text-purple-400">Experiment Compass</span>:</p>
                  <div className="flex items-center justify-center gap-8 text-gray-300">
                    <span>Plain English in</span>
                    <span>→</span>
                    <span>The right strategy out</span>
                    <span>→</span>
                    <span>Guardrails always on</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Back to Compass CTA */}
        <AnimatedSection delay={1.6}>
          <div className="text-center mt-12">
            <Link href="/experiment-compass">
              <Badge className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg cursor-pointer">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Try the Experiment Compass
              </Badge>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
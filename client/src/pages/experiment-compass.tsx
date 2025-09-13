import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight, Clipboard, Sparkles, Shield, Compass, Info, ArrowLeft, AlertCircle, Play, BarChart3, Share, ChevronDown, ChevronUp, Search, Star, TrendingDown, TrendingUp, FileText, Beaker, Clock3 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import type { ExperimentCompassResponse } from "@shared/schema";
import { IssuesSummaryTabs, ExperimentCard, EvidenceModal, type Evidence } from "@/components/ExperimentCompassComponents";
import HypothesesPanel from "@/components/HypothesesPanel";
import { TagPill } from "@/components/ui/tag";
import { generatePDFReport } from "@/utils/pdfGenerator";

// Unified API call for describe experiment
async function callGpt5Thinking(userText: string): Promise<ExperimentCompassResponse> {
  const response = await fetch("/api/experiments/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description: userText }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get recommendation");
  }

  return response.json();
}

// Unified API call for review miner
type ReviewForModel = { id: string; text: string; rating?: number; lang?: string; thumbsUp?: number; date?: string };
type WindowFilter = { recency_days?: number; older_than_days?: number };
async function callGpt5FromReviews(
  reviews: ReviewForModel[],
  filter?: WindowFilter
): Promise<ExperimentCompassResponse> {
  const response = await fetch("/api/experiments/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reviews, ...filter }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get recommendation");
  }

  return response.json();
}

// Fetch reviews from Play Store
async function fetchReviews(playStoreUrl: string) {
  const response = await fetch("/api/reviews/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playStoreUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch reviews");
  }

  return response.json();
}

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export default function ExperimentCompass() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<ExperimentCompassResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEngineerView, setShowEngineerView] = useState(false);
  const [activeTab, setActiveTab] = useState("experiment");
  
  // Review Miner state
  const [playStoreUrl, setPlayStoreUrl] = useState("");
  const [reviewOutput, setReviewOutput] = useState<ExperimentCompassResponse | null>(null);
  const [isReviewMining, setIsReviewMining] = useState(false);
  const [reviewMiningError, setReviewMiningError] = useState<string | null>(null);
  
  // Unified Evidence Modal State
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceItems, setEvidenceItems] = useState<Evidence[]>([]);
  
  // Incremental loading state
  const [isFetchingReviews, setIsFetchingReviews] = useState(false);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [isGeneratingExperiments, setIsGeneratingExperiments] = useState(false);

  // Recency window (single selection)
  type RecencyKey = "30" | "60" | "90" | "older90";
  const [recencyKey, setRecencyKey] = useState<RecencyKey>("90");
  const WINDOW_PRESETS: Record<RecencyKey, { label: string; filter: WindowFilter }> = {
    "30":     { label: "Last 30 days",  filter: { recency_days: 30 } },
    "60":     { label: "Last 60 days",  filter: { recency_days: 60 } },
    "90":     { label: "Last 90 days",  filter: { recency_days: 90 } },
    "older90":{ label: "Older than 90 days", filter: { older_than_days: 90 } },
  };

  // Handle URL parameters for automatic loading
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const playStoreLink = urlParams.get('psl');
    
    if (playStoreLink) {
      setActiveTab("reviews");
      setPlayStoreUrl(playStoreLink);
      setRecencyKey("60"); // Set to 60 days for email CTA
      setTimeout(() => {
        startAutoMining(playStoreLink);
      }, 500);
    }
  }, []);

  const startAutoMining = async (url: string) => {
    setPlayStoreUrl(url);
    await onMineReviewsIncremental(url);
  };

  const onAsk = async () => {
    setIsLoading(true);
    setError(null);
    setOutput(null);

    try {
      const result = await callGpt5Thinking(input);
      setOutput(result);
    } catch (error) {
      console.error("Failed to get recommendation:", error);
      setError(error instanceof Error ? error.message : "Failed to get recommendation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onMineReviewsIncremental = async (urlOverride?: string) => {
    // Reset
    setReviewMiningError(null);
    setReviewOutput(null);
    setIsFetchingReviews(false);
    setIsGeneratingThemes(false);
    setIsGeneratingExperiments(false);

    try {
      // Step 1: Fetch raw reviews
      setIsFetchingReviews(true);
      const reviewResult = await fetchReviews(urlOverride || playStoreUrl);
      setIsFetchingReviews(false);

      // Transform fetched reviews to unified shape (keep date & thumbsUp)
      const reviews: ReviewForModel[] = (reviewResult.allReviews || []).map((r: any, idx: number) => {
        // Create a clean object to avoid circular references
        const cleanReview = {
          id: String(r.reviewId || r.id || `rev_${idx}`),
          text: String(r.text || r.content || "").slice(0, 400),
          rating: typeof r.score === "number" ? r.score : (typeof r.rating === "number" ? r.rating : undefined),
          lang: String(r.lang || "en"),
          thumbsUp: Number(r.thumbsUp) || 0,
          date: r.date ? new Date(r.date).toISOString() : (r.at ? new Date(r.at).toISOString() : undefined),
        };
        return cleanReview;
      });

      // Show status for UI
      setIsGeneratingThemes(true);
      setIsGeneratingExperiments(true);

      // Unified call → one JSON contract for UI (only selected window)
      const filterClean = JSON.parse(JSON.stringify(WINDOW_PRESETS[recencyKey].filter));
      const unified = await callGpt5FromReviews(reviews, filterClean);

      // Done
      setIsGeneratingThemes(false);
      setIsGeneratingExperiments(false);

      setReviewOutput(unified);
    } catch (error) {
      console.error("Failed during unified mining:", error);
      setIsFetchingReviews(false);
      setIsGeneratingThemes(false);
      setIsGeneratingExperiments(false);
      setReviewMiningError(error instanceof Error ? error.message : "Failed to process reviews. Please try again.");
    }
  };

  const handleGeneratePDF = () => {
    const data = output || reviewOutput;
    if (!data) return;
    
    const pdf = generatePDFReport(data);
    pdf.save(`experiment-compass-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const generateSlackSummary = (output: ExperimentCompassResponse) => {
    const experiment = output.experiments[0];
    if (!experiment) return '';
    
    const heading = output.source === "DESCRIBE_EXPERIMENT"
      ? "🧪 *Experiment Draft* (from your description)"
      : "🧭 *Experiment Recommendation* (from reviews)";
    
    return `${heading}
    
*Goal:* ${experiment.goal_metric.name}
*Mode:* ${experiment.recommended_mode === "Sparrow" ? "🏴‍☠️ Sparrow (Bandits)" : "🐼 Shifu (A/B Testing)"}
*Type:* ${experiment.experiment_type}

*Guardrails:*
${experiment.guardrail_metrics.map((metric: any) => `• ${metric.name}`).join('\n')}

*Why this approach:*
${experiment.rationale}

${experiment.confidence ? `*Confidence:* ${Math.round(experiment.confidence * 100)}%` : ''}

_Generated by Nova Experiment Compass_`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0A12] via-[#14102A] to-[#1C1338] text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back</span>
              </Link>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="flex items-center gap-2">
                <Compass className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl font-bold">Experiment Compass</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Show Prompt button hidden per user request */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Main Compass Interface */}
        <AnimatedSection>
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-full text-purple-300 text-sm mb-4">
                  <Compass className="w-4 h-4" />
                  AI-Powered Experiment Design
                </div>
                <h2 className="text-2xl font-bold mb-3">What would you like to experiment with?</h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Describe your idea or upload app store reviews, and I'll suggest the optimal experimentation approach with statistical backing.
                </p>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
                  <TabsTrigger 
                    value="experiment" 
                    className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
                    data-testid="tab-experiment"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Describe Experiment
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reviews" 
                    className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
                    data-testid="tab-reviews"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Review Miner
                  </TabsTrigger>
                </TabsList>
                
                {/* Describe Experiment Tab */}
                <TabsContent value="experiment" className="mt-6">
                  <div className="space-y-4">
                    <label className="block text-lg font-medium flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      What do you want to test?
                    </label>
                    <Textarea
                      placeholder={`e.g., I want to test rewarded ads to lift engagement while protecting ad revenue.\nContext: D1 retention ~35%, ad ARPDAU dips on weekends.`}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="min-h-[120px] bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                      data-testid="textarea-experiment-description"
                    />
                    <p className="text-sm text-gray-400">
                      We'll translate your idea into a testable plan: hypothesis → design → metrics.
                    </p>
                    <Button 
                      onClick={onAsk} 
                      disabled={!input || isLoading} 
                      className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                      data-testid="button-analyze-experiment"
                    >
                      <Compass className="w-4 h-4" /> 
                      {isLoading ? "Analyzing..." : "Get Recommendations"}
                    </Button>
                  </div>

                  {/* Conditional Rendering for Describe vs Review Miner Results */}
                  {output && output.source === "DESCRIBE_EXPERIMENT" && (
                    <>
                      <HypothesesPanel hypotheses={output.hypotheses ?? []} />
                      <div className="mt-8 space-y-4">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
                          <Sparkles className="w-5 h-5" /> AI-Suggested Experiment
                        </h3>
                        {output.experiments.map((exp) => (
                          <ExperimentCard
                            key={exp.id}
                            experiment={exp}
                            onShowEvidence={(ev) => { setEvidenceItems(ev); setShowEvidenceModal(true); }}
                            resolveEvidence={(linkedInsightIds) =>
                              linkedInsightIds.flatMap(id =>
                                output.insights.find(i => i.id === id)?.evidence?.map(e => ({
                                  ...e,
                                  // UX label for synthetic evidence
                                  label: e.source === "DESCRIPTION" ? "Assumption snippet" : "Review"
                                })) || []
                              )
                            }
                          />
                        ))}
                      </div>
                      <EvidenceModal open={showEvidenceModal} evidence={evidenceItems} onOpenChange={setShowEvidenceModal} />
                    </>
                  )}
                  
                  {/* Review Miner Results - Keep existing behavior */}
                  {output && output.source === "REVIEW_MINER" && (
                    <>
                      <IssuesSummaryTabs
                        insights={output.insights}
                        counts={output.summary.counts}
                        onShowEvidence={(ev) => { setEvidenceItems(ev); setShowEvidenceModal(true); }}
                      />

                      <div className="mt-8 space-y-4">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
                          <Sparkles className="w-5 h-5" /> AI-Suggested Experiments ({output.experiments.length})
                        </h3>
                        {output.experiments.map((exp) => (
                          <ExperimentCard
                            key={exp.id}
                            experiment={exp}
                            onShowEvidence={(ev) => { setEvidenceItems(ev); setShowEvidenceModal(true); }}
                            resolveEvidence={(linkedInsightIds) => {
                              const catalog = output?.reviews_catalog || {};
                              const items = linkedInsightIds.flatMap(id => output.insights.find(i => i.id === id)?.evidence || []);
                              return items.map(ev => ({
                                ...ev,
                                rating: ev.rating ?? catalog[ev.review_id]?.rating,
                                date_iso: ev.date_iso ?? catalog[ev.review_id]?.date_iso,
                                lang: ev.lang ?? catalog[ev.review_id]?.lang,
                              }));
                            }}
                          />
                        ))}
                      </div>

                      <EvidenceModal open={showEvidenceModal} evidence={evidenceItems} onOpenChange={setShowEvidenceModal} />
                    </>
                  )}
                </TabsContent>

                {/* Review Miner Tab */}
                <TabsContent value="reviews" className="mt-6">
                  <div className="space-y-4">
                    <label className="block text-lg font-medium flex items-center gap-2">
                      <Search className="w-5 h-5 text-blue-400" />
                      Mine app store reviews for experiment insights
                    </label>
                    <p className="text-sm text-gray-400 mb-3">
                      Enter a Google Play Store URL to analyze reviews, extract themes, and get AI-powered experiment recommendations.
                    </p>
                    <Textarea
                      placeholder="e.g., https://play.google.com/store/apps/details?id=com.supercell.clashofclans"
                      value={playStoreUrl}
                      onChange={(e) => setPlayStoreUrl(e.target.value)}
                      disabled={isFetchingReviews || isGeneratingThemes || isGeneratingExperiments}
                      className="min-h-[80px] bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="textarea-play-store-url"
                    />
                    {/* Recency dropdown (single-window) */}
                    <div className="flex items-center gap-3 text-sm">
                      <Clock3 className="w-4 h-4 text-blue-300" />
                      <span className="text-gray-300">Recency:</span>
                      <Select value={recencyKey} onValueChange={(v) => setRecencyKey(v as RecencyKey)} disabled={isFetchingReviews || isGeneratingThemes || isGeneratingExperiments}>
                        <SelectTrigger className="w-[210px] bg-gray-800 border-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                          <SelectValue placeholder="Pick a window" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 text-white border-gray-700">
                          <SelectItem value="30">Last 30 days</SelectItem>
                          <SelectItem value="60">Last 60 days</SelectItem>
                          <SelectItem value="90">Last 90 days</SelectItem>
                          <SelectItem value="older90">Older than 90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={() => onMineReviewsIncremental()} 
                      disabled={!playStoreUrl || isFetchingReviews || isGeneratingThemes || isGeneratingExperiments} 
                      className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                      data-testid="button-mine-reviews"
                    >
                      <Search className="w-4 h-4" /> 
                      {(isFetchingReviews || isGeneratingThemes || isGeneratingExperiments) ? "Processing..." : "Mine Reviews"}
                    </Button>
                    
                    {/* Progressive status indicators */}
                    {isFetchingReviews && (
                      <p className="text-xs text-blue-400 mt-2">
                        🔍 Step 1/3: Fetching reviews from Play Store...
                      </p>
                    )}
                    {isGeneratingThemes && (
                      <p className="text-xs text-purple-400 mt-2">
                        🧠 Step 2/3: Generating themes using AI... (2-3 min)
                      </p>
                    )}
                    {isGeneratingExperiments && (
                      <p className="text-xs text-green-400 mt-2">
                        ⚡ Step 3/3: Creating experiment suggestions ({WINDOW_PRESETS[recencyKey].label})...
                      </p>
                    )}
                  </div>

                  {/* Results (single-window) */}
                  {reviewOutput && (
                    <>
                      {/* Active window pill with improved spacing and copy */}
                      <div className="mt-6 mb-3 inline-flex items-center gap-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded">
                        <Clock3 className="w-3 h-3" /> Review analysis from {WINDOW_PRESETS[recencyKey].label.toLowerCase()}
                      </div>
                      {/* Micro-legend for PMs */}
                      <div className="flex flex-wrap gap-2 mb-3 text-xs">
                        <TagPill tone="red"   variant="soft">High Severity</TagPill>
                        <TagPill tone="amber" variant="soft">Medium</TagPill>
                        <TagPill tone="green" variant="soft">Low</TagPill>
                        <TagPill tone="purple" variant="soft">Monetization / Ads</TagPill>
                        <TagPill tone="indigo" variant="soft">Gameplay</TagPill>
                        <TagPill tone="teal" variant="soft">Tech</TagPill>
                      </div>
                      <IssuesSummaryTabs
                        insights={reviewOutput.insights}
                        counts={reviewOutput.summary.counts}
                        onShowEvidence={(ev) => { setEvidenceItems(ev); setShowEvidenceModal(true); }}
                      />

                      <div className="mt-8 space-y-4">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-purple-400">
                          <Sparkles className="w-5 h-5" /> AI-Suggested Experiments ({reviewOutput.experiments.length})
                        </h3>
                        {reviewOutput.experiments.map((exp) => (
                          <ExperimentCard
                            key={exp.id}
                            experiment={exp}
                            onShowEvidence={(ev) => { setEvidenceItems(ev); setShowEvidenceModal(true); }}
                            resolveEvidence={(linkedInsightIds) => {
                              const catalog = reviewOutput?.reviews_catalog || {};
                              const items = linkedInsightIds.flatMap(id => reviewOutput.insights.find(i => i.id === id)?.evidence || []);
                              return items.map(ev => ({
                                ...ev,
                                rating: ev.rating ?? catalog[ev.review_id]?.rating,
                                date_iso: ev.date_iso ?? catalog[ev.review_id]?.date_iso,
                                lang: ev.lang ?? catalog[ev.review_id]?.lang,
                              }));
                            }}
                          />
                        ))}
                      </div>

                      <EvidenceModal open={showEvidenceModal} evidence={evidenceItems} onOpenChange={setShowEvidenceModal} />
                    </>
                  )}

                  {reviewOutput && reviewOutput.insights.length === 0 && (
                    <Card className="bg-yellow-900/10 border-yellow-600/30 mt-8">
                      <CardContent className="p-8 text-center">
                        <div className="mb-4">
                          <Search className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-yellow-400 mb-2">No Reviews Found</h3>
                          <p className="text-gray-300 mb-4">
                            Sorry, we don't see any reviews to gather critical information from this app. 
                            This could happen if:
                          </p>
                          <ul className="text-sm text-gray-400 text-left max-w-md mx-auto space-y-1">
                            <li>• The app has very few or no reviews</li>
                            <li>• The app is newly published</li>
                            <li>• Reviews are not available in the region</li>
                            <li>• The app ID might be incorrect</li>
                          </ul>
                        </div>
                        <div className="pt-4 border-t border-yellow-600/20">
                          <p className="text-xs text-gray-500">
                            Try a different app or check the Play Store URL is correct
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Error handling */}
                  {reviewMiningError && (
                    <Card className="bg-red-900/10 border-red-600/30 mt-8">
                      <CardContent className="p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-400 mb-2">Mining Failed</h3>
                        <p className="text-gray-300 mb-4">{reviewMiningError}</p>
                        <Button 
                          onClick={() => setReviewMiningError(null)} 
                          variant="outline" 
                          className="border-red-600 text-red-400 hover:bg-red-600/10"
                          data-testid="button-retry-mining"
                        >
                          Try Again
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Error Section */}
        {error && (
          <AnimatedSection delay={0.6}>
            <Card className="bg-red-900/20 border-red-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <h3 className="font-semibold">Error</h3>
                </div>
                <p className="text-red-300">{error}</p>
                <Button 
                  variant="outline" 
                  onClick={() => setError(null)}
                  className="mt-4 border-red-600 text-red-400 hover:bg-red-900/30"
                  data-testid="button-clear-error"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Engineer View */}
        {showEngineerView && (output || reviewOutput) && (
          <AnimatedSection delay={0.8}>
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  System Prompts & API Response
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-2">
                      Unified System Prompt
                    </h4>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-sm font-mono">
                      <p className="text-gray-300">
                        SYSTEM_PROMPT_SPARROW_SHIFU_UNIFIED - Analyzes user input (description or reviews) 
                        and generates structured experiment recommendations with insights, evidence, and experiments 
                        following the ExperimentCompassResponse schema.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-gray-400 mb-2">
                      API Response JSON
                    </h4>
                    <div className="bg-gray-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(output || reviewOutput, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Deep Dive Section */}
        <AnimatedSection delay={0.8}>
          <Card className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-500/30 mt-12">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Want to understand the science behind the recommendations?</h3>
              <p className="text-gray-300 mb-6">
                Dive deeper into statistical significance, power analysis, and the methodology behind Sparrow vs Shifu recommendations.
              </p>
              <Link href="/experiment-compass/deep-dive">
                <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 mx-auto">
                  <BarChart3 className="w-4 h-4" />
                  Learn the Methodology
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Share Section */}
        {(output || reviewOutput) && (
          <AnimatedSection delay={1.0}>
            <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-1">Share these recommendations</h3>
                    <p className="text-gray-400 text-sm">Export for Slack, email, or documentation</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-green-600 text-green-400 hover:bg-green-600/10">
                        <Share className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Export Recommendations</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-300 mb-2 block">Export Options</label>
                          <div className="grid grid-cols-1 gap-3">
                            <Button
                              onClick={handleGeneratePDF}
                              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Generate PDF Report
                            </Button>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Slack Summary</label>
                              <div className="bg-gray-800 rounded-lg p-3">
                                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                                  {generateSlackSummary(output || reviewOutput!)}
                                </pre>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 text-xs"
                                onClick={() => navigator.clipboard.writeText(generateSlackSummary(output || reviewOutput!))}
                              >
                                <Clipboard className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
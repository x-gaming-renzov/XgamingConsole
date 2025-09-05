// ExperimentCompassComponents.tsx
// Reusable components for BOTH Describe + Review Miner tabs.
// - Summary bar with severity counts
// - Issues/Feedback tabs (toggle Critical vs Positive)
// - Experiment card (Sparrow/Shifu) with evidence hook
// - Evidence modal

import { useState } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { TagPill } from "@/components/ui/tag";
import { ModeBadge } from "@/components/ModeBadge";
import { ComingSoonModal } from "@/components/ComingSoonModal";
import { CopiedModal } from "@/components/CopiedModal";
import { colorForCategory, toneForSeverity } from "@/lib/taxonomy-color";
import { FileText, Copy, Slack, LayoutDashboard, Sparkles, Info } from "lucide-react";

// Time ago utility
const timeAgo = (iso?: string) => {
  if (!iso) return "—";
  const delta = Date.now() - new Date(iso).getTime();
  const d = Math.max(1, Math.floor(delta / (1000*60*60*24)));
  return d === 1 ? "1 day ago" : `${d} days ago`;
};

// ---- Minimal schema-aligned types (kept local to avoid import path issues) ----
export type Evidence = { review_id: string; excerpt: string; rating?: number; lang?: string; date_iso?: string };
export type Insight = {
  id: string;
  category: "GAMEPLAY"|"TECH"|"ART_CONTENT"|"BUG"|"MONETIZATION_ADS"|"ENGAGEMENT_SENTIMENT"|"FEATURE_REQUEST";
  subcategory: string; // enum in backend; safe as string here for flexibility
  severity: "LOW"|"MEDIUM"|"HIGH";
  frequency_score: number; // 0..1
  sentiment: "NEGATIVE"|"NEUTRAL"|"POSITIVE";
  summary: string;
  evidence: Evidence[];
};
export type Metric = { name: string; window?: string; direction?: "UP"|"DOWN"|"NO_WORSE" };
export type Experiment = {
  id: string;
  title: string;
  experiment_type: string;
  recommended_mode: "Sparrow"|"Shifu";
  mode_tagline: string;
  goal_metric: Metric;
  guardrail_metrics: Metric[];
  rationale: string;
  confidence?: number;
  linked_insight_ids: string[];
  implementation_notes?: string[];
  variants?: { key: string; description: string }[];
  alternative_mode?: { mode: "Sparrow"|"Shifu"; when_to_prefer: string; tradeoffs: string[] };
};
export type SummaryCounts = {
  insights_total: number;
  positive: number;
  negative: number;
  by_severity: { HIGH: number; MEDIUM: number; LOW: number };
};

// ---- Evidence Modal ----
export function EvidenceModal({ open, onOpenChange, evidence }: { open: boolean; onOpenChange: (v: boolean) => void; evidence: Evidence[]; }) {
  // Detect if this contains assumption snippets
  const hasAssumptions = evidence.some((e: any) => e?.source === "DESCRIPTION");
  const modalTitle = hasAssumptions ? "Assumptions" : "Sample Reviews";
  const emptyMessage = hasAssumptions ? "No assumptions available." : "No sample reviews available.";
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-900 border border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" /> {modalTitle}
          </DialogTitle>
          {hasAssumptions && (
            <p className="text-sm text-gray-400 mt-1">
              These are assumption snippets extracted from your description.
            </p>
          )}
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {evidence.length === 0 && (
            <p className="text-sm text-gray-400">{emptyMessage}</p>
          )}
          {evidence.map((ev, idx) => (
            <Card key={idx} className="bg-gray-800/50 border-gray-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">ID: {ev.review_id}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {typeof ev.rating === "number" && (
                      <span>★ {ev.rating}</span>
                    )}
                    {ev.date_iso && (
                      <>
                        <span>•</span>
                        <span title={new Date(ev.date_iso).toLocaleDateString()}>{timeAgo(ev.date_iso)}</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-200">{ev.excerpt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Issues + Summary (tabs inside) ----
export function IssuesSummaryTabs({ 
  insights, 
  counts, 
  onShowEvidence, 
  minVisible = 5 
}: { 
  insights: Insight[]; 
  counts: SummaryCounts; 
  onShowEvidence: (ev: Evidence[]) => void; 
  minVisible?: number;
}) {
  const [activeTab, setActiveTab] = useState<"critical" | "positive">("critical");
  const [showAll, setShowAll] = useState(false);

  // Removed old severityBadge function - now using TagPill directly

  const criticalList = insights.filter(i => i.sentiment === "NEGATIVE");
  const positiveList = insights.filter(i => i.sentiment === "POSITIVE");
  
  const currentList = activeTab === "critical" ? criticalList : positiveList;
  const visibleList = showAll ? currentList : currentList.slice(0, minVisible);

  return (
    <div className="w-full space-y-4">
      {/* Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-gray-900 border border-gray-700 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <TagPill tone="red" variant="solid">Critical: {counts.negative}</TagPill>
          <TagPill tone="green" variant="solid">Positive: {counts.positive}</TagPill>
          <TagPill tone="slate" variant="outline">Total: {counts.insights_total}</TagPill>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-400">Severity</span>
          <TagPill tone="red" variant="solid">High: {counts.by_severity.HIGH}</TagPill>
          <TagPill tone="amber" variant="solid">Med: {counts.by_severity.MEDIUM}</TagPill>
          <TagPill tone="green" variant="solid">Low: {counts.by_severity.LOW}</TagPill>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === "critical" ? "default" : "secondary"} onClick={() => setActiveTab("critical")} className="rounded-full px-4 py-2">View Critical</Button>
          <Button variant={activeTab === "positive" ? "default" : "secondary"} onClick={() => setActiveTab("positive")} className="rounded-full px-4 py-2">View Positive</Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-4 md:grid-cols-2">
        {visibleList.map((i) => (
          <Card key={i.id} className="bg-gray-900 text-white rounded-2xl border border-gray-700 shadow-md">
            <CardHeader className="pb-2 border-b border-gray-700">
              <div className="flex items-center gap-2 flex-wrap">
                <TagPill tone={toneForSeverity(i.severity)} variant="solid" className="uppercase font-semibold">
                  {i.severity}
                </TagPill>
                {/* Frequency with a tiny bar */}
                <div className="relative">
                  <TagPill tone="slate" variant="soft" aria-label={`Frequency ${(i.frequency_score*100).toFixed(0)} percent`}>
                    {(i.frequency_score * 100).toFixed(0)}%
                  </TagPill>
                  <span
                    className="absolute left-1.5 right-1.5 bottom-0.5 h-0.5 bg-white/16 rounded"
                    aria-hidden
                  />
                  <span
                    className="absolute left-1.5 bottom-0.5 h-0.5 bg-white/90 rounded"
                    style={{ width: `${Math.max(6, Math.min(96, i.frequency_score * 100))}%` }}
                    aria-hidden
                  />
                </div>
                <TagPill
                  tone={colorForCategory(i.category)}
                  variant="soft"
                  className="uppercase max-w-full"
                  tooltip={`${i.category} • ${i.subcategory}`}
                >
                  <span className="truncate">{i.category} · {i.subcategory}</span>
                </TagPill>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <p className="text-sm text-gray-200 mb-3">{i.summary}</p>
              <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300"
                onClick={() => onShowEvidence(i.evidence)}>
                <FileText className="w-4 h-4 mr-1" /> View Sample Reviews
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Show More/Less Button */}
      {currentList.length > minVisible && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => setShowAll(!showAll)} className="rounded-full">
            {showAll ? "Show Less" : `Show ${currentList.length - minVisible} More`}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Experiment Card (Sparrow/Shifu) ----
export function ExperimentCard({ experiment, onShowEvidence, resolveEvidence }: {
  experiment: Experiment;
  onShowEvidence: (ev: Evidence[]) => void;
  resolveEvidence: (linkedInsightIds: string[]) => Evidence[];
}) {
  // Detect if this is from DESCRIBE_EXPERIMENT by checking evidence sources
  const evidence = resolveEvidence(experiment.linked_insight_ids);
  const isAssumption = evidence?.some((e: any) => e?.source === "DESCRIPTION");
  const evidenceTitle = isAssumption ? "Assumptions" : "Sample Reviews";
  const confidencePct = typeof experiment.confidence === "number" ? Math.round(experiment.confidence * 100) : undefined;
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showCopiedModal, setShowCopiedModal] = useState(false);

  const copyExperimentSummary = async () => {
    const modeExplanation = experiment.recommended_mode === "Sparrow" 
      ? "Sparrow (Multi-Armed Bandit): Speed over certainty. Adaptive allocation for rapid iteration and tactical wins."
      : "Shifu (A/B Testing): Certainty over speed. Fixed allocation with statistical rigor for stakeholder-ready confidence.";
    
    const summary = `${experiment.title}\n\nType: ${experiment.experiment_type}\nRecommended Mode: ${experiment.recommended_mode}\n\n${modeExplanation}\n\nGoal: ${experiment.goal_metric.name}\nGuardrails: ${experiment.guardrail_metrics.map(m => m.name).join(', ')}\n\nRationale:\n${experiment.rationale}${experiment.confidence ? `\n\nConfidence: ${confidencePct}%` : ''}\n\nGenerated by Nova Experiment Compass by XGaming`;
    
    try {
      await navigator.clipboard.writeText(summary);
      setShowCopiedModal(true);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <Card className="w-full bg-gray-900 text-white rounded-2xl shadow-lg border border-gray-700">
      <CardHeader className="flex flex-col gap-2 border-b border-gray-700 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{experiment.title}</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <ModeBadge mode={experiment.recommended_mode} />
              <span className="absolute -inset-1 rounded-full blur-md opacity-20 pointer-events-none bg-gradient-to-r from-purple-500/40 to-blue-500/40" />
            </div>
            {confidencePct !== undefined && (
              <TagPill tone="slate" variant="soft">{confidencePct}% confidence</TagPill>
            )}
          </div>
        </div>
        {/* Type row with optional alternative mode info */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>Type: {experiment.experiment_type}</span>
          {experiment.alternative_mode?.mode && (
            <TagPill tone="slate" variant="soft" tooltip={experiment.alternative_mode.when_to_prefer}>
              <Info className="w-3 h-3 mr-1 inline-block" />
              Alt: {experiment.alternative_mode.mode}
            </TagPill>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div>
          <p className="text-sm font-semibold text-gray-300">🎯 Goal Metric</p>
          <p className="text-white">{experiment.goal_metric.name}{experiment.goal_metric.window ? ` (${experiment.goal_metric.window})` : ""}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-300">🛡 Guardrails</p>
          <ul className="list-disc list-inside text-gray-300 text-sm">
            {experiment.guardrail_metrics.map((g, i) => (
              <li key={i}>{g.name}{g.window ? ` (${g.window})` : ""}</li>
            ))}
          </ul>
        </div>

        {experiment.variants && experiment.variants.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-300">A/B/n Variants</p>
            <ul className="list-disc list-inside text-gray-300 text-sm">
              {experiment.variants.map(v => (
                <li key={v.key}><strong>{v.key}</strong>: {v.description}</li>
              ))}
            </ul>
          </div>
        )}

        {experiment.alternative_mode && (
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-sm font-semibold text-gray-300 mb-1">Alternative: {experiment.alternative_mode.mode}</p>
            <p className="text-xs text-gray-400 mb-1">When to prefer: {experiment.alternative_mode.when_to_prefer}</p>
            <ul className="list-disc list-inside text-gray-400 text-xs">
              {experiment.alternative_mode.tradeoffs.map((t, i) => (<li key={i}>{t}</li>))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-gray-300">💡 Rationale</p>
          <p className="text-sm text-gray-200">{experiment.rationale}</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-sm font-semibold text-gray-300 mb-2">📌 {evidenceTitle}</p>
          <Button size="sm" variant="secondary" className="flex items-center gap-2"
            onClick={() => onShowEvidence(evidence)}>
            <FileText className="w-4 h-4" /> View {evidenceTitle}
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t border-gray-700 pt-4">
        <div className="flex gap-2">
          <Button variant="secondary" className="flex items-center gap-2" onClick={copyExperimentSummary}>
            <Copy size={16} /> Copy Summary
          </Button>
          <Button variant="secondary" className="flex items-center gap-2" onClick={() => setShowSlackModal(true)}>
            <Slack size={16} /> Share to Slack
          </Button>
          <Button variant="secondary" className="flex items-center gap-2" onClick={() => setShowNovaModal(true)}>
            <LayoutDashboard size={16} /> Send to Nova
          </Button>
        </div>
        <span className="text-sm text-gray-400 flex items-center gap-2"><Sparkles className="w-4 h-4" /> {confidencePct !== undefined ? `Confidence: ${confidencePct}%` : ""}</span>
      </CardFooter>
      
      <ComingSoonModal 
        open={showSlackModal} 
        onOpenChange={setShowSlackModal} 
        feature="Slack sharing" 
      />
      <ComingSoonModal 
        open={showNovaModal} 
        onOpenChange={setShowNovaModal} 
        feature="Nova integration" 
      />
      <CopiedModal 
        open={showCopiedModal} 
        onOpenChange={setShowCopiedModal} 
      />
    </Card>
  );
}
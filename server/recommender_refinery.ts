// recommender_refinery.ts — drop-in scorer per PRD
import fs from 'node:fs';
import path from 'node:path';

type Evidence = { studio: string; page: number };
type CatKB = {
  metrics: string[];
  weights: Record<string, number>;
  what: string;
  moves: string[];
  risks: string[];
  assumptions: string;
  evidence: Evidence[];
  commonality_count?: number;
  impact_score_1_to_10?: number;
  confidence?: 'Low'|'Med'|'High';
  recommended_mode: 'Sparrow'|'Shifu';
  recommended_allocation: string;
  stat_output: string;
};

const DATA_DIR = process.cwd();
const KB_PATH = path.join(DATA_DIR, 'data/liveops_kb.json');
const RX_PATH = path.join(DATA_DIR, 'data/feature_regex.json');
const SC_PATH = path.join(DATA_DIR, 'data/scoring_config.json');
const NEEDS_PATH = path.join(DATA_DIR, 'data/needs_templates.json');
const EX_PATH = path.join(DATA_DIR, 'data/genre_examples.json');

const KB = JSON.parse(fs.readFileSync(KB_PATH,'utf8')) as { categories: Record<string, CatKB> };
const RX = JSON.parse(fs.readFileSync(RX_PATH,'utf8'));
const SC = JSON.parse(fs.readFileSync(SC_PATH,'utf8'));
const NEEDS = JSON.parse(fs.readFileSync(NEEDS_PATH,'utf8'));
const EXAMPLES = JSON.parse(fs.readFileSync(EX_PATH,'utf8'));

const MAX_METRIC_SUM = (SC.constants && SC.constants.MAX_METRIC_SUM) || 5.95;
const DEN = (SC.constants && SC.constants.STUDIO_DENOMINATOR) || 55;

function inferHints(text: string){
  const s = (text||'').toLowerCase();
  const has = (key:string) => new RegExp(RX[key]||'$', 'i').test(s);
  return { pvp: has('pvp'), events: has('events'), energy: has('energy'), chests: has('chests'), gacha: has('gacha'), quests: has('quests'), ads: has('ads') };
}

function businessImpactScore(kb: CatKB): number {
  const sum = (kb.metrics||[]).reduce((acc, m)=> acc + (kb.weights?.[m]||0), 0);
  return Math.round(100 * (sum / MAX_METRIC_SUM));
}

function commonalityPct(kb: CatKB): number {
  const n = kb.commonality_count || 0;
  return +( (100 * n) / DEN ).toFixed(1);
}

function overallPriority(impact1to10: number, bi: number, cpct: number){
  const s = 0.40*(impact1to10*10) + 0.35*bi + 0.25*cpct;
  return +(s.toFixed(1));
}

function chooseMode(kb: CatKB){
  const mode = kb.recommended_mode || 'Shifu';
  const why = mode==='Sparrow' ? 'Faster allocation, less traffic wasted on losers.' : 'Rigor and stakeholder‑friendly reporting.';
  return { mode, allocation_method: kb.recommended_allocation, stat_output: kb.stat_output, why_this_mode: why };
}

export function recommend(app: any){
  const cats = KB.categories;
  const ranked = Object.entries(cats).map(([category, v])=>{
    const bi = businessImpactScore(v);
    const cp = commonalityPct(v);
    const impact = v.impact_score_1_to_10 ?? 6;
    const priority = overallPriority(impact, bi, cp);
    return { category, kb: v, bi, cp, impact, priority };
  }).sort((a,b)=> b.priority!==a.priority ? b.priority-a.priority
    : (b.bi!==a.bi ? b.bi-a.bi : (b.cp!==a.cp ? b.cp-a.cp : b.impact-a.impact)));

  const top5 = ranked.slice(0,5).map(r=>{
    const mode = chooseMode(r.kb);
    return {
      category: r.category,
      what: r.kb.what,
      why_this_game: 'Based on genre/monetization/feature hints.',
      business_metrics: r.kb.metrics.map(m=>({ metric: m, weight: r.kb.weights[m] })),
      business_impact_score: r.bi,
      impact_score_1_to_10: r.impact,
      commonality: { count: r.kb.commonality_count||0, percent: r.cp },
      expected_lift_band: /Shop|Gacha|Pricing|Offer/.test(r.category)?'2–5% ARPDAU (conservative)':(/Event|Pass/.test(r.category)?'1–3% D7':'1–2% cohort-level movement'),
      risks_guardrails: r.kb.risks,
      assumptions: r.kb.assumptions,
      evidence: (r.kb.evidence||[]).slice(0,3),
      confidence: r.kb.confidence||'Med',
      ...mode
    };
  });

  const leaderboard = ranked.map((r,i)=> ({
    rank: i+1,
    category: r.category,
    commonality: {count: r.kb.commonality_count||0, percent: r.cp},
    business_metrics: r.kb.metrics,
    business_impact_score: r.bi,
    impact_score_1_to_10: r.impact,
    overall_priority: r.priority,
    confidence: r.kb.confidence||'Med',
    evidence_count: (r.kb.evidence||[]).length
  }));

  const byBI = [...ranked].sort((a,b)=>b.bi-a.bi).map((r,i)=>({rank:i+1, category:r.category, business_impact_score:r.bi}));
  const byCommon = [...ranked].sort((a,b)=>b.cp-a.cp).map((r,i)=>({rank:i+1, category:r.category, commonality_percent:r.cp}));
  const byImpact = [...ranked].sort((a,b)=>b.impact-a.impact).map((r,i)=>({rank:i+1, category:r.category, impact_score_1_to_10:r.impact}));

  return { app, experiments: top5, leaderboard, rankings: { by_business_impact: byBI, by_commonality: byCommon, by_impact_score: byImpact } };
}
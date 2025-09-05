// server/routes.ts
import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { experimentCompassResponseSchema } from "@shared/schema";

// If you initialize OpenAI elsewhere, remove this and inject it.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// google-play-scraper: use star import as namespace
import * as gplay from "google-play-scraper";

// Soft guard (don’t throw; we still want fallbacks)
if (
  !gplay ||
  typeof (gplay as any).default?.reviews !== "function" ||
  !(gplay as any).default?.sort
) {
  console.warn(
    "[Experiment Compass] google-play-scraper import looks unusual; ensure dependency is installed. Falling back if needed.",
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Unified Prompt
 * ────────────────────────────────────────────────────────────────────────── */
const SYSTEM_PROMPT_SPARROW_SHIFU_UNIFIED = `
You are Experiment Compass, an assistant for game PMs.

TAXONOMY:
CATEGORY=["GAMEPLAY","TECH","ART_CONTENT","BUG","MONETIZATION_ADS","ENGAGEMENT_SENTIMENT","FEATURE_REQUEST"]
SUBCATEGORY=["BALANCE","DIFFICULTY_SPIKE","FAIRNESS","PAY_TO_WIN","CRASH","LAG","LOAD_TIME","BATTERY_DRAIN","DEVICE_COMPAT","VISUALS","AUDIO","ANIMATION","THEME_QUALITY","CLIPPING","PROGRESSION_BLOCK","UI_GLITCH","SAVE_ISSUE","AD_FREQUENCY","AD_PLACEMENT","AD_REWARD_TIMING","IAP_PRESSURE","FUN","STICKINESS","REPLAY_VALUE","COMMUNITY","NEW_MODE","MULTIPLAYER","COSMETICS","QOL"]
SEVERITY=["LOW","MEDIUM","HIGH"]
MODE=["Sparrow","Shifu"]

GUIDELINES:
- Produce insights (problems) and experiments (solutions).
- severity=impact urgency; frequency_score∈[0,1] is normalized share-of-voice or implied prevalence.
- recommended_mode: Sparrow=fast iteration; Shifu=deeper, slower, higher confidence. Include a one-sentence mode_tagline.
- Link experiments to insights via linked_insight_ids.

IF source="DESCRIBE_EXPERIMENT":
- Do NOT use severity labels in the UI sense. Still fill the schema, but mark all insights as sentiment="NEUTRAL" and severity="MEDIUM" (internal only).
- Create exactly TWO hypotheses: H1 and H2.
  • Each hypothesis must include: title, statement, confidence∈[0,1], drivers (pick 1–2), metrics_affected.
  • For drivers, set ONLY from this closed list (UPPERCASE): ["ENGAGEMENT","RETENTION","MONETIZATION","UX","ECONOMY"].
  • Also include a free-form tags array with 1–5 short labels in natural language (e.g., "innovation in gameplay", "variety", "novelty").
- TAXONOMY RULES:
  • Choose CATEGORY only from: ["GAMEPLAY","TECH","ART_CONTENT","BUG","MONETIZATION_ADS","ENGAGEMENT_SENTIMENT","FEATURE_REQUEST"].
  • Choose SUBCATEGORY only from: ["BALANCE","DIFFICULTY_SPIKE","FAIRNESS","PAY_TO_WIN","CRASH","LAG","LOAD_TIME","BATTERY_DRAIN","DEVICE_COMPAT","VISUALS","AUDIO","ANIMATION","THEME_QUALITY","CLIPPING","PROGRESSION_BLOCK","UI_GLITCH","SAVE_ISSUE","AD_FREQUENCY","AD_PLACEMENT","AD_REWARD_TIMING","IAP_PRESSURE","FUN","STICKINESS","REPLAY_VALUE","COMMUNITY","NEW_MODE","MULTIPLAYER","COSMETICS","QOL"].
  • NEVER place driver labels (e.g., RETENTION, UX, MONETIZATION) in taxonomy.subcategories.
  • If unsure, use "QOL".
  • Set taxonomy.* as a deduplicated summary of the actual insight subcategories you output.
- Derive 2–3 short "assumption snippets" from the user's description. Return them in insights.evidence with {review_id:"desc_00X", source:"DESCRIPTION"}.
- Link the experiment's linked_insight_ids to those assumptions.
- Every experiment must include at least one linked_insight_id; if uncertain, link to the first assumption insight you created.
- Experiments must include:
  • clear goal_metric (+ window + direction),
  • ≥1 guardrail,
  • variants (control + 1–2 variants),
  • mode_tagline explaining Sparrow vs Shifu choice in one sentence,
  • alternative_mode with when_to_prefer + tradeoffs.
- No references to app store reviews.
- Output STRICT JSON per schema.

IF source="REVIEW_MINER":
- Evidence MUST be real review excerpts from the provided dataset; never fabricate.
- TARGETS (if provided in the user JSON): honor min_negative_insights, min_positive_insights, min_evidence_per_insight, min_experiments.
- Insights: return 8–12 when reviews support it (≥5 NEGATIVE and ≥5 POSITIVE); otherwise as many as supported. Never leave evidence empty; aim for 3–5 excerpts/insight.
- Experiments: return 3–5 minimum. At least one experiment must map to each of the top 3 NEGATIVE insights by severity*frequency.

- Always include at least one guardrail metric.
- Output STRICT JSON ONLY.

OUTPUT FORMAT:
{
  "version":"1.0",
  "source":"DESCRIBE_EXPERIMENT"|"REVIEW_MINER",
  "taxonomy":{"categories":string[],"subcategories":string[]},
  "insights":[{"id":string,"category":string,"subcategory":string,"severity":"LOW"|"MEDIUM"|"HIGH","frequency_score":number,"sentiment":"NEGATIVE"|"NEUTRAL"|"POSITIVE","summary":string,"evidence":[{"review_id":string,"excerpt":string,"rating"?:number,"lang"?:string}]}],
  "experiments":[{"id":string,"title":string,"experiment_type":string,"recommended_mode":"Sparrow"|"Shifu","mode_tagline":string,"goal_metric":{"name":string,"window"?:string,"direction"?: "UP"|"DOWN"|"NO_WORSE"},"guardrail_metrics":[{"name":string,"window"?:string,"direction"?: "UP"|"DOWN"|"NO_WORSE"}],"rationale":string,"confidence"?:number,"linked_insight_ids":string[],"implementation_notes"?:string[],"variants"?:[{"key":string,"description":string}],"alternative_mode"?:{"mode":"Sparrow"|"Shifu","when_to_prefer":string,"tradeoffs":string[]}}],
  "hypotheses"?:[{"id":string,"title":string,"statement":string,"confidence":number,"drivers":string[],"metrics_affected":string[]}],
  "summary":{"counts":{"insights_total":number,"positive":number,"negative":number,"by_severity":{"HIGH":number,"MEDIUM":number,"LOW":number}},"highlights":string[]},
  "share_payloads"?:{[id:string]:{"slack":{"title":string,"summary":string,"experiment_id":string,"blocks_markdown":string},"nova":{"experiment":any}}}
}

CONSTRAINTS:
- If user input is a PM description, set source="DESCRIBE_EXPERIMENT" and infer insights.
- If user input contains reviews, set source="REVIEW_MINER" and compute frequency_score from that set.
- Under ALL circumstances, return at least one experiment.
- No commentary outside JSON.
`;

/* ────────────────────────────────────────────────────────────────────────── *
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */
// --- Canonical driver mapping + fuzzy fallback ---
const DRIVER_CANON = ["ENGAGEMENT","RETENTION","MONETIZATION","UX","ECONOMY"] as const;
type DriverCanon = typeof DRIVER_CANON[number];

function guessDriver(s: string): DriverCanon {
  const t = s.toLowerCase();

  if (t.includes("monet") || t.includes("arpdau") || t.includes("revenue") || t.includes("ads") || t.includes("ad ")) {
    return "MONETIZATION";
  }
  if (t.includes("retent") || t.includes("churn") || t.includes("come back") || t.includes("return")) {
    return "RETENTION";
  }
  if (t.includes("econom") || t.includes("pricing") || t.includes("iap") || t.includes("store")) {
    return "ECONOMY";
  }
  if (t.includes("engage") || t.includes("session") || t.includes("playtime") || t.includes("stickiness")) {
    return "ENGAGEMENT";
  }
  // catch-alls like "innovation", "novelty", "variety", "repetitive", "gameplay experience"
  return "UX";
}

// ----- Allowed subcategories & mapping helpers -----
const SUBCATS = [
  "BALANCE","DIFFICULTY_SPIKE","FAIRNESS","PAY_TO_WIN",
  "CRASH","LAG","LOAD_TIME","BATTERY_DRAIN","DEVICE_COMPAT",
  "VISUALS","AUDIO","ANIMATION","THEME_QUALITY","CLIPPING",
  "PROGRESSION_BLOCK","UI_GLITCH","SAVE_ISSUE",
  "AD_FREQUENCY","AD_PLACEMENT","AD_REWARD_TIMING","IAP_PRESSURE",
  "FUN","STICKINESS","REPLAY_VALUE","COMMUNITY","NEW_MODE","MULTIPLAYER","COSMETICS","QOL",
] as const;
type Subcat = typeof SUBCATS[number];

const SUBCAT_SET = new Set<string>(SUBCATS);

const SUBCAT_TO_CATEGORY: Record<Subcat, "GAMEPLAY"|"TECH"|"ART_CONTENT"|"BUG"|"MONETIZATION_ADS"|"ENGAGEMENT_SENTIMENT"|"FEATURE_REQUEST"> = {
  BALANCE:"GAMEPLAY",DIFFICULTY_SPIKE:"GAMEPLAY",FAIRNESS:"GAMEPLAY",PAY_TO_WIN:"GAMEPLAY",
  CRASH:"BUG",LAG:"TECH",LOAD_TIME:"TECH",BATTERY_DRAIN:"TECH",DEVICE_COMPAT:"TECH",
  VISUALS:"ART_CONTENT",AUDIO:"ART_CONTENT",ANIMATION:"ART_CONTENT",THEME_QUALITY:"ART_CONTENT",CLIPPING:"ART_CONTENT",
  PROGRESSION_BLOCK:"GAMEPLAY",UI_GLITCH:"TECH",SAVE_ISSUE:"TECH",
  AD_FREQUENCY:"MONETIZATION_ADS",AD_PLACEMENT:"MONETIZATION_ADS",AD_REWARD_TIMING:"MONETIZATION_ADS",IAP_PRESSURE:"MONETIZATION_ADS",
  FUN:"ENGAGEMENT_SENTIMENT",STICKINESS:"ENGAGEMENT_SENTIMENT",REPLAY_VALUE:"ENGAGEMENT_SENTIMENT",COMMUNITY:"ENGAGEMENT_SENTIMENT",
  NEW_MODE:"FEATURE_REQUEST",MULTIPLAYER:"FEATURE_REQUEST",COSMETICS:"FEATURE_REQUEST",QOL:"ENGAGEMENT_SENTIMENT",
};

function coerceSubcat(input: unknown, hint?: string): Subcat {
  const s = String(input ?? "").trim().toLowerCase();
  if (SUBCAT_SET.has(s.toUpperCase())) return s.toUpperCase() as Subcat;

  const h = (hint || "").toLowerCase();

  // keyword heuristics
  if (s.includes("ad ") || s.includes("ads") || h.includes("ad ")) {
    if (s.includes("frequency")) return "AD_FREQUENCY";
    if (s.includes("placement")) return "AD_PLACEMENT";
    if (s.includes("reward")) return "AD_REWARD_TIMING";
    return "AD_FREQUENCY";
  }
  if (s.includes("retent") || s.includes("churn") || s.includes("sticky") || h.includes("retent")) return "STICKINESS";
  if (s.includes("ux") || s.includes("ui") || s.includes("onboarding") || s.includes("ftue") || s.includes("first time")) return "QOL";
  if (s.includes("crash")) return "CRASH";
  if (s.includes("lag") || s.includes("slow")) return "LAG";
  if (s.includes("load")) return "LOAD_TIME";
  if (s.includes("save")) return "SAVE_ISSUE";
  if (s.includes("compat")) return "DEVICE_COMPAT";
  if (s.includes("visual") || s.includes("art")) return "VISUALS";
  if (s.includes("audio") || s.includes("sound")) return "AUDIO";
  if (s.includes("anim")) return "ANIMATION";
  if (s.includes("theme")) return "THEME_QUALITY";
  if (s.includes("clip")) return "CLIPPING";
  if (s.includes("progress") || s.includes("block")) return "PROGRESSION_BLOCK";
  if (s.includes("diffi")) return "DIFFICULTY_SPIKE";
  if (s.includes("fair") || s.includes("p2w")) return "PAY_TO_WIN";
  if (s.includes("iap") || s.includes("price") || s.includes("pay")) return "IAP_PRESSURE";
  if (s.includes("fun") || s.includes("boring")) return "FUN";
  if (s.includes("replay") || s.includes("variety")) return "REPLAY_VALUE";
  if (s.includes("commu")) return "COMMUNITY";
  if (s.includes("mode") || s.includes("feature") || s.includes("innov")) return "NEW_MODE";
  if (s.includes("multiplayer")) return "MULTIPLAYER";
  if (s.includes("cosmetic") || s.includes("skin")) return "COSMETICS";

  return "QOL"; // safe default
}

function normalizeTaxonomyAndInsights(parsed: any) {
  if (!parsed) return parsed;

  // 1) Normalize each insight's subcategory; set/repair category from subcategory
  if (Array.isArray(parsed.insights)) {
    parsed.insights = parsed.insights.map((ins: any) => {
      const textHint = `${ins?.summary ?? ""} ${ins?.evidence?.map((e: any)=>e?.excerpt||"").join(" ")}`;
      const sub: Subcat = coerceSubcat(ins?.subcategory, textHint);
      const cat = SUBCAT_TO_CATEGORY[sub];
      return {
        ...ins,
        subcategory: sub,
        category: cat,
        // keep severity/sentiment as you already set for DESCRIBE
      };
    });
  }

  // 2) Build taxonomy from normalized insights (dedup)
  const subSet = new Set<string>();
  const catSet = new Set<string>();
  for (const ins of parsed?.insights || []) {
    if (ins?.subcategory) subSet.add(ins.subcategory);
    if (ins?.category) catSet.add(ins.category);
  }
  const subcategories = Array.from(subSet) as Subcat[];
  const categories = Array.from(catSet);

  parsed.taxonomy = {
    categories: categories.length ? categories : ["ENGAGEMENT_SENTIMENT"],
    subcategories: subcategories.length ? subcategories : ["QOL"],
  };

  return parsed;
}

function normalizeDescribeOutput(parsed: any) {
  if (!parsed) return parsed;

  // normalize hypotheses
  if (Array.isArray(parsed.hypotheses)) {
    parsed.hypotheses = parsed.hypotheses.map((h: any) => {
      const raw = h?.drivers;
      // accept array, comma string, or missing
      let phrases: string[] =
        Array.isArray(raw) ? raw.map(String) :
        typeof raw === "string" ? raw.split(",") :
        [];

      // keep original phrases as tags (dedup, trimmed)
      const tagsSet = new Set<string>([...(h?.tags || [])]);
      for (const p of phrases) {
        const tag = String(p || "").trim();
        if (tag) tagsSet.add(tag);
      }
      const tags = Array.from(tagsSet).slice(0, 8);

      // map to canonical drivers
      const mapped = phrases.map(guessDriver);
      const uniqDrivers = Array.from(new Set<DriverCanon>(mapped));

      return {
        ...h,
        tags,
        drivers: uniqDrivers.length ? uniqDrivers : (["UX"] as DriverCanon[]),
      };
    });
  }

  // NEW: normalize taxonomy + insight categories/subcategories
  parsed = normalizeTaxonomyAndInsights(parsed);

  // guarantee experiments.linked_insight_ids non-empty
  const firstInsightId = parsed?.insights?.[0]?.id || "assump_1";
  if (Array.isArray(parsed.experiments)) {
    parsed.experiments = parsed.experiments.map((e: any) => ({
      ...e,
      linked_insight_ids:
        Array.isArray(e?.linked_insight_ids) && e.linked_insight_ids.length
          ? e.linked_insight_ids
          : [firstInsightId],
    }));
  }

  return parsed;
}
type PlayReview = {
  reviewId: string;
  text: string;
  score?: number;
  thumbsUp?: number;
  userName?: string;
  date?: string;
  lang?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseAppId(input: string): string {
  if (!input) return "";
  const m = input.match(/[?&]id=([a-zA-Z0-9._]+)/);
  if (m?.[1]) return m[1];
  return input.trim();
}

function mapReview(r: any, i = 0): PlayReview {
  return {
    reviewId: r.reviewId || r.id || `rev_${i}`,
    text: r.text || r.content || r.body || "",
    score:
      typeof r.score === "number"
        ? r.score
        : typeof r.rating === "number"
          ? r.rating
          : undefined,
    thumbsUp: r.thumbsUp || r.thumbsUpCount || r.helpful || r.likeCount || 0,
    userName: r.userName || r.user || r.author,
    date: r.date
      ? new Date(r.date).toISOString()
      : r.at
        ? new Date(r.at).toISOString()
        : undefined,
    lang: r.lang || r.language || "en",
  };
}

function dedupeById<T extends { reviewId?: string }>(arr: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of arr) {
    const id = (r.reviewId ?? "").toString();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

type ReviewLite = {
  id?: string; reviewId?: string; text?: string;
  rating?: number; score?: number; lang?: string;
  thumbsUp?: number; date?: string;
};

function toNum(x: any): number | undefined {
  return typeof x === "number" && isFinite(x) ? x : undefined;
}

function toISO(d?: string | Date) {
  if (!d) return undefined;
  const t = typeof d === "string" ? Date.parse(d) : +d;
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
}

function norm01(x: number, min: number, max: number) {
  if (!isFinite(x) || !isFinite(min) || !isFinite(max) || max <= min) return 0;
  const v = (x - min) / (max - min);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Sample up to 20 low-star (≤2) and 20 high-star (≥4) reviews.
 * - Ranks each bucket by helpfulness (70%) + recency (30%).
 * - Trims text to reduce tokens.
 * - If a bucket has fewer than 20, it returns what's available (no backfill).
 */
function sample20x20(
  raw: ReviewLite[],
  perBucket = 20,
  trimChars = 400
) {
  const items = (raw || []).map((r, i) => {
    const id = r.reviewId || r.id || `rev_${i}`;
    const text = String(r.text || "").replace(/\s+/g, " ").trim();
    const rating = toNum(r.rating) ?? toNum((r as any).score);
    const thumbs = toNum(r.thumbsUp) ?? 0;
    const ts = r.date ? Date.parse(r.date) || 0 : 0;
    return { id, text, rating, lang: r.lang || "en", thumbs, ts };
  }).filter(r => r.text.length > 0 && r.rating !== undefined);

  const lows  = items.filter(r => (r.rating as number) <= 2);
  const highs = items.filter(r => (r.rating as number) >= 4);

  // score within each set
  const scoreRank = (arr: typeof items) => {
    if (!arr.length) return arr;
    const maxThumbs = arr.reduce((m, r) => Math.max(m, r.thumbs), 0);
    const minTs = arr.reduce((m, r) => Math.min(m, r.ts), arr[0].ts);
    const maxTs = arr.reduce((m, r) => Math.max(m, r.ts), arr[0].ts);
    return arr
      .map(r => {
        const sHelpful = norm01(r.thumbs, 0, Math.max(1, maxThumbs));
        const sRecent  = norm01(r.ts,    minTs, maxTs || (minTs + 1));
        return { ...r, _score: 0.7 * sHelpful + 0.3 * sRecent };
      })
      .sort((a, b) => (b._score - a._score));
  };

  const pick = (arr: typeof items) =>
    scoreRank(arr).slice(0, perBucket).map(r => ({
      id: r.id,
      text: r.text.slice(0, trimChars),
      rating: r.rating,
      lang: r.lang,
      thumbsUp: r.thumbs,
      date_iso: toISO(r.ts ? new Date(r.ts) : undefined),
    }));

  return [...pick(lows), ...pick(highs)];
}

function filterByRecency<T extends { date?: string; date_iso?: string }>(arr: T[], days?: number) {
  if (!days || !Number.isFinite(days) || days <= 0) return arr;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return (arr || []).filter(r => {
    const iso = (r as any).date_iso || (r as any).date;
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(t) && t >= cutoff;
  });
}

function filterByOlderThan<T extends { date?: string; date_iso?: string }>(arr: T[], days?: number) {
  if (!days || !Number.isFinite(days) || days <= 0) return arr;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return (arr || []).filter(r => {
    const iso = (r as any).date_iso || (r as any).date;
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(t) && t < cutoff;
  });
}

function reconcileEvidence(parsed: any, catalog: Record<string, any>) {
  if (!Array.isArray(parsed?.insights)) return;
  for (const ins of parsed.insights) {
    if (!Array.isArray(ins.evidence)) ins.evidence = [];
    // attach meta or try to recover by text match
    ins.evidence = ins.evidence.map((ev: any) => {
      const hit = catalog[ev.review_id];
      if (hit) {
        return {
          ...ev,
          rating: ev.rating ?? hit.rating,
          lang: ev.lang ?? hit.lang,
          date_iso: ev.date_iso ?? hit.date_iso,
        };
      }
      // Try crude text match to recover a missing id
      const key = String(ev.excerpt || "").toLowerCase().slice(0, 60);
      const found = key
        ? Object.values(catalog).find((r: any) => String(r.text).toLowerCase().includes(key))
        : undefined;
      if (found) {
        return {
          ...ev,
          review_id: found.id,
          rating: ev.rating ?? found.rating,
          lang: ev.lang ?? found.lang,
          date_iso: ev.date_iso ?? found.date_iso,
        };
      }
      return ev; // leave as-is; UI will still show excerpt
    });
    // ensure not empty
    if (ins.evidence.length === 0) {
      const any = Object.values(catalog).slice(0, 2).map((r: any) => ({
        review_id: r.id,
        excerpt: r.text.slice(0, 200),
        rating: r.rating,
        lang: r.lang,
        date_iso: r.date_iso,
      }));
      ins.evidence = any;
    }
  }
}

async function fetchPaginated(
  appId: string,
  sort: any,
  pages = 6,
  lang = "en",
  country = "us",
) {
  const all: PlayReview[] = [];
  let token: string | undefined;
  for (let p = 0; p < pages; p++) {
    const resp: any = await (gplay as any).default.reviews({
      appId,
      sort,
      lang,
      country,
      paginate: true,
      nextPaginationToken: token,
      num: 100,
    });
    const data: any[] = resp?.data || resp?.results || [];
    data.forEach((d, idx) => all.push(mapReview(d, idx)));
    token = resp?.nextPaginationToken || resp?.nextPageToken || undefined;
    if (!token) break;
    await sleep(250);
  }
  return all;
}

async function fetchLegacy(
  appId: string,
  sort: any,
  num = 200,
  lang = "en",
  country = "us",
) {
  const resp: any = await (gplay as any).default.reviews({
    appId,
    sort,
    num,
    lang,
    country,
  });
  const data: any[] = resp?.data || resp?.results || [];
  return data.map((d, i) => mapReview(d, i));
}

async function fetchMultiCountry(appId: string, pages = 2) {
  const countries = [
    "gb",
    "in",
    "br",
    "de",
    "id",
    "mx",
    "jp",
    "fr",
    "es",
    "tr",
  ] as const;
  const out: PlayReview[] = [];
  const sort = (gplay as any)?.default?.sort || {};
  const S_HELP = sort.HELPFULNESS ?? sort.RATING ?? sort.NEWEST;
  const S_NEW = sort.NEWEST ?? sort.RATING ?? S_HELP;
  for (const c of countries) {
    try {
      const helpful = await fetchPaginated(appId, S_HELP, pages, "en", c);
      const newest = await fetchPaginated(appId, S_NEW, pages, "en", c);
      out.push(...helpful, ...newest);
      await sleep(200);
      if (out.length >= 500) break;
    } catch (e) {
      console.warn(
        `[reviews] ${appId} country=${c} failed:`,
        (e as Error)?.message,
      );
    }
  }
  return out;
}

// Low-data heuristic insight miner
type HeuReview = { id: string; text: string; rating?: number; lang?: string };
function mineHeuristicInsights(reviews: HeuReview[]) {
  if (!reviews.length) return [] as any[];
  const lower = reviews.map((r) => ({ ...r, t: (r.text || "").toLowerCase() }));
  const mk = (
    id: string,
    category: string,
    sub: string,
    sev: "LOW" | "MEDIUM" | "HIGH",
    sent: "NEGATIVE" | "POSITIVE",
    pred: (t: string) => boolean,
    summary: string,
  ) => {
    const hits = lower.filter((r) => pred(r.t));
    if (!hits.length) return null;
    return {
      id,
      category,
      subcategory: sub,
      severity: sev,
      frequency_score: Math.min(1, hits.length / Math.max(10, reviews.length)),
      sentiment: sent,
      summary,
      evidence: hits
        .slice(0, 3)
        .map((h) => ({
          review_id: h.id,
          excerpt: h.text.slice(0, 220),
          rating: h.rating,
          lang: h.lang || "en",
        })),
    };
  };
  return [
    mk(
      "ads_freq",
      "MONETIZATION_ADS",
      "AD_FREQUENCY",
      "HIGH",
      "NEGATIVE",
      (t) => t.includes("too many ad") || t.includes("ads every"),
      "Excessive ad frequency appears in feedback.",
    ),
    mk(
      "perf",
      "TECH",
      "LOAD_TIME",
      "MEDIUM",
      "NEGATIVE",
      (t) => t.includes("load") || t.includes("slow") || t.includes("lag"),
      "Performance issues (slow/lag) mentioned.",
    ),
    mk(
      "fun",
      "ENGAGEMENT_SENTIMENT",
      "FUN",
      "LOW",
      "POSITIVE",
      (t) => t.includes("fun") || t.includes("love") || t.includes("great"),
      "Players say the game is fun.",
    ),
  ].filter(Boolean) as any[];
}

function fallbackInsight() {
  return {
    id: "no_reviews",
    category: "ENGAGEMENT_SENTIMENT",
    subcategory: "COMMUNITY",
    severity: "LOW",
    frequency_score: 0,
    sentiment: "NEUTRAL",
    summary: "No public reviews available; collect in-app feedback first.",
    evidence: [
      {
        review_id: "none",
        excerpt: "No Play Store reviews found for this app/region.",
        lang: "en",
        date_iso: undefined,
      },
    ],
  };
}
function fallbackExperiment() {
  return {
    id: "exp_inapp_feedback",
    title: "Enable In-App Feedback & Quick Survey",
    experiment_type: "Feedback / QOL",
    recommended_mode: "Sparrow" as const,
    mode_tagline: "Fast to implement; optimizes for quick learning.",
    goal_metric: {
      name: "Feedback submissions",
      window: "W1",
      direction: "UP" as const,
    },
    guardrail_metrics: [
      { name: "D1 retention", window: "W1", direction: "NO_WORSE" as const },
      { name: "Uninstall rate", window: "W1", direction: "NO_WORSE" as const },
    ],
    rationale:
      "With no external reviews, in-app feedback provides the fastest path to identify issues.",
    confidence: 0.6,
    linked_insight_ids: ["no_reviews"],
    variants: [
      { key: "control", description: "No in-app survey" },
      {
        key: "variant_1",
        description: "Lightweight NPS + open-text after session end",
      },
    ],
  };
}
function synthesizeExperimentFromInsight(i: any) {
  const title = i?.subcategory?.toLowerCase?.().includes("ad_frequency")
    ? "Reduce Ad Frequency"
    : i?.subcategory?.toLowerCase?.().includes("ad_placement")
      ? "Fix Intrusive Ad Placement"
      : `Address ${i?.subcategory || i?.category || "Key Issue"}`;
  return {
    id: `synth_${i?.id || Math.random().toString(36).slice(2)}`,
    title,
    experiment_type:
      i?.category === "MONETIZATION_ADS" ? "Ads Tuning" : "Gameplay/QoL",
    recommended_mode: i?.category === "TECH" ? "Shifu" : "Sparrow",
    mode_tagline: "Chosen to balance iteration speed with guardrails.",
    goal_metric: {
      name: "User Retention",
      window: "7 days",
      direction: "UP" as const,
    },
    guardrail_metrics: [
      { name: "Ad Revenue", window: "7 days", direction: "NO_WORSE" as const },
    ],
    rationale: `Synthesized from insight: ${i?.summary || "top user issue"}`,
    confidence: 0.6,
    linked_insight_ids: i?.id ? [i.id] : [],
    variants: [
      { key: "control", description: "Current configuration" },
      {
        key: "variant_1",
        description: "Reasonable improvement based on insight",
      },
    ],
  };
}
function summarizeCounts(insights: any[]) {
  const by = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let pos = 0,
    neg = 0;
  for (const i of insights) {
    if (i.severity && by[i.severity as "HIGH" | "MEDIUM" | "LOW"] !== undefined)
      by[i.severity as "HIGH" | "MEDIUM" | "LOW"]++;
    if (i.sentiment === "POSITIVE") pos++;
    if (i.sentiment === "NEGATIVE") neg++;
  }
  return {
    insights_total: insights.length,
    positive: pos,
    negative: neg,
    by_severity: by,
  };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Routes
 * ────────────────────────────────────────────────────────────────────────── */
export function registerRoutes(app: Express) {
  // 1) Review fetcher (multi-tier, deduped)
  app.post("/api/reviews/fetch", async (req: Request, res: Response) => {
    try {
      const raw = String(req.body?.playStoreUrl || "");
      const appId = parseAppId(raw);
      if (!appId)
        return res
          .status(400)
          .json({ error: "Missing Play Store app id or URL" });

      console.log(`[reviews] Fetching for ${appId}…`);

      const sort = (gplay as any)?.default?.sort || {};
      const S_HELP = sort.HELPFULNESS ?? sort.RATING ?? sort.NEWEST;
      const S_NEW = sort.NEWEST ?? sort.RATING ?? S_HELP;

      let all: PlayReview[] = [];

      // Tier 1: US/en paginated
      try {
        const [helpful, newest] = await Promise.all([
          fetchPaginated(appId, S_HELP, 6, "en", "us"),
          fetchPaginated(appId, S_NEW, 6, "en", "us"),
        ]);
        all = dedupeById([...helpful, ...newest]);
        console.log(`[reviews] Tier1 US/en: ${all.length}`);
      } catch (e) {
        console.warn(`[reviews] Tier1 failed: ${(e as Error)?.message}`);
      }

      // Tier 2: US/en legacy (num)
      if (all.length < 20) {
        try {
          const [legacyA, legacyB] = await Promise.all([
            fetchLegacy(appId, S_NEW, 200, "en", "us"),
            fetchLegacy(appId, S_HELP, 200, "en", "us"),
          ]);
          all = dedupeById([...all, ...legacyA, ...legacyB]);
          console.log(`[reviews] Tier2 US/en legacy: ${all.length}`);
        } catch (e) {
          console.warn(`[reviews] Tier2 failed: ${(e as Error)?.message}`);
        }
      }

      // Tier 3: Multi-country sweep
      if (all.length < 50) {
        try {
          const intl = await fetchMultiCountry(appId, 2);
          all = dedupeById([...all, ...intl]);
          console.log(`[reviews] Tier3 multi-country: ${all.length}`);
        } catch (e) {
          console.warn(`[reviews] Tier3 failed: ${(e as Error)?.message}`);
        }
      }

      // Tier 4: Wildcard (no lang/country)
      if (all.length < 50) {
        try {
          const anyA = await fetchPaginated(
            appId,
            S_HELP,
            3,
            undefined as any,
            undefined as any,
          );
          const anyB = await fetchPaginated(
            appId,
            S_NEW,
            3,
            undefined as any,
            undefined as any,
          );
          all = dedupeById([...all, ...anyA, ...anyB]);
          console.log(`[reviews] Tier4 wildcard: ${all.length}`);
        } catch (e) {
          console.warn(`[reviews] Tier4 failed: ${(e as Error)?.message}`);
        }
      }

      console.log(`[reviews] Final merged reviews: ${all.length}`);
      return res.json({
        appId,
        total: all.length,
        allReviews: all.map((r) => ({
          reviewId: r.reviewId,
          text: r.text,
          score: r.score,
          lang: r.lang ?? "en",
          thumbsUp: r.thumbsUp || 0,
          date: r.date,
        })),
      });
    } catch (err) {
      console.error("Review fetching error:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch reviews. Please try again." });
    }
  });

  // 2) Unified recommend endpoint
  app.post(
    "/api/experiments/recommend",
    async (req: Request, res: Response) => {
      try {
        const { description, reviews, recency_days, older_than_days } = (req.body || {}) as {
          description?: string;
          reviews?: Array<{
            id?: string;
            reviewId?: string;
            text: string;
            rating?: number;
            lang?: string;
            thumbsUp?: number;
            date?: string;
          }>;
          recency_days?: number;
          older_than_days?: number;
        };

        const source = Array.isArray(reviews)
          ? "REVIEW_MINER"
          : "DESCRIBE_EXPERIMENT";
        const targets = {
          min_negative_insights: 5,
          min_positive_insights: 5,
          min_evidence_per_insight: 3,
          min_experiments: 3,
        };

        // Apply recency filtering before sampling
        let incoming = reviews || [];
        incoming = incoming.map(r => ({ ...r, date_iso: r.date ? new Date(r.date).toISOString() : undefined }));
        const recDays = Number(recency_days) || undefined;
        const olderDays = Number(older_than_days) || undefined;
        const filtered = source === "REVIEW_MINER"
          ? (olderDays ? filterByOlderThan(incoming, olderDays) : filterByRecency(incoming, recDays))
          : undefined;
        const compacted = source === "REVIEW_MINER" ? sample20x20(filtered || [], 20, 400) : undefined;

        // Build reviews catalog from compacted reviews
        const reviewsCatalog: Record<string, any> = {};
        if (compacted) {
          for (const r of compacted) {
            reviewsCatalog[r.id] = {
              id: r.id,
              text: r.text,
              rating: r.rating,
              lang: r.lang,
              thumbsUp: r.thumbsUp,
              date_iso: r.date_iso,
            };
          }
        }

        const userPayload =
          source === "REVIEW_MINER"
            ? JSON.stringify({ source, targets, filters: { recency_days: recDays, older_than_days: olderDays }, reviews: compacted })
            : (description ?? "");

        // the newest OpenAI model is "gpt-4o" which was released August 7, 2025. do not change this unless explicitly requested by the user
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT_SPARROW_SHIFU_UNIFIED },
            { role: "user", content: userPayload },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });

        let parsed: any = {};
        try {
          parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
        } catch {
          parsed = {};
        }

        const countBy = (sent: "NEGATIVE" | "POSITIVE") =>
          Array.isArray(parsed?.insights)
            ? parsed.insights.filter((i: any) => i.sentiment === sent).length
            : 0;

        // Retry once with stricter targets if under-delivering
        if (
          source === "REVIEW_MINER" &&
          (countBy("NEGATIVE") < 5 ||
            countBy("POSITIVE") < 5 ||
            (Array.isArray(parsed.experiments)
              ? parsed.experiments.length
              : 0) < 3)
        ) {
          console.log(
            `Retrying with stricter targets; have NEG=${countBy("NEGATIVE")} POS=${countBy("POSITIVE")} EXP=${parsed.experiments?.length || 0}`,
          );
          const completion2 = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: SYSTEM_PROMPT_SPARROW_SHIFU_UNIFIED },
              {
                role: "user",
                content: JSON.stringify({
                  source,
                  reviews: compacted,
                  targets: {
                    min_negative_insights: 5,
                    min_positive_insights: 5,
                    min_evidence_per_insight: 4,
                    min_experiments: 4,
                  },
                }),
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          });
          const text2 = completion2.choices[0]?.message?.content;
          if (text2) {
            try {
              parsed = JSON.parse(text2);
            } catch {
              /* keep original parsed */
            }
          }
        }

        if (!Array.isArray(parsed.insights)) parsed.insights = [];
        if (!Array.isArray(parsed.experiments)) parsed.experiments = [];

        // Heuristic top-up if model still under-fills and we have reviews
        if (
          source === "REVIEW_MINER" &&
          parsed.insights.length < 5 &&
          (compacted?.length || 0) > 0
        ) {
          const mined = mineHeuristicInsights(
            compacted!.map((r) => ({ 
              id: r.id, 
              text: r.text, 
              rating: r.rating, 
              lang: r.lang 
            })),
          );
          const existing = new Set(parsed.insights.map((i: any) => i.id));
          for (const m of mined)
            if (!existing.has(m.id)) parsed.insights.push(m);
        }

        // Ensure ≥3 experiments (synthesize from top negative insights)
        if (parsed.experiments.length < 3) {
          const insights = Array.isArray(parsed.insights)
            ? parsed.insights
            : [];
          const negTop = insights
            .filter((i: any) => i.sentiment === "NEGATIVE")
            .sort(
              (a: any, b: any) =>
                (b.frequency_score || 0) - (a.frequency_score || 0),
            )
            .slice(0, 3);
          for (const i of negTop) {
            parsed.experiments.push(synthesizeExperimentFromInsight(i));
            if (parsed.experiments.length >= 3) break;
          }
        }

        // Reconcile evidence with the catalog
        reconcileEvidence(parsed, reviewsCatalog);

        // Include catalog in the response body so UI can render meta
        parsed.reviews_catalog = reviewsCatalog;

        // Absolute guarantees
        if (parsed.insights.length === 0) parsed.insights = [fallbackInsight()];
        if (parsed.experiments.length === 0)
          parsed.experiments = [fallbackExperiment()];

        // We already know what this request WAS (reviews vs description)
        const expectedSource = reviews ? "REVIEW_MINER" : "DESCRIBE_EXPERIMENT";

        // Force the expected source (model sometimes returns the wrong one)
        parsed.source = expectedSource;

        // Always normalize Describe flow, regardless of what the model set
        if (expectedSource === "DESCRIBE_EXPERIMENT") {
          parsed = normalizeDescribeOutput(parsed);
        }

        parsed.version = parsed.version || "1.0";
        parsed.summary = parsed.summary || {
          counts: summarizeCounts(parsed.insights),
          highlights: [],
        };
        parsed.taxonomy = parsed.taxonomy || {
          categories: Array.from(
            new Set(parsed.insights.map((i: any) => i.category)),
          ),
          subcategories: Array.from(
            new Set(parsed.insights.map((i: any) => i.subcategory)),
          ),
        };

        const validated = experimentCompassResponseSchema.parse(parsed);
        return res.json(validated);
      } catch (error: any) {
        console.error("Experiment Compass error:", error);
        if (error?.name === "ZodError") {
          return res
            .status(400)
            .json({ error: "Invalid response shape", details: error.errors });
        }
        if (error instanceof SyntaxError) {
          return res
            .status(500)
            .json({ error: "Failed to parse AI response. Please try again." });
        }
        return res
          .status(500)
          .json({ error: "Failed to generate experiment recommendation" });
      }
    },
  );

  // LiveOps helper functions
  function analyzeFeatures(description: string): string[] {
    try {
      const featureRegex = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/feature_regex.json'), 'utf8'));
      const detected: string[] = [];
      const lowerDesc = description.toLowerCase();
      
      for (const [feature, config] of Object.entries(featureRegex.features)) {
        const patterns = (config as any).patterns;
        if (patterns.some((pattern: string) => new RegExp(pattern, 'i').test(lowerDesc))) {
          detected.push(feature);
        }
      }
      
      return detected;
    } catch (error) {
      console.error("Error analyzing features:", error);
      return [];
    }
  }

  function analyzeMonetization(description: string): string {
    try {
      const featureRegex = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/feature_regex.json'), 'utf8'));
      const lowerDesc = description.toLowerCase();
      
      for (const [type, patterns] of Object.entries(featureRegex.monetization_indicators)) {
        if ((patterns as string[]).some(pattern => new RegExp(pattern, 'i').test(lowerDesc))) {
          return type;
        }
      }
      
      return 'freemium'; // default
    } catch (error) {
      console.error("Error analyzing monetization:", error);
      return 'freemium';
    }
  }

  function detectGenre(playStoreGenre: string, description: string): string {
    try {
      const genreAliases = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/genre_aliases.json'), 'utf8'));
      const lowerDesc = description.toLowerCase();
      const lowerGenre = playStoreGenre.toLowerCase();
      
      for (const [genre, patterns] of Object.entries(genreAliases.genre_mapping)) {
        if ((patterns as string[]).some(pattern => 
          new RegExp(pattern, 'i').test(lowerDesc) || new RegExp(pattern, 'i').test(lowerGenre)
        )) {
          return genre;
        }
      }
      
      return 'casual'; // default
    } catch (error) {
      console.error("Error detecting genre:", error);
      return 'casual';
    }
  }

  function generateLiveOpsRecommendationsRefinery(appAnalysis: any): any {
    try {
      // Load the knowledge base and scoring config
      const liveopsKB = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/liveops_kb.json'), 'utf8'));
      const featureRegex = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/feature_regex.json'), 'utf8'));
      const scoringConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/scoring_config.json'), 'utf8'));
      
      const MAX_METRIC_SUM = scoringConfig.constants?.MAX_METRIC_SUM || 5.95;
      const DEN = scoringConfig.constants?.STUDIO_DENOMINATOR || 55;
      
      function businessImpactScore(kb: any): number {
        const sum = (kb.metrics||[]).reduce((acc: number, m: string)=> acc + (kb.weights?.[m]||0), 0);
        return Math.round(100 * (sum / MAX_METRIC_SUM));
      }
      
      function commonalityPct(kb: any): number {
        const n = kb.commonality_count || 0;
        return +( (100 * n) / DEN ).toFixed(1);
      }
      
      function overallPriority(impact1to10: number, bi: number, cpct: number){
        const s = 0.40*(impact1to10*10) + 0.35*bi + 0.25*cpct;
        return +(s.toFixed(1));
      }
      
      function chooseMode(kb: any){
        const mode = kb.recommended_mode || 'Shifu';
        const why = mode==='Sparrow' ? 'Faster allocation, less traffic wasted on losers.' : 'Rigor and stakeholder‑friendly reporting.';
        return { mode, allocation_method: kb.recommended_allocation, stat_output: kb.stat_output, why_this_mode: why };
      }
      
      const cats = liveopsKB.categories;
      const ranked = Object.entries(cats).map(([category, v]: [string, any])=>{
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
          business_metrics: r.kb.metrics.map((m: string)=>({ metric: m, weight: r.kb.weights[m] })),
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

      return { app: appAnalysis, experiments: top5, leaderboard, rankings: { by_business_impact: byBI, by_commonality: byCommon, by_impact_score: byImpact } };
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return {
        app: appAnalysis,
        experiments: [],
        leaderboard: [],
        rankings: { by_business_impact: [], by_commonality: [], by_impact_score: [] }
      };
    }
  }

  // 3) LiveOps Refinery endpoints
  app.post("/api/liveops/analyze", async (req: Request, res: Response) => {
    try {
      const { playStoreUrl } = req.body;
      
      if (!playStoreUrl) {
        return res.status(400).json({ error: "Play Store URL is required" });
      }

      // Extract app ID from URL
      const appId = parseAppId(playStoreUrl);
      if (!appId) {
        return res.status(400).json({ error: "Invalid Play Store URL" });
      }

      // Fetch app details from Play Store
      const gplayDetails = await (gplay as any).default.app({ appId });
      
      const analysis = {
        appId,
        title: gplayDetails.title || "Unknown App",
        developer: gplayDetails.developer || "Unknown Developer",
        genre: gplayDetails.genre || "Unknown",
        description: gplayDetails.description || "",
        screenshots: gplayDetails.screenshots || [],
        features: analyzeFeatures(gplayDetails.description || ""),
        monetization: analyzeMonetization(gplayDetails.description || ""),
        detectedGenre: detectGenre(gplayDetails.genre || "", gplayDetails.description || ""),
        ratings: {
          average: gplayDetails.score || 0,
          count: gplayDetails.reviews || 0
        }
      };

      return res.json(analysis);
    } catch (error) {
      console.error("LiveOps analysis error:", error);
      return res.status(500).json({ error: "Failed to analyze app" });
    }
  });

  app.post("/api/liveops/recommend", async (req: Request, res: Response) => {
    try {
      const { appAnalysis } = req.body;
      
      if (!appAnalysis) {
        return res.status(400).json({ error: "App analysis is required" });
      }

      const refineryResult = generateLiveOpsRecommendationsRefinery(appAnalysis);
      
      return res.json({
        ...refineryResult,
        metadata: {
          analysisDate: new Date().toISOString(),
          totalRecommendations: refineryResult.experiments.length,
          totalCategories: refineryResult.leaderboard.length,
          scoringMethod: "Business-Impact (0-100) + Commonality (n/55) + Impact (1-10) + Overall Priority"
        }
      });
    } catch (error) {
      console.error("LiveOps recommendation error:", error);
      return res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });
}

// Backwards-compatible alias: some files import `registerSwiftSiteRoutes`
export const registerSwiftSiteRoutes = registerRoutes;

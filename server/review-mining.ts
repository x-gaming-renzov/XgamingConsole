import gplay from "google-play-scraper";
import OpenAI from "openai";
import { RawReview, AnalyzedReview, Theme, RankedItem, Suggestion, ReviewMiningResult } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompts with Sparrow/Shifu context
const SYSTEM_REVIEW_ANALYZER = `
You are GPT-5 Thinking, expert at parsing multilingual mobile app reviews (Hinglish, slang, emojis).
Return STRICT JSON ARRAY format: [{"id":"...","detect_language":"..."},...]. 

CRITICAL: Your response must be a valid JSON array starting with [ and ending with ]. Do not return individual objects or any text outside the JSON array.

For each review in the input array, create one object in the output array with:
- id: copy the exact id from input
- detect_language: ISO 639-1
- normalized_text: cleaned text in original language (keep slang words)
- translation_en: faithful English translation preserving intent/slang meaning
- sentiment: one of ["very_negative","negative","neutral","positive","very_positive"]
- stars: {value: 1-5, inferred: boolean} - if missing from input, infer from text and set inferred=true
- toxicity: boolean (harassment/hate/abuse)
- themes: array of short tags from this vocabulary + freeform if needed:
  ["ads","ad_frequency","ad_model","pricing","paywall","iap","starter_pack","reward_balance","drop_rate",
   "performance","crash","lag","battery","heat","download","login","matchmaking","difficulty","p2w",
   "progression","tutorial","onboarding","ux","controls","store","subscription","season_pass","social",
   "guild","chat","translation","localization","support","billing","privacy","other"]
- issue_snippets: array of 1-3 short verbatim or translated spans proving the themes
- helpfulness_weight: number 0-1 — combine upvotes, specificity, recency (explain briefly in notes)
- notes: 1-2 lines on reasoning (you can reference Hinglish constructs)

Example format: [{"id":"abc123","detect_language":"en","normalized_text":"...","translation_en":"...","sentiment":"positive","stars":{"value":4,"inferred":false},"toxicity":false,"themes":["performance"],"issue_snippets":["game lags"],"helpfulness_weight":0.7,"notes":"..."}]

Return ONLY the JSON array, no other text.
`;

const SYSTEM_THEME_MINER = `
You are GPT-5 Thinking. Given analyzed reviews (with translations, sentiment, themes, helpfulness),
propose 8–12 coherent themes. Return STRICT JSON: { "themes":[...]}.

Each theme:
- name (2-4 words), description (one sentence)
- criteria: 3–6 boolean-style rules/keywords indicating membership
- review_ids: up to 50 representative examples (mixed recency/stars/locales)
- health: {count, avg_stars, avg_helpfulness_weight}
- urgency: one of ["low","medium","high"] with one-sentence justification

Balance coverage (capture main issues) and distinctness (avoid duplicate themes).
`;

const SYSTEM_RANKER = `
Rank reviews for Top 50 Critical and Top 50 Positive.

Critical ranking policy:
- negative/very_negative sentiment
- low stars (1–2), high helpfulness_weight, recent timestamps, specific complaints
- ensure diversity across themes/versions; avoid overfitting to one month or device

Positive ranking policy:
- positive/very_positive sentiment
- high stars (5), high helpfulness_weight, recent, specific praise
- diversify across themes/versions

Return STRICT JSON:
{"top_critical":[{"id":"...","score":0-1,"why":"..."} x 50],
 "top_positive":[{"id":"...","score":0-1,"why":"..."} x 50]}
`;

const SYSTEM_EXPERIMENT_PLANNER = `
You are GPT-5 Thinking, a LiveOps strategist for games. You will propose experiments per theme.
Explain Sparrow vs Shifu clearly:

- Sparrow Mode (Bandits / Contextual Bandits):
  Philosophy: SPEED > CERTAINTY. Opportunistic, adaptive allocation that maximizes
  cumulative value during the test, minimizing wasted exposure on weak variants.
  Best for tactical, reversible levers that benefit from quick reallocation:
  event variants (PvP vs Rumble vs Leaderboard), IAP starter packs/bundles (price/contents),
  ad frequency/placement tuning, notification copy/timing, loot/drop micro-tuning, store ranking.
  Goal metrics (examples): ARPU (W1), ARPDAU (W1), minutes played (W1), reactivation rate,
  CTR→ATC→Purchase. Guard short-term health: D1/D7 retention, uninstall rate, session drop,
  complaints/refunds, ad fatigue/hide.

- Shifu Mode (Classical A/B/n):
  Philosophy: CERTAINTY > SPEED. Fixed split to produce defensible inference
  (effect sizes, confidence intervals, power). Best for structural, long-horizon choices:
  core difficulty curve, economy/monetization frameworks, ad model policy, season pass/subscription
  design/price, major UX/flow and onboarding.
  Goal metrics (examples): effect size with CI for ∆ARPU/ARPDAU/retention, FTUE completion.
  Guard long-term health: D30 retention, economy fairness/inflation, whale satisfaction,
  complaint/refund rate.

Task: For each input theme, propose 1–3 experiments with:
{
  "experiment_type": "<catalog or 'Other'>",
  "recommended_mode": "Sparrow" | "Shifu",
  "goal_metric": "<primary metric + horizon, e.g., 'ARPDAU (W1)'>",
  "guardrail_metrics": ["<2–5 items>"],
  "rationale": "Tie to review quotes/themes; if tactical → Sparrow; if structural → Shifu. Mixed scope → suggest two-stage plan.",
  "confidence": 0.0-1.0,
  "sample_review_ids": ["<5-8 review IDs that best support this experiment>"]
}
Return a STRICT JSON array only. No prose outside JSON.
`;

export function extractAppId(playUrl: string): string {
  const m = playUrl.match(/[?&]id=([a-zA-Z0-9._]+)/);
  if (!m) throw new Error("Could not extract appId from URL");
  return m[1];
}

export async function fetchReviews(appId: string, total = 600): Promise<RawReview[]> {
  const sorts = [gplay.sort.NEWEST, gplay.sort.RATING];
  const perSort = Math.ceil(total / sorts.length);

  const out: RawReview[] = [];
  for (const sort of sorts) {
    try {
      console.log(`Fetching ${perSort} reviews with sort: ${sort}`);
      const result = await gplay.reviews({
        appId,
        sort,
        num: perSort,
        throttle: 10,
        paginate: true,
      });
      
      console.log(`Got ${result.data?.length || 0} reviews`);
      
      if (result.data) {
        for (const r of result.data) {
          out.push({
            id: r.id || String(Math.random()),
            text: r.text ?? "",
            score: r.score,
            thumbsUp: r.thumbsUp,
            appVersion: r.version,
            at: r.date ? new Date(r.date).toISOString() : undefined,
            userName: r.userName,
            replyDate: r.replyDate ? new Date(r.replyDate).toISOString() : null,
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching reviews with sort ${sort}:`, error);
      // Continue with other sort methods even if one fails
    }
  }

  console.log(`Total reviews fetched: ${out.length}`);
  
  // Deduplicate by id
  const map = new Map(out.map(r => [r.id, r]));
  return Array.from(map.values());
}

async function callLLM(system: string, user: string): Promise<string> {
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: { type: "json_object" },
  });

  const responseText = completion.choices[0].message.content;
  if (!responseText) {
    throw new Error("No response from OpenAI");
  }

  return responseText;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function analyzeReviews(raw: RawReview[]): Promise<AnalyzedReview[]> {
  const BATCH = 3; // Very small batches for faster processing
  const batches = chunk(raw, BATCH);
  const all: AnalyzedReview[] = [];

  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} with ${b.length} reviews`);
    
    const userPayload = JSON.stringify({
      reviews: b.map(r => ({
        id: r.id,
        text: r.text,
        stars: r.score,
        thumbs_up: r.thumbsUp,
        version: r.appVersion,
        timestamp: r.at
      }))
    });
    
    try {
      const content = await callLLM(SYSTEM_REVIEW_ANALYZER, userPayload);
      
      // Parse the JSON response
      try {
        const parsed = JSON.parse(content);
        console.log(`Raw response:`, JSON.stringify(parsed, null, 2).substring(0, 500) + '...');
        
        // Try different response formats from GPT-5
        let reviewsArray = null;
        
        if (parsed.reviews && Array.isArray(parsed.reviews)) {
          reviewsArray = parsed.reviews;
        } else if (parsed.result && Array.isArray(parsed.result)) {
          reviewsArray = parsed.result;
        } else if (parsed.results && Array.isArray(parsed.results)) {
          reviewsArray = parsed.results;
        } else if (parsed.analysis && Array.isArray(parsed.analysis)) {
          reviewsArray = parsed.analysis;
        } else if (Array.isArray(parsed)) {
          reviewsArray = parsed;
        }
        
        if (reviewsArray) {
          console.log(`Successfully parsed batch ${i + 1} with ${reviewsArray.length} reviews`);
          all.push(...reviewsArray);
        } else {
          console.error(`No valid array found in batch ${i + 1}. Available keys:`, Object.keys(parsed));
        }
      } catch (parseError) {
        console.error(`Failed to parse JSON for batch ${i + 1}:`, parseError);
        console.error(`Raw content:`, content.substring(0, 500) + '...');
      }
      
    } catch (error) {
      console.error(`Failed to process batch ${i + 1}:`, error);
    }
  }

  console.log(`Total successfully analyzed reviews: ${all.length}`);
  return all;
}

async function mineThemes(analyzed: AnalyzedReview[]): Promise<Theme[]> {
  // Send a capped set to control token usage
  const sample = analyzed.slice(0, 1000);
  const userPayload = JSON.stringify({ reviews: sample });
  const content = await callLLM(SYSTEM_THEME_MINER, userPayload);
  const parsed = JSON.parse(content) as { themes: Theme[] };
  return parsed.themes;
}

async function rankTop(analyzed: AnalyzedReview[]): Promise<{top_critical: RankedItem[]; top_positive: RankedItem[]}> {
  // Pass only IDs + minimal features to keep tokens small
  const slim = analyzed.map(r => ({
    id: r.id,
    sentiment: r.sentiment,
    stars: r.stars.value,
    helpfulness_weight: r.helpfulness_weight,
    timestamp: r.timestamp,
    themes: r.themes
  }));
  
  const content = await callLLM(SYSTEM_RANKER, JSON.stringify({ reviews: slim }));
  return JSON.parse(content) as {top_critical: RankedItem[]; top_positive: RankedItem[]};
}

async function suggestExperiments(themes: Theme[]): Promise<Suggestion[]> {
  const content = await callLLM(SYSTEM_EXPERIMENT_PLANNER, JSON.stringify({ themes }));
  return JSON.parse(content) as Suggestion[];
}

export async function runPlayStoreReviewMining(playUrl: string): Promise<ReviewMiningResult> {
  const appId = extractAppId(playUrl);

  // 1) Scrape reviews
  console.log(`Fetching reviews for ${appId}...`);
  const raw = await fetchReviews(appId, 50); // Fetch 50 reviews total to get better critical/positive selection

  // 2) Analyze reviews with LLM
  console.log(`Analyzing ${raw.length} reviews...`);
  const analyzed = await analyzeReviews(raw);
  console.log(`Successfully analyzed ${analyzed.length} reviews`);

  // 3) Mine themes
  console.log(`Mining themes...`);
  const themes = await mineThemes(analyzed);
  console.log(`Found ${themes.length} themes`);

  // 4) Rank top reviews
  console.log(`Ranking top reviews...`);
  const { top_critical, top_positive } = await rankTop(analyzed);
  console.log(`Ranked ${top_critical.length} critical and ${top_positive.length} positive reviews`);

  // 5) Suggest experiments
  console.log(`Suggesting experiments...`);
  const suggested_experiments = await suggestExperiments(themes);
  console.log(`Generated ${suggested_experiments.length} experiment suggestions`);

  return {
    appId,
    top_critical,
    top_positive,
    themes,
    suggested_experiments,
  };
}
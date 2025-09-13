import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  company: text("company"),
  role: text("role").default("pm"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  apiKey: text("api_key").notNull().unique(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const experiments = pgTable("experiments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'onboarding', 'tutorial', 'rewards', 'ui', 'level'
  status: text("status").default("draft"), // 'draft', 'running', 'completed', 'paused'
  targetAudience: text("target_audience").default("all_new_users"),
  trafficSplit: text("traffic_split").default("50/50"),
  variants: jsonb("variants").notNull(), // {variantA: {}, variantB: {}}
  metrics: jsonb("metrics").notNull(), // array of metric names
  results: jsonb("results"), // experiment results data
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").default("collaborator"), // 'admin', 'collaborator', 'developer'
  invitedBy: integer("invited_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const segments = pgTable("segments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rulesJson: jsonb("rules_json").notNull(), // segment rules as JSON
  isAdvanced: boolean("is_advanced").default(false),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const objects = pgTable("objects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'Level', 'Popup', 'Param'
  flags: jsonb("flags").notNull(), // array of flag definitions
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  utmSource: text("utm_source").notNull(),
  utmCampaign: text("utm_campaign"),
  installs: integer("installs").default(0),
  d0Retention: decimal("d0_retention", { precision: 5, scale: 2 }).default("0.00"),
  d1Retention: decimal("d1_retention", { precision: 5, scale: 2 }).default("0.00"),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00"),
  flagBundle: text("flag_bundle"),
  allocation: integer("allocation").default(0),
  status: text("status").default("Draft"), // 'Active', 'Paused', 'Draft'
  launchDate: timestamp("launch_date").defaultNow(),
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const variants = pgTable("variants", {
  id: serial("id").primaryKey(),
  objectId: integer("object_id").notNull(),
  version: text("version").notNull(),
  name: text("name").notNull(),
  payload: jsonb("payload").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  allocation: integer("allocation").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  company: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
});

export const insertExperimentSchema = createInsertSchema(experiments).pick({
  name: true,
  description: true,
  type: true,
  targetAudience: true,
  trafficSplit: true,
  variants: true,
  metrics: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  projectId: true,
  userId: true,
  role: true,
});

export const insertSegmentSchema = createInsertSchema(segments).pick({
  name: true,
  rulesJson: true,
  isAdvanced: true,
});

export const insertObjectSchema = createInsertSchema(objects).pick({
  name: true,
  type: true,
  flags: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  utmSource: true,
  utmCampaign: true,
  installs: true,
  d0Retention: true,
  d1Retention: true,
  revenue: true,
  flagBundle: true,
  allocation: true,
  status: true,
});

export const insertVariantSchema = createInsertSchema(variants).pick({
  version: true,
  name: true,
  payload: true,
  description: true,
  isDefault: true,
  allocation: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experiments.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertSegment = z.infer<typeof insertSegmentSchema>;
export type Segment = typeof segments.$inferSelect;
export type InsertObject = z.infer<typeof insertObjectSchema>;
export type Object = typeof objects.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertVariant = z.infer<typeof insertVariantSchema>;
export type Variant = typeof variants.$inferSelect;

// Database relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  experiments: many(experiments),
  teamMembers: many(teamMembers),
  segments: many(segments),
  objects: many(objects),
  campaigns: many(campaigns),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  experiments: many(experiments),
  teamMembers: many(teamMembers),
  segments: many(segments),
  objects: many(objects),
  campaigns: many(campaigns),
}));

export const experimentsRelations = relations(experiments, ({ one }) => ({
  project: one(projects, {
    fields: [experiments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [experiments.userId],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  project: one(projects, {
    fields: [teamMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [teamMembers.invitedBy],
    references: [users.id],
  }),
}));

export const segmentsRelations = relations(segments, ({ one }) => ({
  project: one(projects, {
    fields: [segments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [segments.userId],
    references: [users.id],
  }),
}));

export const objectsRelations = relations(objects, ({ one, many }) => ({
  project: one(projects, {
    fields: [objects.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [objects.userId],
    references: [users.id],
  }),
  variants: many(variants),
}));

export const campaignsRelations = relations(campaigns, ({ one }) => ({
  project: one(projects, {
    fields: [campaigns.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  object: one(objects, {
    fields: [variants.objectId],
    references: [objects.id],
  }),
}));

/* -------------------------------------------------------------------------
   Experiment Compass & Review-miner schemas (ported from SwiftSite/shared/schema.ts)
   Added so server routes that expect `experimentCompassResponseSchema` can import it.
 ------------------------------------------------------------------------- */

// Unified Experiment Compass types
export const CATEGORY = z.enum([
  "GAMEPLAY","TECH","ART_CONTENT","BUG","MONETIZATION_ADS","ENGAGEMENT_SENTIMENT","FEATURE_REQUEST"
]);

export const SUBCATEGORY = z.enum([
  "BALANCE","DIFFICULTY_SPIKE","FAIRNESS","PAY_TO_WIN",
  "CRASH","LAG","LOAD_TIME","BATTERY_DRAIN","DEVICE_COMPAT",
  "VISUALS","AUDIO","ANIMATION","THEME_QUALITY",
  "CLIPPING","PROGRESSION_BLOCK","UI_GLITCH","SAVE_ISSUE",
  "AD_FREQUENCY","AD_PLACEMENT","AD_REWARD_TIMING","IAP_PRESSURE",
  "FUN","STICKINESS","REPLAY_VALUE","COMMUNITY",
  "NEW_MODE","MULTIPLAYER","COSMETICS","QOL"
]);

export const SEVERITY = z.enum(["LOW","MEDIUM","HIGH"]);
export const MODE = z.enum(["Sparrow","Shifu"]);

// Driver enum for analytics consistency
export const DriverEnum = z.enum(["ENGAGEMENT","RETENTION","MONETIZATION","UX","ECONOMY"]);

// Hypothesis schema for DESCRIBE_EXPERIMENT flow
export const hypothesisSchema = z.object({
  id: z.string(),                       // "H1", "H2"
  title: z.string(),                    // short name, e.g., "Rewarded Ads increase engagement"
  statement: z.string(),                // full hypothesis sentence
  confidence: z.number().min(0).max(1), // model's self-estimate
  
  // keep strict drivers for analytics/routing
  drivers: z.array(DriverEnum).min(1),
  
  // NEW: free-form labels the model/user can express
  tags: z.array(z.string()).optional(),
  
  metrics_affected: z.array(z.string()).min(1), // e.g., ["D7 retention","Ad engagement"]
});

const metricSchema = z.object({
  name: z.string(),
  window: z.string().optional(),
  direction: z.enum(["UP","DOWN","NO_WORSE"]).optional(),
});

const insightSchema = z.object({
  id: z.string(),
  category: CATEGORY,
  subcategory: SUBCATEGORY,
  severity: SEVERITY,
  frequency_score: z.number().min(0).max(1),
  sentiment: z.enum(["NEGATIVE","NEUTRAL","POSITIVE"]),
  summary: z.string(),
  evidence: z.array(z.object({
    review_id: z.string(),
    excerpt: z.string(),
    rating: z.number().optional(),
    lang: z.string().optional(),
    date_iso: z.string().optional(),
    // NEW (optional, only for DESCRIBE_EXPERIMENT synthetic evidence)
    source: z.enum(["REVIEW","DESCRIPTION"]).optional()
  })).min(1),
});

const experimentSchema = z.object({
  id: z.string(),
  title: z.string(),
  experiment_type: z.string(),
  recommended_mode: MODE,
  mode_tagline: z.string(),
  goal_metric: metricSchema,
  guardrail_metrics: z.array(metricSchema).min(1),
  rationale: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  linked_insight_ids: z.array(z.string()).min(1),
  implementation_notes: z.array(z.string()).optional(),
  variants: z.array(z.object({ key: z.string(), description: z.string() })).optional(),
  alternative_mode: z.object({
    mode: MODE,
    when_to_prefer: z.string(),
    tradeoffs: z.array(z.string())
  }).optional(),
});

export const reviewsCatalogItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  rating: z.number().optional(),
  lang: z.string().optional(),
  thumbsUp: z.number().optional(),
  date_iso: z.string().optional(),
});

export const experimentCompassResponseSchema = z.object({
  version: z.literal("1.0"),
  source: z.enum(["DESCRIBE_EXPERIMENT","REVIEW_MINER"]),
  taxonomy: z.object({
    categories: CATEGORY.array(),
    subcategories: SUBCATEGORY.array()
  }),
  insights: insightSchema.array().min(0),
  experiments: experimentSchema.array().min(1),
  // NEW (optional) — only present for DESCRIBE_EXPERIMENT
  hypotheses: z.array(hypothesisSchema).optional(),
  summary: z.object({
    counts: z.object({
      insights_total: z.number(),
      positive: z.number(),
      negative: z.number(),
      by_severity: z.object({ HIGH: z.number(), MEDIUM: z.number(), LOW: z.number() })
    }),
    highlights: z.array(z.string())
  }),
  share_payloads: z.record(z.string(), z.object({
    slack: z.object({
      title: z.string(),
      summary: z.string(),
      experiment_id: z.string(),
      blocks_markdown: z.string(),
    }),
    nova: z.object({
      experiment: z.any()
    })
  })).optional(),
  reviews_catalog: z.record(reviewsCatalogItemSchema).optional(),
});

export type ExperimentCompassResponse = z.infer<typeof experimentCompassResponseSchema>;
export type Hypothesis = z.infer<typeof hypothesisSchema>;

// Review Miner types
export const rawReviewSchema = z.object({
  id: z.string(),
  text: z.string(),
  score: z.number().optional(),
  thumbsUp: z.number().optional(),
  appVersion: z.string().optional(),
  at: z.string().optional(),
  userName: z.string().optional(),
  replyDate: z.string().nullable().optional(),
});

export const analyzedReviewSchema = z.object({
  id: z.string(),
  detect_language: z.string(),
  normalized_text: z.string(),
  translation_en: z.string(),
  sentiment: z.enum(["very_negative", "negative", "neutral", "positive", "very_positive"]),
  stars: z.object({
    value: z.number(),
    inferred: z.boolean()
  }),
  toxicity: z.boolean(),
  themes: z.array(z.string()),
  issue_snippets: z.array(z.string()),
  helpfulness_weight: z.number(),
  version: z.string().nullable().optional(),
  timestamp: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export const themeSchema = z.object({
  name: z.string(),
  description: z.string(),
  criteria: z.array(z.string()),
  review_ids: z.array(z.string()),
  health: z.object({
    count: z.number(),
    avg_stars: z.number(),
    avg_helpfulness_weight: z.number()
  }),
  urgency: z.enum(["low", "medium", "high"]),
});

export const rankedItemSchema = z.object({
  id: z.string(),
  score: z.number(),
  why: z.string(),
});

export const suggestionSchema = z.object({
  experiment_type: z.enum([
    "Event Variant Allocation",
    "IAP Starter Pack / Bundles",
    "Ad Frequency / Placement",
    "Notification Template / Timing",
    "Difficulty Micro-tuning",
    "Core Difficulty Curve",
    "Season Pass / Subscription",
    "Economy Framework / Monetization Model",
    "Store Merchandising / Ranking",
    "Onboarding / FTUE Flow",
    "Matchmaking / Mode Rotation",
    "Other"
  ]),
  recommended_mode: z.enum(["Sparrow", "Shifu"]),
  goal_metric: z.string(),
  guardrail_metrics: z.array(z.string()),
  rationale: z.string(),
  confidence: z.number(),
  sample_review_ids: z.array(z.string()).optional(),
});

export const reviewMiningRequestSchema = z.object({
  playStoreUrl: z.string().url(),
});

export const reviewMiningResultSchema = z.object({
  appId: z.string(),
  top_critical: z.array(rankedItemSchema),
  top_positive: z.array(rankedItemSchema),
  themes: z.array(themeSchema),
  suggested_experiments: z.array(suggestionSchema),
});

export type RawReview = z.infer<typeof rawReviewSchema>;
export type AnalyzedReview = z.infer<typeof analyzedReviewSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type RankedItem = z.infer<typeof rankedItemSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type ReviewMiningRequest = z.infer<typeof reviewMiningRequestSchema>;
export type ReviewMiningResult = z.infer<typeof reviewMiningResultSchema>;

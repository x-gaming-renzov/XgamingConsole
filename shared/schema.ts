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
  projectId: integer("project_id").notNull(),
  userId: integer("user_id").notNull(),
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

export const objectsRelations = relations(objects, ({ one }) => ({
  project: one(projects, {
    fields: [objects.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [objects.userId],
    references: [users.id],
  }),
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

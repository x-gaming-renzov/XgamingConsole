import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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

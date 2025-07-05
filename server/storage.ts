import { users, projects, experiments, teamMembers, segments, objects, campaigns, type User, type InsertUser, type Project, type InsertProject, type Experiment, type InsertExperiment, type TeamMember, type InsertTeamMember, type Segment, type InsertSegment, type Object, type InsertObject, type Campaign, type InsertCampaign } from "@shared/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;

  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUserId(userId: number): Promise<Project[]>;
  createProject(project: InsertProject & { userId: number }): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;

  // Experiment methods
  getExperiment(id: number): Promise<Experiment | undefined>;
  getExperimentsByProjectId(projectId: number): Promise<Experiment[]>;
  createExperiment(experiment: InsertExperiment & { projectId: number; userId: number }): Promise<Experiment>;
  updateExperiment(id: number, experiment: Partial<Experiment>): Promise<Experiment | undefined>;
  deleteExperiment(id: number): Promise<boolean>;

  // Team member methods
  getTeamMembersByProjectId(projectId: number): Promise<TeamMember[]>;
  createTeamMember(teamMember: InsertTeamMember & { invitedBy: number }): Promise<TeamMember>;
  deleteTeamMember(id: number): Promise<boolean>;

  // Segment methods
  getSegment(id: number): Promise<Segment | undefined>;
  getSegmentsByProjectId(projectId: number): Promise<Segment[]>;
  createSegment(segment: InsertSegment & { projectId: number; userId: number }): Promise<Segment>;
  updateSegment(id: number, segment: Partial<Segment>): Promise<Segment | undefined>;
  deleteSegment(id: number): Promise<boolean>;
  estimateSegmentSize(rulesJson: any): Promise<number>;

  // Object methods
  getObject(id: number): Promise<Object | undefined>;
  getObjectsByProjectId(projectId: number): Promise<Object[]>;
  createObject(object: InsertObject & { projectId: number; userId: number }): Promise<Object>;
  updateObject(id: number, object: Partial<Object>): Promise<Object | undefined>;
  deleteObject(id: number): Promise<boolean>;

  // Campaign methods
  getCampaign(id: number): Promise<Campaign | undefined>;
  getCampaignsByProjectId(projectId: number): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign & { projectId: number; userId: number }): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private experiments: Map<number, Experiment>;
  private teamMembers: Map<number, TeamMember>;
  private segments: Map<number, Segment>;
  private objects: Map<number, Object>;
  private campaigns: Map<number, Campaign>;
  private currentUserId: number;
  private currentProjectId: number;
  private currentExperimentId: number;
  private currentTeamMemberId: number;
  private currentSegmentId: number;
  private currentObjectId: number;
  private currentCampaignId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.experiments = new Map();
    this.teamMembers = new Map();
    this.segments = new Map();
    this.objects = new Map();
    this.campaigns = new Map();
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentExperimentId = 1;
    this.currentTeamMemberId = 1;
    this.currentSegmentId = 1;
    this.currentObjectId = 1;
    this.currentCampaignId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      role: "pm",
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.userId === userId,
    );
  }

  async createProject(projectData: InsertProject & { userId: number }): Promise<Project> {
    const id = this.currentProjectId++;
    const project: Project = {
      ...projectData,
      id,
      apiKey: nanoid(32),
      createdAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  // Experiment methods
  async getExperiment(id: number): Promise<Experiment | undefined> {
    return this.experiments.get(id);
  }

  async getExperimentsByProjectId(projectId: number): Promise<Experiment[]> {
    return Array.from(this.experiments.values()).filter(
      (experiment) => experiment.projectId === projectId,
    );
  }

  async createExperiment(experimentData: InsertExperiment & { projectId: number; userId: number }): Promise<Experiment> {
    const id = this.currentExperimentId++;
    const experiment: Experiment = {
      ...experimentData,
      id,
      status: "draft",
      results: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.experiments.set(id, experiment);
    return experiment;
  }

  async updateExperiment(id: number, updates: Partial<Experiment>): Promise<Experiment | undefined> {
    const experiment = this.experiments.get(id);
    if (!experiment) return undefined;
    
    const updatedExperiment = { ...experiment, ...updates, updatedAt: new Date() };
    this.experiments.set(id, updatedExperiment);
    return updatedExperiment;
  }

  async deleteExperiment(id: number): Promise<boolean> {
    return this.experiments.delete(id);
  }

  // Team member methods
  async getTeamMembersByProjectId(projectId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      (member) => member.projectId === projectId,
    );
  }

  async createTeamMember(teamMemberData: InsertTeamMember & { invitedBy: number }): Promise<TeamMember> {
    const id = this.currentTeamMemberId++;
    const teamMember: TeamMember = {
      ...teamMemberData,
      id,
      createdAt: new Date(),
    };
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    return this.teamMembers.delete(id);
  }

  // Segment methods
  async getSegment(id: number): Promise<Segment | undefined> {
    return this.segments.get(id);
  }

  async getSegmentsByProjectId(projectId: number): Promise<Segment[]> {
    return Array.from(this.segments.values()).filter(
      (segment) => segment.projectId === projectId,
    );
  }

  async createSegment(segmentData: InsertSegment & { projectId: number; userId: number }): Promise<Segment> {
    const id = this.currentSegmentId++;
    const segment: Segment = {
      ...segmentData,
      id,
      createdAt: new Date(),
    };
    this.segments.set(id, segment);
    return segment;
  }

  async updateSegment(id: number, updates: Partial<Segment>): Promise<Segment | undefined> {
    const segment = this.segments.get(id);
    if (!segment) return undefined;
    
    const updatedSegment = { ...segment, ...updates };
    this.segments.set(id, updatedSegment);
    return updatedSegment;
  }

  async deleteSegment(id: number): Promise<boolean> {
    return this.segments.delete(id);
  }

  async estimateSegmentSize(rulesJson: any): Promise<number> {
    // Simulate segment size estimation based on rules
    // In a real implementation, this would query actual user data
    await new Promise(resolve => setTimeout(resolve, 500));
    return Math.floor(Math.random() * 5000) + 500;
  }

  // Object methods
  async getObject(id: number): Promise<Object | undefined> {
    return this.objects.get(id);
  }

  async getObjectsByProjectId(projectId: number): Promise<Object[]> {
    return Array.from(this.objects.values()).filter(
      (object) => object.projectId === projectId
    );
  }

  async createObject(objectData: InsertObject & { projectId: number; userId: number }): Promise<Object> {
    const object: Object = {
      id: this.currentObjectId++,
      createdAt: new Date(),
      ...objectData,
    };
    this.objects.set(object.id, object);
    return object;
  }

  async updateObject(id: number, updates: Partial<Object>): Promise<Object | undefined> {
    const object = this.objects.get(id);
    if (!object) return undefined;
    
    const updatedObject = { ...object, ...updates };
    this.objects.set(id, updatedObject);
    return updatedObject;
  }

  async deleteObject(id: number): Promise<boolean> {
    return this.objects.delete(id);
  }

  // Campaign methods
  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async getCampaignsByProjectId(projectId: number): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter(
      (campaign) => campaign.projectId === projectId
    );
  }

  async createCampaign(campaignData: InsertCampaign & { projectId: number; userId: number }): Promise<Campaign> {
    const campaign: Campaign = {
      id: this.currentCampaignId++,
      createdAt: new Date(),
      ...campaignData,
    };
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    
    const updatedCampaign = { ...campaign, ...updates };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    return this.campaigns.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  private db = db;

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return await this.db.select().from(projects).where(eq(projects.userId, userId));
  }

  async createProject(projectData: InsertProject & { userId: number }): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values({ ...projectData, apiKey: nanoid() })
      .returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await this.db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  // Experiment methods
  async getExperiment(id: number): Promise<Experiment | undefined> {
    const [experiment] = await this.db.select().from(experiments).where(eq(experiments.id, id));
    return experiment || undefined;
  }

  async getExperimentsByProjectId(projectId: number): Promise<Experiment[]> {
    return await this.db.select().from(experiments).where(eq(experiments.projectId, projectId));
  }

  async createExperiment(experimentData: InsertExperiment & { projectId: number; userId: number }): Promise<Experiment> {
    const [experiment] = await this.db
      .insert(experiments)
      .values(experimentData)
      .returning();
    return experiment;
  }

  async updateExperiment(id: number, updates: Partial<Experiment>): Promise<Experiment | undefined> {
    const [experiment] = await this.db
      .update(experiments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(experiments.id, id))
      .returning();
    return experiment || undefined;
  }

  async deleteExperiment(id: number): Promise<boolean> {
    const result = await this.db.delete(experiments).where(eq(experiments.id, id));
    return result.rowCount > 0;
  }

  // Team member methods
  async getTeamMembersByProjectId(projectId: number): Promise<TeamMember[]> {
    return await this.db.select().from(teamMembers).where(eq(teamMembers.projectId, projectId));
  }

  async createTeamMember(teamMemberData: InsertTeamMember & { invitedBy: number }): Promise<TeamMember> {
    const [teamMember] = await this.db
      .insert(teamMembers)
      .values(teamMemberData)
      .returning();
    return teamMember;
  }

  async deleteTeamMember(id: number): Promise<boolean> {
    const result = await this.db.delete(teamMembers).where(eq(teamMembers.id, id));
    return result.rowCount > 0;
  }

  // Segment methods
  async getSegment(id: number): Promise<Segment | undefined> {
    const [segment] = await this.db.select().from(segments).where(eq(segments.id, id));
    return segment || undefined;
  }

  async getSegmentsByProjectId(projectId: number): Promise<Segment[]> {
    return await this.db.select().from(segments).where(eq(segments.projectId, projectId));
  }

  async createSegment(segmentData: InsertSegment & { projectId: number; userId: number }): Promise<Segment> {
    const [segment] = await this.db
      .insert(segments)
      .values(segmentData)
      .returning();
    return segment;
  }

  async updateSegment(id: number, updates: Partial<Segment>): Promise<Segment | undefined> {
    const [segment] = await this.db
      .update(segments)
      .set(updates)
      .where(eq(segments.id, id))
      .returning();
    return segment || undefined;
  }

  async deleteSegment(id: number): Promise<boolean> {
    const result = await this.db.delete(segments).where(eq(segments.id, id));
    return result.rowCount > 0;
  }

  async estimateSegmentSize(rulesJson: any): Promise<number> {
    // In a real implementation, this would query actual user data based on rules
    // For now, return a simulated estimate
    await new Promise(resolve => setTimeout(resolve, 500));
    return Math.floor(Math.random() * 5000) + 500;
  }

  // Object methods
  async getObject(id: number): Promise<Object | undefined> {
    const [object] = await this.db.select().from(objects).where(eq(objects.id, id));
    return object || undefined;
  }

  async getObjectsByProjectId(projectId: number): Promise<Object[]> {
    return await this.db.select().from(objects).where(eq(objects.projectId, projectId));
  }

  async createObject(objectData: InsertObject & { projectId: number; userId: number }): Promise<Object> {
    const [object] = await this.db
      .insert(objects)
      .values(objectData)
      .returning();
    return object;
  }

  async updateObject(id: number, updates: Partial<Object>): Promise<Object | undefined> {
    const [object] = await this.db
      .update(objects)
      .set(updates)
      .where(eq(objects.id, id))
      .returning();
    return object || undefined;
  }

  async deleteObject(id: number): Promise<boolean> {
    const result = await this.db.delete(objects).where(eq(objects.id, id));
    return result.rowCount > 0;
  }

  // Campaign methods
  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await this.db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign || undefined;
  }

  async getCampaignsByProjectId(projectId: number): Promise<Campaign[]> {
    return await this.db.select().from(campaigns).where(eq(campaigns.projectId, projectId));
  }

  async createCampaign(campaignData: InsertCampaign & { projectId: number; userId: number }): Promise<Campaign> {
    const [campaign] = await this.db
      .insert(campaigns)
      .values(campaignData)
      .returning();
    return campaign;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [campaign] = await this.db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();
    return campaign || undefined;
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const result = await this.db.delete(campaigns).where(eq(campaigns.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();

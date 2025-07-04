import { users, projects, experiments, teamMembers, type User, type InsertUser, type Project, type InsertProject, type Experiment, type InsertExperiment, type TeamMember, type InsertTeamMember } from "@shared/schema";
import { nanoid } from "nanoid";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private experiments: Map<number, Experiment>;
  private teamMembers: Map<number, TeamMember>;
  private currentUserId: number;
  private currentProjectId: number;
  private currentExperimentId: number;
  private currentTeamMemberId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.experiments = new Map();
    this.teamMembers = new Map();
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentExperimentId = 1;
    this.currentTeamMemberId = 1;
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
}

export const storage = new MemStorage();

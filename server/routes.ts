import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertExperimentSchema, insertSegmentSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Create default project
      const project = await storage.createProject({
        name: userData.company || "My Game",
        description: "Default project",
        userId: user.id,
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        user: { ...user, password: undefined },
        project,
        token,
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid credentials" });
      }

      // Get user's projects
      const projects = await storage.getProjectsByUserId(user.id);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        user: { ...user, password: undefined },
        projects,
        token,
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Login failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const projects = await storage.getProjectsByUserId(user.id);
      
      res.json({
        user: { ...user, password: undefined },
        projects,
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Server error" });
    }
  });

  // Project routes
  app.get("/api/projects", authenticateToken, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user.userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", authenticateToken, async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject({
        ...projectData,
        userId: req.user.userId,
      });
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create project" });
    }
  });

  // Experiment routes
  app.get("/api/experiments", authenticateToken, async (req, res) => {
    try {
      const { projectId } = req.query;
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }

      // Verify user has access to project
      const project = await storage.getProject(Number(projectId));
      if (!project || project.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const experiments = await storage.getExperimentsByProjectId(Number(projectId));
      res.json(experiments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch experiments" });
    }
  });

  app.post("/api/experiments", authenticateToken, async (req, res) => {
    try {
      const experimentData = insertExperimentSchema.parse(req.body);
      const { projectId } = req.body;

      // Verify user has access to project
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const experiment = await storage.createExperiment({
        ...experimentData,
        projectId,
        userId: req.user.userId,
      });
      res.json(experiment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create experiment" });
    }
  });

  app.put("/api/experiments/:id", authenticateToken, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;

      // Verify user has access to experiment
      const experiment = await storage.getExperiment(id);
      if (!experiment || experiment.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedExperiment = await storage.updateExperiment(id, updates);
      res.json(updatedExperiment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update experiment" });
    }
  });

  app.delete("/api/experiments/:id", authenticateToken, async (req, res) => {
    try {
      const id = Number(req.params.id);

      // Verify user has access to experiment
      const experiment = await storage.getExperiment(id);
      if (!experiment || experiment.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteExperiment(id);
      res.json({ success: deleted });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to delete experiment" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/dashboard", authenticateToken, async (req, res) => {
    try {
      const { projectId } = req.query;
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }

      // Verify user has access to project
      const project = await storage.getProject(Number(projectId));
      if (!project || project.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const experiments = await storage.getExperimentsByProjectId(Number(projectId));
      
      // Calculate analytics
      const activeExperiments = experiments.filter(exp => exp.status === "running").length;
      const completedExperiments = experiments.filter(exp => exp.status === "completed").length;
      
      // Mock analytics data for now
      const analytics = {
        activeExperiments,
        completedExperiments,
        totalExperiments: experiments.length,
        avgCompletionRate: 67.3,
        dayOneRetention: 42.1,
        recentExperiments: experiments.slice(0, 5),
      };

      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch analytics" });
    }
  });

  // Get dashboard metrics overview
  app.get("/api/metrics/overview", authenticateToken, async (req, res) => {
    try {
      // Get user's projects to calculate metrics
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.json({
          activeExperiences: 0,
          avgD0Retention: 0,
          avgD1Retention: 0,
          activationRate: 0,
          campaignsNeedAttention: false,
          activeCampaigns: []
        });
      }

      // Get all campaigns for user's projects
      const allCampaigns = [];
      const allExperiments = [];
      
      for (const project of projects) {
        const campaigns = await storage.getCampaignsByProjectId(project.id);
        const experiments = await storage.getExperimentsByProjectId(project.id);
        allCampaigns.push(...campaigns);
        allExperiments.push(...experiments);
      }

      // Filter active campaigns and calculate metrics
      const activeCampaigns = allCampaigns
        .filter(campaign => campaign.status === "Active")
        .map(campaign => ({
          id: campaign.id,
          label: campaign.name,
          utmSource: campaign.utmSource,
          d1Highest: Number(campaign.d1Retention) + Math.floor(Math.random() * 10), // Add some variance
          d1Lowest: Math.max(Number(campaign.d1Retention) - Math.floor(Math.random() * 15), 0),
          newUsersToday: campaign.installs || 0,
          activeExperiences: allExperiments.filter(exp => exp.status === "running").length,
          status: campaign.status as "Active" | "Paused" | "Draft"
        }));

      const activeExperiences = allExperiments.filter(exp => exp.status === "running").length;
      const avgD0Retention = allCampaigns.reduce((sum, c) => sum + Number(c.d0Retention || 0), 0) / Math.max(allCampaigns.length, 1);
      const avgD1Retention = allCampaigns.reduce((sum, c) => sum + Number(c.d1Retention || 0), 0) / Math.max(allCampaigns.length, 1);

      const metrics = {
        activeExperiences,
        avgD0Retention: Math.round(avgD0Retention * 10) / 10,
        avgD1Retention: Math.round(avgD1Retention * 10) / 10,
        activationRate: Math.round((activeExperiences / Math.max(allExperiments.length, 1)) * 100 * 10) / 10,
        campaignsNeedAttention: activeCampaigns.some(c => c.d1Lowest < 40),
        activeCampaigns: activeCampaigns.slice(0, 3) // Show top 3
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch metrics" });
    }
  });

  // Segments routes
  app.get("/api/segments", authenticateToken, async (req, res) => {
    try {
      const { projectId } = req.query;
      
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }

      // Verify user has access to project
      const project = await storage.getProject(Number(projectId));
      if (!project || project.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const segments = await storage.getSegmentsByProjectId(Number(projectId));
      res.json(segments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch segments" });
    }
  });

  app.post("/api/segments", authenticateToken, async (req, res) => {
    try {
      const segmentData = insertSegmentSchema.parse(req.body);
      const { projectId } = req.body;

      // Verify user has access to project
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const segment = await storage.createSegment({
        ...segmentData,
        projectId,
        userId: req.user.userId,
      });
      res.json(segment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create segment" });
    }
  });

  app.post("/api/segments/estimate", authenticateToken, async (req, res) => {
    try {
      const { rulesJson } = req.body;
      
      if (!rulesJson) {
        return res.status(400).json({ message: "Rules JSON is required" });
      }

      const estimate = await storage.estimateSegmentSize(rulesJson);
      res.json({ users_daily: estimate });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to estimate segment size" });
    }
  });

  app.put("/api/segments/:id", authenticateToken, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body;

      // Verify user has access to segment
      const segment = await storage.getSegment(id);
      if (!segment || segment.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedSegment = await storage.updateSegment(id, updates);
      res.json(updatedSegment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update segment" });
    }
  });

  app.delete("/api/segments/:id", authenticateToken, async (req, res) => {
    try {
      const id = Number(req.params.id);

      // Verify user has access to segment
      const segment = await storage.getSegment(id);
      if (!segment || segment.userId !== req.user.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteSegment(id);
      res.json({ success: deleted });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to delete segment" });
    }
  });

  // AI Experience Draft Generation
  app.post("/api/ai/experience_draft", authenticateToken, async (req, res) => {
    try {
      const { prompt, campaignHint } = req.body;
      
      if (!prompt || typeof prompt !== 'string' || prompt.length < 10) {
        return res.status(400).json({ message: "Prompt must be at least 10 characters" });
      }

      // Generate a unique draft ID
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Mock AI-generated experience template for now
      // In production, this would use OpenAI API
      const draft = {
        draftId,
        name: `AI Generated: ${prompt.substring(0, 50)}...`,
        objects: [
          {
            objectId: "level_5",
            variants: {
              control: { coins_multiplier: 1 },
              A: { coins_multiplier: 2 }
            }
          }
        ],
        campaignId: campaignHint || "tiktok",
        target: {
          split: 50
        }
      };
      
      res.json(draft);
    } catch (error) {
      console.error("AI draft generation error:", error);
      res.status(500).json({ message: "Failed to generate experience draft" });
    }
  });

  // Campaign routes
  app.get("/api/campaigns", authenticateToken, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.json([]);
      }

      const allCampaigns = [];
      for (const project of projects) {
        const campaigns = await storage.getCampaignsByProjectId(project.id);
        allCampaigns.push(...campaigns);
      }

      res.json(allCampaigns);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/metrics", authenticateToken, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.json({
          estRevenue: 0,
          totalInstalls: 0,
          avgD0Retention: 0,
          objectsBound: 0
        });
      }

      const allCampaigns = [];
      const allObjects = [];
      
      for (const project of projects) {
        const campaigns = await storage.getCampaignsByProjectId(project.id);
        const objects = await storage.getObjectsByProjectId(project.id);
        allCampaigns.push(...campaigns);
        allObjects.push(...objects);
      }

      const totalInstalls = allCampaigns.reduce((sum, c) => sum + (c.installs || 0), 0);
      const estRevenue = allCampaigns.reduce((sum, c) => sum + Number(c.revenue || 0), 0);
      const avgD0Retention = allCampaigns.length > 0 
        ? allCampaigns.reduce((sum, c) => sum + Number(c.d0Retention || 0), 0) / allCampaigns.length
        : 0;

      res.json({
        estRevenue: Math.round(estRevenue * 100) / 100,
        totalInstalls,
        avgD0Retention: Math.round(avgD0Retention * 10) / 10,
        objectsBound: allObjects.length
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch campaign metrics" });
    }
  });

  app.post("/api/campaigns", authenticateToken, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.status(400).json({ message: "No project found for user" });
      }

      const projectId = projects[0].id; // Use first project for now
      const campaignData = req.body;

      const campaign = await storage.createCampaign({
        ...campaignData,
        projectId,
        userId: req.user.userId
      });

      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create campaign" });
    }
  });

  // Object routes
  app.get("/api/objects", authenticateToken, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.json([]);
      }

      const allObjects = [];
      for (const project of projects) {
        const objects = await storage.getObjectsByProjectId(project.id);
        allObjects.push(...objects);
      }

      res.json(allObjects);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch objects" });
    }
  });

  app.post("/api/objects", authenticateToken, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.status(400).json({ message: "No project found for user" });
      }

      const projectId = projects[0].id; // Use first project for now
      const objectData = req.body;

      const object = await storage.createObject({
        ...objectData,
        projectId,
        userId: req.user.userId
      });

      res.json(object);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create object" });
    }
  });

  app.get("/api/manifest/info", authenticateToken, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.json({ objectCount: 0, campaignCount: 0 });
      }

      let objectCount = 0;
      let campaignCount = 0;
      
      for (const project of projects) {
        const objects = await storage.getObjectsByProjectId(project.id);
        const campaigns = await storage.getCampaignsByProjectId(project.id);
        objectCount += objects.length;
        campaignCount += campaigns.length;
      }

      res.json({ objectCount, campaignCount });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch manifest info" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

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
      // Mock campaign data with the specified fields
      const activeCampaigns = [
        {
          id: 1,
          label: "Q1 Acquisition Push",
          utmSource: "facebook",
          d1Highest: 67,
          d1Lowest: 43,
          newUsersToday: 1247,
          activeExperiences: 3,
          status: "Active" as const
        },
        {
          id: 2,
          label: "Google UAC Test",
          utmSource: "google",
          d1Highest: 71,
          d1Lowest: 52,
          newUsersToday: 892,
          activeExperiences: 2,
          status: "Active" as const
        },
        {
          id: 3,
          label: "TikTok Creative Test",
          utmSource: "tiktok",
          d1Highest: 59,
          d1Lowest: 38,
          newUsersToday: 456,
          activeExperiences: 1,
          status: "Active" as const
        }
      ];

      const metrics = {
        activeExperiences: 12,
        avgD0Retention: 58.4,
        avgD1Retention: 52.1,
        activationRate: 34.7,
        campaignsNeedAttention: true,
        activeCampaigns
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

  const httpServer = createServer(app);
  return httpServer;
}

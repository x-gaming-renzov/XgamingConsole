import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertExperimentSchema, insertSegmentSchema, insertTeamMemberSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { analyzeExperienceDescription } from "./openai";

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

  // Experience routes (alternative view of experiments)
  app.get("/api/experiences", authenticateToken, async (req, res) => {
    try {
      // Get all projects for the user
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.json([]);
      }

      const allExperiments: any[] = [];
      for (const project of projects) {
        const experiments = await storage.getExperimentsByProjectId(project.id);
        allExperiments.push(...experiments);
      }

      // Transform experiments to experience format
      const experiences = allExperiments.map(exp => ({
        id: exp.id,
        name: exp.name,
        campaign: exp.description || "Default Campaign", // Use description or fallback
        object: `${exp.targetAudience || "All Players"}`, // Use target audience info
        uplift: Math.floor(Math.random() * 20 - 5), // Mock uplift for now
        status: exp.status === "active" ? "Active" : 
               exp.status === "completed" ? "Completed" : 
               exp.status === "paused" ? "Paused" : "Draft",
        createdAt: new Date(exp.createdAt || Date.now()).toLocaleDateString(),
        metrics: {
          d0Retention: Math.floor(Math.random() * 20 + 40), // Mock metrics
          d1Retention: Math.floor(Math.random() * 15 + 30),
          activationRate: Math.floor(Math.random() * 25 + 50),
          participants: Math.floor(Math.random() * 5000 + 1000)
        }
      }));

      res.json(experiences);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch experiences" });
    }
  });

  app.post("/api/experiences", authenticateToken, async (req, res) => {
    try {
      const experienceData = req.body;
      
      // Get user's first project (assuming single project for now)
      const projects = await storage.getProjectsByUserId(req.user.userId);
      if (projects.length === 0) {
        return res.status(400).json({ message: "No project found for user" });
      }

      const projectId = projects[0].id;

      // Transform experience data to experiment format
      const experimentData = {
        name: experienceData.name,
        description: experienceData.description || "",
        type: "onboarding" as const,
        status: (experienceData.status || "draft") as "draft" | "active" | "paused" | "completed",
        targetAudience: experienceData.targetAudience || "all_players",
        trafficSplit: experienceData.trafficSplit || 50,
        variants: JSON.stringify(experienceData.objectVariants || {}),
        metrics: JSON.stringify({}),
        startDate: experienceData.startDate ? new Date(experienceData.startDate) : null,
        endDate: experienceData.endDate ? new Date(experienceData.endDate) : null
      };

      const experiment = await storage.createExperiment({
        ...experimentData,
        projectId,
        userId: req.user.userId,
      });

      // Return in experience format
      const experience = {
        id: experiment.id,
        name: experiment.name,
        campaign: experiment.description || "Default Campaign",
        object: experiment.targetAudience || "All Players",
        uplift: 0,
        status: experiment.status === "active" ? "Active" : experiment.status === "draft" ? "Draft" : experiment.status,
        createdAt: new Date().toLocaleDateString(),
        metrics: {
          d0Retention: 0,
          d1Retention: 0,
          activationRate: 0,
          participants: 0
        }
      };

      res.json(experience);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create experience" });
    }
  });

  // Get single experience with detailed information
  app.get("/api/experiences/:id", authenticateToken, async (req, res) => {
    try {
      const experienceId = parseInt(req.params.id);
      const experiment = await storage.getExperiment(experienceId);
      
      if (!experiment) {
        return res.status(404).json({ message: "Experience not found" });
      }

      // Get associated project
      const project = await storage.getProject(experiment.projectId);
      
      // Get all campaigns for this project to find associated campaign
      const campaigns = await storage.getCampaignsByProjectId(experiment.projectId);
      const campaign = campaigns.length > 0 ? campaigns[0] : null;

      // Process variants with object defaults
      const processVariants = async () => {
        try {
          // Parse the variants from the experiment if available
          if (experiment.variants) {
            const variants = typeof experiment.variants === 'string' 
              ? JSON.parse(experiment.variants) 
              : experiment.variants;
            
            // Get the object defaults for Control variant
            const getObjectDefaults = async (objectId: string) => {
              try {
                const objectData = await storage.getObject(parseInt(objectId));
                if (objectData && objectData.flags) {
                  const flags = typeof objectData.flags === 'string' ? JSON.parse(objectData.flags) : objectData.flags;
                  const defaults: any = {};
                  flags.forEach((flag: any) => {
                    if (flag.key && flag.defaultValue !== undefined) {
                      defaults[flag.key] = flag.defaultValue;
                    }
                  });
                  return defaults;
                }
              } catch (e) {
                console.error('Error getting object defaults:', e);
              }
              return {};
            };

            // Convert to the expected format
            const formattedVariants = await Promise.all(
              Object.entries(variants).map(async ([objectId, data]: [string, any]) => {
                const variantList = data.variants || [];
                const objectDefaults = await getObjectDefaults(objectId);
                
                const formattedVariantList = [
                  // Control variant with object defaults
                  { name: "Control", parameters: objectDefaults }
                ];
                
                // Add the actual variants
                variantList.forEach((variant: any, index: number) => {
                  formattedVariantList.push({
                    name: variant.name || `Variant ${String.fromCharCode(65 + index)}`,
                    parameters: variant.values || {}
                  });
                });
                
                return {
                  objectName: `Object ${objectId}`,
                  variants: formattedVariantList
                };
              })
            );
            
            return formattedVariants;
          }
        } catch (e) {
          console.error('Error parsing variants:', e);
        }
        
        // Fallback to default structure
        return [{
          objectName: "Tutorial Object",
          variants: [
            { name: "Control", parameters: {} },
            { name: "Variant A", parameters: {} }
          ]
        }];
      };

      const processedVariants = await processVariants();

      // Transform to detailed experience response
      const detailedExperience = {
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        description: experiment.description || "",
        campaign: campaign?.name || "Default Campaign",
        objects: ["Tutorial Object"],
        uplift: 4.2, // Mock data for now
        participants: 9742,
        d1Retention: 40,
        activation: 65,
        startDate: experiment.createdAt?.toISOString() || new Date().toISOString(),
        endDate: null,
        autoRollout: {
          enabled: false,
          upliftThreshold: 5,
          minUsers: 5000
        },
        campaigns: [
          {
            name: campaign?.name || "Default Campaign",
            segment: experiment.targetAudience || "All Players",
            experiencePercent: 50,
            controlPercent: 50,
            users7d: 4871
          }
        ],
        variants: processedVariants,
        metrics: [
          { date: "2025-07-08", control: 38, variantA: 42 },
          { date: "2025-07-09", control: 39, variantA: 43 },
          { date: "2025-07-10", control: 37, variantA: 41 },
          { date: "2025-07-11", control: 40, variantA: 44 },
          { date: "2025-07-12", control: 38, variantA: 42 }
        ],
        history: [
          {
            date: experiment.createdAt?.toISOString() || new Date().toISOString(),
            event: `Experience created (${experiment.status})`,
            by: "System",
            type: "created"
          }
        ]
      };

      res.json(detailedExperience);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get experience details" });
    }
  });

  // Bulk experience actions
  app.post("/api/experiences/bulk-action", authenticateToken, async (req, res) => {
    try {
      const { action, experienceIds } = req.body;
      
      if (!action || !experienceIds || !Array.isArray(experienceIds)) {
        return res.status(400).json({ message: "Invalid action or experience IDs" });
      }

      const validActions = ["pause", "resume", "archive"];
      if (!validActions.includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const statusMap = {
        pause: "paused",
        resume: "active", 
        archive: "completed"
      };

      const newStatus = statusMap[action as keyof typeof statusMap];
      const updatedExperiences = [];

      for (const id of experienceIds) {
        // Verify user has access to experiment
        const experiment = await storage.getExperiment(Number(id));
        if (experiment && experiment.userId === req.user.userId) {
          const updated = await storage.updateExperiment(Number(id), { status: newStatus });
          if (updated) {
            updatedExperiences.push(updated);
          }
        }
      }

      res.json({ 
        success: true, 
        updated: updatedExperiences.length,
        action,
        status: newStatus
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to perform bulk action" });
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

      // Convert launchDate string to Date object if provided
      if (campaignData.launchDate) {
        campaignData.launchDate = new Date(campaignData.launchDate);
      }

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
        // Ensure flags are properly parsed as JSON
        const parsedObjects = objects.map(obj => ({
          ...obj,
          flags: typeof obj.flags === 'string' ? JSON.parse(obj.flags) : obj.flags
        }));
        allObjects.push(...parsedObjects);
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

  // Get single object details
  app.get("/api/objects/:id", authenticateToken, async (req, res) => {
    try {
      const objectId = parseInt(req.params.id);
      const object = await storage.getObject(objectId);
      
      if (!object) {
        return res.status(404).json({ message: "Object not found" });
      }

      // Ensure flags are properly parsed as JSON
      const parsedObject = {
        ...object,
        flags: typeof object.flags === 'string' ? JSON.parse(object.flags) : object.flags
      };

      // Mock variants data - in production would come from actual object configuration
      const mockVariants = [
        {
          id: "control",
          name: "Control",
          isDefault: true,
          allocation: 50,
          parameters: {
            starting_coins: 100,
            enemy_speed: 1.5,
            show_tutorial: true
          }
        },
        {
          id: "variant_a",
          name: "Variant A",
          isDefault: false,
          allocation: 30,
          parameters: {
            starting_coins: 150,
            enemy_speed: 1.2,
            show_tutorial: true
          }
        },
        {
          id: "variant_b",
          name: "Variant B",
          isDefault: false,
          allocation: 20,
          parameters: {
            starting_coins: 200,
            enemy_speed: 1.0,
            show_tutorial: false
          }
        }
      ];

      const objectDetails = {
        ...parsedObject,
        variants: mockVariants,
        stats: {
          variants: mockVariants.length,
          usedByExperiences: 2,
          players7d: 48102,
          lastModified: "1 hour ago"
        }
      };

      res.json(objectDetails);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch object details" });
    }
  });

  // Get object usage (experiences using this object)
  app.get("/api/objects/:id/usage", authenticateToken, async (req, res) => {
    try {
      const objectId = parseInt(req.params.id);
      
      // Mock data for now - in production would query experiments that use this object
      const mockExperiences = [
        {
          id: 1,
          name: "Tutorial Difficulty Test",
          campaign: "Q1 Acquisition Push",
          status: "Active",
          variants: ["Easy", "Normal"],
          split: 50,
          launchDate: "2025-01-15"
        },
        {
          id: 2,
          name: "Level Rewards Experiment",
          campaign: "Google UAC Test",
          status: "Draft",
          variants: ["Standard", "Boosted"],
          split: 70,
          launchDate: "2025-01-20"
        }
      ];

      res.json(mockExperiences);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch object usage" });
    }
  });

  // Get object history
  app.get("/api/objects/:id/history", authenticateToken, async (req, res) => {
    try {
      const objectId = parseInt(req.params.id);
      
      // Mock history data - in production would come from version control/audit logs
      const mockHistory = [
        {
          id: 1,
          date: "12 Jul 09:13",
          version: "Manifest v42",
          action: "Added param enemy_speed",
          details: "• Added param enemy_speed"
        },
        {
          id: 2,
          date: "07 Jul 14:21",
          version: "Manifest v40",
          action: "Updated default starting_coins 80→100",
          details: "• Updated default starting_coins 80→100"
        },
        {
          id: 3,
          date: "01 Jul 11:02",
          version: "Manifest v37",
          action: "Object created",
          details: "Object created (v37)"
        }
      ];

      res.json(mockHistory);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch object history" });
    }
  });

  // Variant API routes
  app.get("/api/objects/:objectId/variants", authenticateToken, async (req: any, res) => {
    try {
      const { objectId } = req.params;
      const variants = await storage.getVariantsByObjectId(parseInt(objectId));
      res.json(variants);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch variants" });
    }
  });

  app.post("/api/objects/:objectId/variants", authenticateToken, async (req: any, res) => {
    try {
      const { objectId } = req.params;
      const variantData = req.body;
      const variant = await storage.createVariant({
        ...variantData,
        objectId: parseInt(objectId),
      });
      res.status(201).json(variant);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create variant" });
    }
  });

  app.patch("/api/variants/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const variant = await storage.updateVariant(parseInt(id), updates);
      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      res.json(variant);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update variant" });
    }
  });

  app.delete("/api/variants/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteVariant(parseInt(id));
      if (!deleted) {
        return res.status(404).json({ message: "Variant not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete variant" });
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

  // OpenAI experience analysis
  app.post("/api/analyze-experience", authenticateToken, async (req, res) => {
    try {
      const { description } = req.body;
      
      if (!description || description.trim().length < 10) {
        return res.status(400).json({ message: "Description must be at least 10 characters long" });
      }

      // Get user's first project (assuming single project for now)
      const projects = await storage.getProjectsByUserId(req.user.userId);
      if (projects.length === 0) {
        return res.status(400).json({ message: "No project found for user" });
      }
      const projectId = projects[0].id;

      // Get available objects from database
      const objects = await storage.getObjectsByProjectId(projectId);
      
      // Get available segments from database 
      const segments = await storage.getSegmentsByProjectId(projectId);

      const analysis = await analyzeExperienceDescription(description, objects, segments);
      
      // Log the final analysis being sent to client
      console.log("Analysis sent to client:", JSON.stringify(analysis, null, 2));
      
      res.json(analysis);
    } catch (error) {
      console.error("Experience analysis failed:", error);
      res.status(500).json({ message: "Failed to analyze experience description" });
    }
  });

  // Team member endpoints
  app.get("/api/team-members/:projectId", authenticateToken, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const teamMembers = await storage.getTeamMembersByProjectId(projectId);
      res.json(teamMembers);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch team members" });
    }
  });

  app.post("/api/team-members", authenticateToken, async (req, res) => {
    try {
      const validation = insertTeamMemberSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid team member data", errors: validation.error.errors });
      }

      const teamMemberData = {
        ...validation.data,
        invitedBy: req.user.userId
      };

      const teamMember = await storage.createTeamMember(teamMemberData);
      res.status(201).json(teamMember);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create team member" });
    }
  });

  app.delete("/api/team-members/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTeamMember(id);
      
      if (!success) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.json({ message: "Team member removed successfully" });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to remove team member" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

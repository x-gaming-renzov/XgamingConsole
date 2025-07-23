import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertExperimentSchema, insertSegmentSchema, insertTeamMemberSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { analyzeExperienceDescription } from "./openai";
import fetch from 'node-fetch';
import { GetFeatureFlagDetailsResponse, GetFeatureFlagsResponse, FlagVariant, SegmentListResponseItem, SegmentDetailsResponse } from "./types";

const NOVA_BACKEND_URL = process.env.NOVA_BACKEND_URL || "http://127.0.0.1:8000";
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

// Helper function to call Nova backend
async function callNovaBackend<T>(endpoint: string, options: any = {}): Promise<T> {
  const response = await fetch(`${NOVA_BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nova backend error: ${response.status} - ${errorText}`);
  }

  return response.json() as T;
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

  // Experience routes (Nova Manager integration)
  app.get("/api/experiences", authenticateToken, async (req, res) => {
    try {
      const organisationId = "org123";
      const appId = "app123";

      const { search } = req.query;

      let url = `/api/v1/experiences/?organisation_id=${organisationId}&app_id=${appId}`

      if (search) {
        url += `&search=${search}`
      }

      // Call Nova Manager to get experiences
      const novaExperiences = await callNovaBackend<any[]>(url);

      res.json(novaExperiences);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch experiences" });
    }
  });

  // Get available objects (not in any experience)
  app.get("/api/objects/available", authenticateToken, async (req: any, res: any) => {
    try {
      const organisationId = "org123";
      const appId = "app123";

      // Call Nova backend to get available feature flags in a single call
      const availableFlags = await callNovaBackend<any[]>(
        `/api/v1/feature-flags/available/?organisation_id=${organisationId}&app_id=${appId}`
      );

      // Transform Nova feature flags to objects format for dashboard
      const availableObjects = availableFlags.map((flag: any) => {
        const flags = Object.entries(flag.keys_config || {}).map(
          ([keyName, keyConfig]) => ({ ...(keyConfig as any), key: keyName })
        );

        return {
          id: flag.pid,
          name: flag.name,
          description: flag.description || "",
          type: flag.type,
          flags,
          createdAt: new Date(flag.created_at).toLocaleDateString(),
          isActive: flag.is_active,
        };
      });

      res.json(availableObjects);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch available objects" });
    }
  });

  // Create experience with simplified approach
  app.post("/api/experiences", authenticateToken, async (req, res) => {
    try {
      const experienceData = req.body;
      const organisationId = "org123";
      const appId = "app123";

      // Validate required fields
      if (!experienceData.name || !experienceData.selectedObjects || !Array.isArray(experienceData.selectedObjects)) {
        return res.status(400).json({ message: "Name and selectedObjects are required" });
      }

      // Transform frontend data to Nova Manager format for simplified experience creation
      const novaExperienceData = {
        name: experienceData.name,
        description: experienceData.description || "",
        status: (experienceData.status || "active").toLowerCase(),
        organisation_id: organisationId,
        app_id: appId,
        selected_objects: experienceData.selectedObjects,
      };

      // Call Nova Manager simplified create-experience API
      const novaExperience = await callNovaBackend<any>(
        `/api/v1/experiences/`,
        {
          method: "POST",
          body: JSON.stringify(novaExperienceData),
        }
      );

      // Return in frontend format
      const experience = {
        id: novaExperience.pid,
        name: novaExperience.name,
        description: novaExperience.description || "",
        status: novaExperience.status.charAt(0).toUpperCase() + novaExperience.status.slice(1),
        createdAt: new Date(novaExperience.created_at).toLocaleDateString(),
        organisation_id: novaExperience.organisation_id,
        app_id: novaExperience.app_id,
      };

      res.json(experience);
    } catch (error) {
      console.error("Failed to create experience:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create experience" });
    }
  });

  // Get single experience with detailed information
  app.get("/api/experiences/:id", authenticateToken, async (req, res) => {
    try {
      const experienceId = req.params.id;
      
      // Call Nova Manager to get experience details
      const novaExperience = await callNovaBackend<any>(
        `/api/v1/experiences/${experienceId}/`
      );

      res.json(novaExperience);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get experience details" });
    }
  });

  // Experience Objects
  app.get("/api/experiences/:id/objects", authenticateToken, async (req, res) => {
    try {
      const experienceId = req.params.id;

      // Call Nova Manager to get experience details
      const novaExperience = await callNovaBackend<any>(
        `/api/v1/experiences/${experienceId}/features/`
      );

      res.json(novaExperience);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get experience details" });
    }
  });

  // Personalisations endpoints
  app.get("/api/personalisations", authenticateToken, async (req, res) => {
    try {
      const organisationId = "org123";
      const appId = "app123";

      // Call Nova Manager to get personalisations
      const novaPersonalisations = await callNovaBackend<any[]>(
        `/api/v1/personalisations/?organisation_id=${organisationId}&app_id=${appId}`
      );

      res.json(novaPersonalisations);
    } catch (error) {
      console.error("Failed to get personalisations:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get personalisations" });
    }
  });

  app.post("/api/personalisations", authenticateToken, async (req, res) => {
    try {
      const personalisationData = req.body;

      // Call Nova Manager to create personalisation
      const novaPersonalisation = await callNovaBackend<any>(
        `/api/v1/personalisations/create-personalisation/`,
        {
          method: "POST",
          body: JSON.stringify(req.body),
        }
      );

      res.json(novaPersonalisation);
    } catch (error) {
      console.error("Failed to create personalisation:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create personalisation" });
    }
  });

  // Experience Personalisation endpoints
  app.get("/api/personalisations/personalised-experiences/:experienceId", authenticateToken, async (req, res) => {
    try {
      const { experienceId } = req.params;
      const { skip = 0, limit = 100 } = req.query;

      // Call Nova Manager to get personalisations
      const novaPersonalisations = await callNovaBackend<any[]>(
        `/api/v1/personalisations/personalised-experiences/${experienceId}/`
      );

      res.json(novaPersonalisations);
    } catch (error) {
      console.error("Failed to get personalisations:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get personalisations" });
    }
  });

  app.get("/api/experiences/:experienceId/personalisations/:personalisationId", authenticateToken, async (req, res) => {
    try {
      const { experienceId, personalisationId } = req.params;

      // Call Nova Manager to get personalisation details
      const novaPersonalisation = await callNovaBackend<any>(
        `/api/v1/experiences/${experienceId}/personalisations/${personalisationId}/`
      );

      // Transform response to frontend format
      const personalisation = {
        id: novaPersonalisation.pid,
        name: novaPersonalisation.name,
        description: novaPersonalisation.description || "",
        experienceId: novaPersonalisation.experience_id,
        lastUpdatedAt: novaPersonalisation.last_updated_at,
        createdAt: novaPersonalisation.created_at,
        variants: novaPersonalisation.variants?.map((variant: any) => ({
          id: variant.pid,
          featureId: variant.feature_id,
          name: variant.name,
          config: variant.config,
          createdAt: variant.created_at,
        })) || [],
      };

      res.json(personalisation);
    } catch (error) {
      console.error("Failed to get personalisation:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get personalisation" });
    }
  });

  app.put("/api/experiences/:experienceId/personalisations/:personalisationId", authenticateToken, async (req, res) => {
    try {
      const { experienceId, personalisationId } = req.params;
      const personalisationData = req.body;

      // Transform frontend data to Nova Manager format
      const novaPersonalisationData: any = {};
      if (personalisationData.name) novaPersonalisationData.name = personalisationData.name;
      if (personalisationData.description) novaPersonalisationData.description = personalisationData.description;
      if (personalisationData.variants) {
        novaPersonalisationData.variants = personalisationData.variants.map((variant: any) => ({
          feature_id: variant.feature_id,
          name: variant.name || personalisationData.name,
          config: variant.config || {},
        }));
      }

      // Call Nova Manager to update personalisation
      const novaPersonalisation = await callNovaBackend<any>(
        `/api/v1/experiences/${experienceId}/personalisations/${personalisationId}/`,
        {
          method: "PUT",
          body: JSON.stringify(novaPersonalisationData),
        }
      );

      // Transform response to frontend format
      const personalisation = {
        id: novaPersonalisation.pid,
        name: novaPersonalisation.name,
        description: novaPersonalisation.description || "",
        experienceId: novaPersonalisation.experience_id,
        lastUpdatedAt: novaPersonalisation.last_updated_at,
        createdAt: novaPersonalisation.created_at,
        variants: novaPersonalisation.variants?.map((variant: any) => ({
          id: variant.pid,
          featureId: variant.feature_id,
          name: variant.name,
          config: variant.config,
          createdAt: variant.created_at,
        })) || [],
      };

      res.json(personalisation);
    } catch (error) {
      console.error("Failed to update personalisation:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update personalisation" });
    }
  });

  app.delete("/api/experiences/:experienceId/personalisations/:personalisationId", authenticateToken, async (req, res) => {
    try {
      const { experienceId, personalisationId } = req.params;

      // Call Nova Manager to delete personalisation
      await callNovaBackend<any>(
        `/api/v1/experiences/${experienceId}/personalisations/${personalisationId}/`,
        { method: "DELETE" }
      );

      res.json({ message: "Personalisation deleted successfully" });
    } catch (error) {
      console.error("Failed to delete personalisation:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete personalisation" });
    }
  });

  // Bulk experience actions
  app.post("/api/experiences/bulk-action", authenticateToken, async (req, res) => {
    try {
      // TODO: Fix this. Shouldnt delete directly from db.
      const { action, experienceIds } = req.body;
      
      if (!action || !experienceIds || !Array.isArray(experienceIds)) {
        return res.status(400).json({ message: "Invalid action or experience IDs" });
      }

      const validActions = ["pause", "resume", "archive", "delete"];
      if (!validActions.includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      // Handle delete action separately
      if (action === "delete") {
        const deletedExperiences = [];
        
        for (const id of experienceIds) {
          try {
            // Call Nova Manager to delete experience
            await callNovaBackend<any>(
              `/api/v1/experiences/${id}/`,
              { method: "DELETE" }
            );
            deletedExperiences.push(id);
          } catch (error) {
            console.error(`Failed to delete experience ${id}:`, error);
          }
        }

        return res.json({ 
          success: true, 
          deleted: deletedExperiences.length,
          action,
          experienceIds: deletedExperiences
        });
      }

      // Handle status update actions
      const statusMap = {
        pause: "paused",
        resume: "active", 
        archive: "completed"
      };

      const newStatus = statusMap[action as keyof typeof statusMap];
      const updatedExperiences = [];

      for (const id of experienceIds) {
        try {
          // Call Nova Manager to update experience status
          const updated = await callNovaBackend<any>(
            `/api/v1/experiences/${id}/status`,
            {
              method: "PUT",
              body: JSON.stringify({ status: newStatus }),
            }
          );
          if (updated) {
            updatedExperiences.push(updated);
          }
        } catch (error) {
          console.error(`Failed to update experience ${id}:`, error);
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

  // Recommendations routes
  app.post("/api/recommendations/get-ai-recommendations", authenticateToken, async (req, res) => {
    try {
      const organisationId = "org123";
      const appId = "app123";

      const userPrompt = req.body.userPrompt || "";

      // Call Nova Manager to get personalisations
      const novaPersonalisations = await callNovaBackend<any[]>(
        `/api/v1/recommendations/get-ai-recommendations/`,
        {
          method: "POST",
          body: JSON.stringify({
            organisation_id: organisationId,
            app_id: appId,
            user_prompt: userPrompt,
          })
        }
      );

      res.json(novaPersonalisations);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get AI recommendations" });
    }
  });



  // Create experience targeting rules
  app.post("/api/experiences/:experienceId/targeting-rules/", authenticateToken, async (req, res) => {
    try {
      const { experienceId } = req.params;
      const targetingRuleData = req.body;

      // Transform frontend data to Nova Manager format
      const novaSegmentData = {
        rollout_percentage: targetingRuleData.target_percentage,
        rule_config: { conditions: [] },
        personalisations: targetingRuleData.personalisation_distribution.map((item: any) => ({
          personalisation_id: item.personalisation_id,
          target_percentage: item.target_percentage,
          use_default: item.is_default || false,
        })),
        segments: [{ segment_id: targetingRuleData.segment_id, rule_config: { operator: "equals", value: "facebook" } }],
      };

      // Call Nova Manager to create experience segment
      const response = await callNovaBackend(
        `/api/v1/experiences/${experienceId}/targeting-rules/`,
        {
          method: "POST",
          body: JSON.stringify(novaSegmentData),
        }
      );

      res.json({ message: "Experience segment created successfully" });
    } catch (error) {
      console.error("Failed to create experience segment:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create experience segment" });
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
        .map(campaign => {
          // Match experiences to campaigns based on source/description
          let campaignActiveExperiences = 0;
          
          if (campaign.utmSource === "facebook") {
            // Facebook campaign gets "Double Coins for Facebook Players"
            campaignActiveExperiences = allExperiments.filter(exp => 
              exp.status === "active" && exp.name.toLowerCase().includes("facebook")
            ).length;
          } else if (campaign.utmSource === "tiktok") {
            // TikTok campaign gets "TikTok Welcome Popup Personalization"
            campaignActiveExperiences = allExperiments.filter(exp => 
              exp.status === "active" && exp.name.toLowerCase().includes("tiktok")
            ).length;
          } else if (campaign.utmSource === "google") {
            // Google campaign gets "Google UAC Welcome Bonus"
            campaignActiveExperiences = allExperiments.filter(exp => 
              exp.status === "active" && (exp.name.toLowerCase().includes("google") || exp.name.toLowerCase().includes("uac"))
            ).length;
          } else {
            // Other campaigns get remaining experiences
            campaignActiveExperiences = 0;
          }
          
          return {
            id: campaign.id,
            label: campaign.name,
            utmSource: campaign.utmSource,
            d1Highest: Number(campaign.d1Retention) + Math.floor(Math.random() * 10), // Add some variance
            d1Lowest: Math.max(Number(campaign.d1Retention) - Math.floor(Math.random() * 15), 0),
            newUsersToday: campaign.installs || 0,
            activeExperiences: campaignActiveExperiences,
            status: campaign.status as "Active" | "Paused" | "Draft"
          };
        });

      const activeExperiences = allExperiments.filter(exp => exp.status === "active").length;
      const avgD0Retention = allCampaigns.reduce((sum, c) => sum + Number(c.d0Retention || 0), 0) / Math.max(allCampaigns.length, 1);
      const avgD1Retention = allCampaigns.reduce((sum, c) => sum + Number(c.d1Retention || 0), 0) / Math.max(allCampaigns.length, 1);
      
      // Calculate average session length (mock data for now, in minutes)
      const avgSessionLength = 4.2 + (Math.random() * 2.5); // 4.2-6.7 minutes range

      const metrics = {
        activeExperiences,
        avgD0Retention: Math.round(avgD0Retention * 10) / 10,
        avgD1Retention: Math.round(avgD1Retention * 10) / 10,
        sessionLength: Math.round(avgSessionLength * 10) / 10, // Replace activationRate with sessionLength
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
      const organisationId =  "org123";
      const appId = "app123";

      // Call Nova backend to get segments
      const novaResponse = await callNovaBackend<SegmentListResponseItem[]>(
        `/api/v1/segments/?organisation_id=${organisationId}&app_id=${appId}`
      );

      // Transform Nova segments to segments format for dashboard
      const segments = novaResponse.map((segment: any) => {
        return {
          id: segment.pid,
          name: segment.name,
          description: segment.description || "",
          rule_config: segment.rule_config || { conditions: [] },
          createdAt: new Date(segment.created_at).toLocaleDateString(),
          modifiedAt: new Date(segment.modified_at).toLocaleDateString(),
          experienceCount: segment.experience_count,
        };
      });

      res.json(segments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch segments" });
    }
  });

  app.post("/api/segments", authenticateToken, async (req, res) => {
    try {
      const organisationId =  "org123";
      const appId = "app123";

      // Call Nova backend to create segement
      const segmentData = {
        organisation_id: organisationId,
        app_id: appId,
        name: req.body.name,
        description: req.body.description || "",
        rule_config: req.body.rule_config || { conditions: [] },
      };
      
      const createdSegment = await callNovaBackend<any>("/api/v1/segments/", {
        method: "POST",
        body: JSON.stringify(segmentData),
      });

      res.json({
        id: createdSegment.pid,
        name: createdSegment.name,
        description: createdSegment.description || "",
        rule_config: createdSegment.rule_config || { conditions: [] },
        createdAt: new Date(createdSegment.created_at).toLocaleDateString(),
        experienceCount: 0,
      });
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

  app.get("/api/segments/:id", authenticateToken, async (req, res) => {
    try {
      const id = req.params.id;

      // Call Nova backend to get segment details
      const novaResponse = await callNovaBackend<SegmentDetailsResponse>(
        `/api/v1/segments/${id}/`
      );

      const segmentDetails = {
        id: novaResponse.pid,
        name: novaResponse.name,
        description: novaResponse.description,
        rule_config: novaResponse.rule_config || { conditions: [] },
        createdAt: novaResponse.created_at,
        modifiedAt: novaResponse.modified_at,
        experience_segments: novaResponse.experience_segments,
      }

      res.json(segmentDetails);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch segment details" });
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
      const organisationId = "org123";
      const appId = "app123";

      // Call Nova Manager to get campaigns
      const novaCampaigns = await callNovaBackend<any[]>(
        `/api/v1/campaigns/?organisation_id=${organisationId}&app_id=${appId}`
      );

      // Transform Nova Manager campaigns to frontend format
      const campaigns = novaCampaigns.map(campaign => ({
        id: campaign.pid,
        name: campaign.name,
        description: campaign.description || "",
        status: campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1),
        ruleConfig: campaign.rule_config || { conditions: [] },
        launchedAt: campaign.launched_at,
        organisationId: campaign.organisation_id,
        appId: campaign.app_id,
        createdAt: campaign.created_at,
        modifiedAt: campaign.modified_at,
        experienceCount: campaign.experience_count || 0,
        // Legacy fields for backward compatibility
        utmSource: campaign.rule_config?.conditions?.find((c: any) => c.field === 'utm_source')?.value || 'unknown',
        utmCampaign: campaign.rule_config?.conditions?.find((c: any) => c.field === 'utm_campaign')?.value || 'unknown',
      }));

      res.json(campaigns);
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
      const organisationId = "org123";
      const appId = "app123";
      const campaignData = req.body;

      // Transform frontend data to Nova Manager format
      const novaCampaignData = {
        name: campaignData.name || campaignData.label || `${campaignData.utmSource} Campaign`,
        description: campaignData.description || "",
        status: "draft", // New campaigns start as draft
        rule_config: {
          conditions: [
            {
              field: "utm_source",
              operator: "equals",
              value: campaignData.utmSource
            }
          ],
          operator: "AND"
        },
        launched_at: campaignData.launchDate || new Date().toISOString(),
        organisation_id: organisationId,
        app_id: appId
      };

      // Call Nova Manager to create campaign
      const novaCampaign = await callNovaBackend<any>(
        `/api/v1/campaigns/`,
        {
          method: "POST",
          body: JSON.stringify(novaCampaignData),
        }
      );

      // Return in frontend format
      const campaign = {
        id: novaCampaign.pid,
        name: novaCampaign.name,
        description: novaCampaign.description || "",
        status: novaCampaign.status.charAt(0).toUpperCase() + novaCampaign.status.slice(1),
        rule_config: novaCampaign.rule_config,
        launched_at: novaCampaign.launched_at,
        organisation_id: novaCampaign.organisation_id,
        app_id: novaCampaign.app_id,
        created_at: novaCampaign.created_at,
        modified_at: novaCampaign.modified_at,
        experience_count: novaCampaign.experience_count || 0,
        // Legacy fields for backward compatibility
        utmSource: novaCampaign.rule_config?.conditions?.find((c: any) => c.field === 'utm_source')?.value || 'unknown',
        utmCampaign: novaCampaign.rule_config?.conditions?.find((c: any) => c.field === 'utm_campaign')?.value || 'unknown',
        launchDate: novaCampaign.launched_at
      };

      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create campaign" });
      }
  });

  // Get single campaign details
  app.get("/api/campaigns/:id", authenticateToken, async (req, res) => {
    try {
      const campaignId = req.params.id;
      
      // Call Nova Manager to get campaign details
      const novaCampaign = await callNovaBackend<any>(
        `/api/v1/campaigns/${campaignId}/`
      );

      // Transform Nova Manager response to frontend format
      const detailedCampaign = {
        id: novaCampaign.pid,
        name: novaCampaign.name,
        description: novaCampaign.description || "",
        status: novaCampaign.status.charAt(0).toUpperCase() + novaCampaign.status.slice(1),
        ruleConfig: novaCampaign.rule_config,
        launchedAt: novaCampaign.launched_at,
        organisationId: novaCampaign.organisation_id,
        appId: novaCampaign.app_id,
        createdAt: novaCampaign.created_at,
        modifiedAt: novaCampaign.modified_at,
        experiences: novaCampaign.experiences || [],
        experienceCount: novaCampaign.experience_count || 0,
        activeExperiences: novaCampaign.active_experiences || 0,
        // Legacy fields for backward compatibility
        utmSource: novaCampaign.rule_config?.conditions?.find((c: any) => c.field === 'utm_source')?.value || 'unknown',
        utmCampaign: novaCampaign.rule_config?.conditions?.find((c: any) => c.field === 'utm_campaign')?.value || 'unknown',
      };

      res.json(detailedCampaign);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get campaign details" });
    }
  });

  // Update campaign
  app.put("/api/campaigns/:id", authenticateToken, async (req, res) => {
    try {
      const campaignId = req.params.id;
      const updateData = req.body;
      
      // Call Nova Manager to update campaign
      const updatedCampaign = await callNovaBackend<any>(
        `/api/v1/campaigns/${campaignId}/`,
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      // Return in frontend format
      const campaign = {
        id: updatedCampaign.pid,
        name: updatedCampaign.name,
        description: updatedCampaign.description || "",
        status: updatedCampaign.status.charAt(0).toUpperCase() + updatedCampaign.status.slice(1),
        rule_config: updatedCampaign.rule_config,
        launched_at: updatedCampaign.launched_at,
        organisation_id: updatedCampaign.organisation_id,
        app_id: updatedCampaign.app_id,
        created_at: updatedCampaign.created_at,
        modified_at: updatedCampaign.modified_at,
        // Legacy fields for backward compatibility
        utmSource: updatedCampaign.rule_config?.conditions?.find((c: any) => c.field === 'utm_source')?.value || 'unknown',
        utmCampaign: updatedCampaign.name,
        flagBundle: `${updatedCampaign.name.toLowerCase().replace(/\s+/g, '_')}_v2.1`,
        launchDate: updatedCampaign.launched_at
      };

      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update campaign" });
    }
  });

  // Object routes
  app.get("/api/objects", authenticateToken, async (req, res) => {
    try {
      const organisationId =  "org123";
      const appId = "app123";

      // Call Nova backend to get feature flags
      const novaResponse = await callNovaBackend<GetFeatureFlagsResponse>(
        `/api/v1/feature-flags/?organisation_id=${organisationId}&app_id=${appId}`
      );

      // Transform Nova feature flags to objects format for dashboard
      const objects = novaResponse.map((flag: any) => {
        const flags = Object.entries(flag.keys_config).map(
          ([keyName, keyConfig]) => ({ ...keyConfig, key: keyName })
        );

        return {
          id: flag.pid,
          name: flag.name,
          description: flag.description || "",
          type: flag.type,
          flags,
          isActive: flag.is_active,
          experiences: flag.experiences,
        };
      });

      res.json(objects);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch objects" });
    }
  });

  // app.post("/api/objects", authenticateToken, async (req, res) => {
  //   try {
  //     const projects = await storage.getProjectsByUserId(req.user.userId);
      
  //     if (projects.length === 0) {
  //       return res.status(400).json({ message: "No project found for user" });
  //     }

  //     const projectId = projects[0].id; // Use first project for now
  //     const objectData = req.body;

  //     const object = await storage.createObject({
  //       ...objectData,
  //       projectId,
  //       userId: req.user.userId
  //     });

  //     res.json(object);
  //   } catch (error) {
  //     res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create object" });
  //   }
  // });

  // Get single object details
  app.get("/api/objects/:id", authenticateToken, async (req, res) => {
    try {
      const objectId = req.params.id;

      // Call Nova backend to get detailed feature flag information
      const novaFlag = await callNovaBackend<any>(
        `/api/v1/feature-flags/${objectId}/`
      );

      const objectDetails = {
        id: novaFlag.pid,
        name: novaFlag.name,
        description: novaFlag.description,
        type: novaFlag.type,
        keys_config: novaFlag.keys_config,
        isActive: novaFlag.is_active,
        defaultVariant: novaFlag.default_variant,
        experiences: novaFlag.experiences,
      };

      console.log(objectDetails, novaFlag)

      res.json(objectDetails);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch object details" });
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
  // app.get("/api/objects/:objectId/variants", authenticateToken, async (req: any, res) => {
  //   try {
  //     const { objectId } = req.params;

  //     // Get variants from Nova backend
  //     const variants = await callNovaBackend<FlagVariant[]>(`/api/v1/feature-flags/${objectId}/variants/`);

  //     const variantsResponse = variants.map((variant) => {
  //       return {
  //         id: variant.pid,
  //         objectId,
  //         name: variant.name,
  //         payload: variant.config,
  //       }
  //     })
      
  //     res.json(variantsResponse);
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch variants" });
  //   }
  // });

  // app.post("/api/objects/:objectId/variants", authenticateToken, async (req: any, res) => {
  //   try {
  //     const { objectId } = req.params;
  //     const variantData = req.body;

  //     const variant = await callNovaBackend<GetFeatureFlagDetailsResponse>(
  //       `/api/v1/feature-flags/${objectId}/variants/`,
  //       { method: "POST", body: JSON.stringify(variantData) }
  //     );

  //     res.status(201).json(variant);
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create variant" });
  //   }
  // });

  // app.patch("/api/variants/:id", authenticateToken, async (req: any, res) => {
  //   try {
  //     const { id } = req.params;
  //     const updates = req.body;
  //     const variant = await storage.updateVariant(parseInt(id), updates);
  //     if (!variant) {
  //       return res.status(404).json({ message: "Variant not found" });
  //     }
  //     res.json(variant);
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update variant" });
  //   }
  // });

  // app.delete("/api/variants/:id", authenticateToken, async (req: any, res) => {
  //   try {
  //     const { id } = req.params;
  //     const deleted = await storage.deleteVariant(parseInt(id));
  //     if (!deleted) {
  //       return res.status(404).json({ message: "Variant not found" });
  //     }
  //     res.status(204).send();
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete variant" });
  //   }
  // });

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

  // Metrics endpoints
  app.get("/api/metrics", authenticateToken, async (req, res) => {
    try {
      const organisationId = "org123";
      const appId = "app123";

      // Call Nova Manager to get metrics
      const novaMetrics = await callNovaBackend<any[]>(
        `/api/v1/metrics/?organisation_id=${organisationId}&app_id=${appId}`
      );

      res.json(novaMetrics);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch metrics" });
    }
  });

  app.get("/api/metrics/:id", authenticateToken, async (req, res) => {
    try {
      const metricId = req.params.id;

      // Call Nova Manager to get metric details
      const novaMetric = await callNovaBackend<any>(
        `/api/v1/metrics/${metricId}/`
      );

      res.json(novaMetric);
    } catch (error) {
      console.error("Failed to fetch metric details:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch metric details" });
    }
  });


  app.post("/api/metrics/compute", authenticateToken, async (req, res) => {
    try {
      const organisationId = "org123";
      const appId = "app123";

      const { type, config } = req.body;

      // Call Nova Manager to run the metric query
      const queryData = await callNovaBackend<any>(
        `/api/v1/metrics/compute/`,
        {
          method: "POST",
          body: JSON.stringify({
            organisation_id: organisationId,
            app_id: appId,
            type,
            config,
          })
        }
      );

      console.log("queryData", queryData)
      res.json(queryData);
    } catch (error) {
      console.error("Failed to fetch metric data:", error);
      // Return empty data instead of error for better UX
      res.json([]);
    }
  });

  app.post("/api/metrics", authenticateToken, async (req, res) => {
    try {
      const organisationId = "org123";
      const appId = "app123";
      const metricData = req.body;

      // Transform frontend data to Nova Manager format
      const novaMetricData = {
        name: metricData.name,
        description: metricData.description || "",
        type: metricData.type,
        config: metricData.config,
        organisation_id: organisationId,
        app_id: appId
      };

      // Call Nova Manager to create metric
      const novaMetric = await callNovaBackend<any>(
        `/api/v1/metrics/`,
        {
          method: "POST",
          body: JSON.stringify(novaMetricData),
        }
      );

      res.json(novaMetric);
    } catch (error) {
      console.error("Failed to create metric:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create metric" });
    }
  });

  // Insights endpoints
  app.get("/api/insights/top-experiences", authenticateToken, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.json([]);
      }

      const allExperiments = [];
      for (const project of projects) {
        const experiments = await storage.getExperimentsByProjectId(project.id);
        allExperiments.push(...experiments);
      }

      // Generate realistic performance data for active experiments
      const topExperiences = allExperiments
        .filter(exp => exp.status === "active")
        .map(exp => ({
          id: exp.id,
          name: exp.name,
          campaign: exp.description || "Default Campaign",
          uplift: Math.round((Math.random() * 15 + 2) * 10) / 10, // 2-17% uplift
          confidence: Math.round((Math.random() * 20 + 80) * 10) / 10, // 80-100% confidence
          participants: Math.floor(Math.random() * 5000 + 1000) // 1000-6000 participants
        }))
        .sort((a, b) => b.uplift - a.uplift) // Sort by uplift descending
        .slice(0, 10); // Top 10

      res.json(topExperiences);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch top experiences" });
    }
  });

  app.get("/api/insights/campaign-health", authenticateToken, async (req, res) => {
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

      // Calculate campaign health based on D1 retention performance
      const campaignHealth = allCampaigns
        .filter(campaign => campaign.status === "Active")
        .map(campaign => {
          const d1Delta = Number(campaign.d1Retention) - 45; // Compare against 45% baseline
          let status: "Good" | "Warning" | "Critical" = "Good";
          
          if (d1Delta < -6) status = "Critical"; // TikTok: 38.9 - 45 = -6.1, should be Critical
          else if (d1Delta < -2) status = "Warning";
          
          return {
            campaign: campaign.name,
            d1Delta: Math.round(d1Delta * 10) / 10,
            status
          };
        });

      res.json(campaignHealth);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch campaign health" });
    }
  });

  app.get("/api/insights/ideas", authenticateToken, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user.userId);
      
      if (projects.length === 0) {
        return res.json([]);
      }

      // Get user's campaigns to generate targeted ideas
      const allCampaigns = [];
      const allExperiments = [];
      
      for (const project of projects) {
        const campaigns = await storage.getCampaignsByProjectId(project.id);
        const experiments = await storage.getExperimentsByProjectId(project.id);
        allCampaigns.push(...campaigns);
        allExperiments.push(...experiments);
      }

      // Generate optimization ideas based on actual data
      const ideas = [];
      let idCounter = 1;

      // Check for underperforming campaigns
      const poorCampaigns = allCampaigns.filter(c => Number(c.d1Retention) < 40);
      if (poorCampaigns.length > 0) {
        ideas.push({
          id: idCounter++,
          title: `Improve ${poorCampaigns[0].name} D1 Retention`,
          description: `This campaign shows D1 retention of ${poorCampaigns[0].d1Retention}%. Consider testing welcome bonuses or tutorial improvements.`,
          impact: "High" as const,
          effort: "Medium" as const,
          category: "Retention" as const
        });
      }

      // Skip the onboarding coin rewards suggestion as requested

      // Always include a monetization idea
      ideas.push({
        id: idCounter++,
        title: "Limited-Time Purchase Bonus",
        description: "Add 50% extra coins to in-app purchases during first 24 hours of gameplay to boost early monetization.",
        impact: "High" as const,
        effort: "Medium" as const,
        category: "Monetization" as const
      });

      res.json(ideas);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch optimization ideas" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

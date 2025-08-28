import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertExperimentSchema, insertSegmentSchema, insertTeamMemberSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { analyzeExperienceDescription } from "./openai";
import fetch from 'node-fetch';
import { GetFeatureFlagDetailsResponse, GetFeatureFlagsResponse, FlagVariant, SegmentListResponseItem, SegmentDetailsResponse } from "./types";

// Extend Express Request interface
declare module 'express-serve-static-core' {
  interface Request {
    token?: string;
    user?: any; // For backward compatibility with existing routes
  }
}

const NOVA_BACKEND_URL = process.env.NOVA_BACKEND_URL || "http://127.0.0.1:8000";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to extract JWT token for FastAPI forwarding
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  // Store token for forwarding to FastAPI (don't verify here, let FastAPI handle it)
  req.token = token;
  next();
}

function requireExpiredToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  console.log('authHeader:', authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Access token required" });

  // attach raw token so FastAPI can ignore its expiry
  req.token = token;
  next();
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
    const error = new Error(`Nova backend error: ${response.status} - ${errorText}`) as any;
    error.status = response.status;
    error.responseText = errorText;
    throw error;
  }

  return response.json() as T;
}

// Helper function to handle errors consistently
function handleBackendError(error: any, res: any, defaultMessage: string) {
  console.error("Backend error:", error);
  
  if (error.status) {
    // Error from Nova backend - preserve status code
    let errorMessage = defaultMessage;
    
    try {
      // Try to parse error response as JSON
      const parsedError = JSON.parse(error.responseText);
      errorMessage = parsedError.detail || parsedError.message || defaultMessage;
    } catch {
      // If not JSON, use the raw text or default message
      errorMessage = error.responseText || defaultMessage;
    }
    
    return res.status(error.status).json({ message: errorMessage });
  } else {
    // Network or other error - use 500
    return res.status(500).json({ message: error instanceof Error ? error.message : defaultMessage });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes - Proxy to FastAPI
  app.post("/api/auth/register", async (req, res) => {
    try {
      const response = await callNovaBackend<any>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Registration failed");
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const response = await callNovaBackend<any>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Login failed");
    }
  });

  app.post("/api/auth/refresh", requireExpiredToken, async (req, res) => {
  try {
    const response = await callNovaBackend<any>("/api/v1/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${req.token}`,
      },
      body: JSON.stringify(req.body),
    });
    res.json(response);
  } catch (err) {
    handleBackendError(err, res, "Token refresh failed");
  }
});

  // Get current user
  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const response = await callNovaBackend<any>('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to get user info");
    }
  });
  
  // Get all organization users
  app.get("/api/auth/users", authenticateToken, async (req, res) => {
    try {
      const response = await callNovaBackend<any>('/api/v1/auth/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to get organization users");
    }
  });

  // Get organization and app context
  app.get("/api/auth/context", authenticateToken, async (req, res) => {
    try {
      const response = await callNovaBackend<any>('/api/v1/auth/context', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });
      res.json({
        organisation_id: response.organisation_id,
        app_id: response.app_id,
        api_key: process.env.SDK_API_KEY || 'key123',
        backend_url: process.env.NOVA_BACKEND_URL || ''
      });
    } catch (error) {
      handleBackendError(error, res, "Failed to fetch auth context");
    }
  });

  // App management - Proxy to FastAPI
  app.post("/api/auth/apps", authenticateToken, async (req, res) => {
    try {
      const response = await callNovaBackend<any>('/api/v1/auth/apps', {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "App creation failed");
    }
  });

  app.get("/api/auth/apps", authenticateToken, async (req, res) => {
    try {
      const response = await callNovaBackend<any>('/api/v1/auth/apps', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to fetch apps");
    }
  });

  app.post("/api/auth/switch-app", authenticateToken, async (req, res) => {
    try {
      const response = await callNovaBackend<any>('/api/v1/auth/switch-app', {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "App switch failed");
    }
  });

  // Invitations routes
  app.post("/api/invitations/invite", authenticateToken, async (req, res) => {
    try {
      const response = await callNovaBackend<any>('/api/v1/invitations/invite', {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to send invitation");
    }
  });

  app.get("/api/invitations/invitations", authenticateToken, async (req, res) => {
    try {
      const { status } = req.query;
      let url = '/api/v1/invitations/invitations';
      if (status) {
        url += `?status=${encodeURIComponent(status as string)}`;
      }

      const response = await callNovaBackend<any[]>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to fetch invitations");
    }
  });

  app.delete("/api/invitations/invitations/:id", authenticateToken, async (req, res) => {
    try {
      const invitationId = req.params.id;
      const response = await callNovaBackend<any>(`/api/v1/invitations/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to cancel invitation");
    }
  });

  app.get("/api/invitations/validate-invite/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const response = await callNovaBackend<any>(`/api/v1/invitations/validate-invite/${token}`, {
        method: 'GET',
      });
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to validate invitation");
    }
  });

  // Experiment routes
  // app.get("/api/experiments", authenticateToken, async (req, res) => {
  //   try {
  //     const { projectId } = req.query;
      
  //     if (!projectId) {
  //       return res.status(400).json({ message: "Project ID is required" });
  //     }

  //     // Verify user has access to project
  //     const project = await storage.getProject(Number(projectId));
  //     if (!project || project.userId !== req.user.userId) {
  //       return res.status(403).json({ message: "Access denied" });
  //     }

  //     const experiments = await storage.getExperimentsByProjectId(Number(projectId));
  //     res.json(experiments);
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch experiments" });
  //   }
  // });

  // app.post("/api/experiments", authenticateToken, async (req, res) => {
  //   try {
  //     const experimentData = insertExperimentSchema.parse(req.body);
  //     const { projectId } = req.body;

  //     // Verify user has access to project
  //     const project = await storage.getProject(projectId);
  //     if (!project || project.userId !== req.user.userId) {
  //       return res.status(403).json({ message: "Access denied" });
  //     }

  //     const experiment = await storage.createExperiment({
  //       ...experimentData,
  //       projectId,
  //       userId: req.user.userId,
  //     });
  //     res.json(experiment);
  //   } catch (error) {
  //     res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create experiment" });
  //   }
  // });

  // app.put("/api/experiments/:id", authenticateToken, async (req, res) => {
  //   try {
  //     const id = Number(req.params.id);
  //     const updates = req.body;

  //     // Verify user has access to experiment
  //     const experiment = await storage.getExperiment(id);
  //     if (!experiment || experiment.userId !== req.user.userId) {
  //       return res.status(403).json({ message: "Access denied" });
  //     }

  //     const updatedExperiment = await storage.updateExperiment(id, updates);
  //     res.json(updatedExperiment);
  //   } catch (error) {
  //     res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update experiment" });
  //   }
  // });

  // app.delete("/api/experiments/:id", authenticateToken, async (req, res) => {
  //   try {
  //     const id = Number(req.params.id);

  //     // Verify user has access to experiment
  //     const experiment = await storage.getExperiment(id);
  //     if (!experiment || experiment.userId !== req.user.userId) {
  //       return res.status(403).json({ message: "Access denied" });
  //     }

  //     const deleted = await storage.deleteExperiment(id);
  //     res.json({ success: deleted });
  //   } catch (error) {
  //     res.status(400).json({ message: error instanceof Error ? error.message : "Failed to delete experiment" });
  //   }
  // });

  // Experience routes (Nova Manager integration)
  app.get("/api/experiences", authenticateToken, async (req, res) => {
    try {
      const { search } = req.query;

      let url = `/api/v1/experiences/`;
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search as string);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Call Nova Manager to get experiences
      const novaExperiences = await callNovaBackend<any[]>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });

      res.json(novaExperiences);
    } catch (error) {
      handleBackendError(error, res, "Failed to fetch experiences");
    }
  });

  // Create experience with simplified approach
  app.post("/api/experiences", authenticateToken, async (req, res) => {
    try {
      const experienceData = req.body;

      // Validate required fields
      if (!experienceData.name || !experienceData.selectedObjects || !Array.isArray(experienceData.selectedObjects)) {
        return res.status(400).json({ message: "Name and selectedObjects are required" });
      }

      // Transform frontend data to Nova Manager format for simplified experience creation
      const novaExperienceData = {
        name: experienceData.name,
        description: experienceData.description || "",
        status: (experienceData.status || "active").toLowerCase(),
        selected_objects: experienceData.selectedObjects,
      };

      // Call Nova Manager simplified create-experience API
      const novaExperience = await callNovaBackend<any>(
        `/api/v1/experiences/`,
        {
          method: "POST",
          body: JSON.stringify(novaExperienceData),
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      // Return in frontend format (no internal IDs exposed)
      const experience = {
        id: novaExperience.pid,
        name: novaExperience.name,
        description: novaExperience.description || "",
        status: novaExperience.status.charAt(0).toUpperCase() + novaExperience.status.slice(1),
        createdAt: new Date(novaExperience.created_at).toLocaleDateString(),
      };

      res.json(experience);
    } catch (error) {
      console.error("Failed to create experience:", error);
      handleBackendError(error, res, "Failed to create experience");
    }
  });

  // Get single experience with detailed information
  app.get("/api/experiences/:id", authenticateToken, async (req, res) => {
    try {
      const experienceId = req.params.id;
      
      // Call Nova Manager to get experience details
      const novaExperience = await callNovaBackend<any>(
        `/api/v1/experiences/${experienceId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaExperience);
    } catch (error) {
      handleBackendError(error, res, "Failed to get experience details");
    }
  });

  // Experience Objects
  app.get("/api/experiences/:id/objects", authenticateToken, async (req, res) => {
    try {
      const experienceId = req.params.id;

      // Call Nova Manager to get experience details
      const novaExperience = await callNovaBackend<any>(
        `/api/v1/experiences/${experienceId}/features/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaExperience);
    } catch (error) {
      handleBackendError(error, res, "Failed to get experience objects");
    }
  });

  // Personalisations endpoints
  app.get("/api/personalisations", authenticateToken, async (req, res) => {
    try {
      // Call Nova Manager to get personalisations - JWT contains org/app context
      const novaPersonalisations = await callNovaBackend<any[]>(
        `/api/v1/personalisations/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaPersonalisations);
    } catch (error) {
      console.error("Failed to get personalisations:", error);
      handleBackendError(error, res, "Failed to get personalisations");
    }
  });
  
  // Get a single personalisation by ID
  app.get("/api/personalisations/:id", authenticateToken, async (req, res) => {
    try {
      const personalisationId = req.params.id;
      
      // Call Nova Manager to get personalisation details
      const novaPersonalisation = await callNovaBackend<any>(
        `/api/v1/personalisations/${personalisationId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaPersonalisation);
    } catch (error) {
      console.error("Failed to get personalisation:", error);
      handleBackendError(error, res, "Failed to get personalisation details");
    }
  });

  app.patch("/api/personalisations/:id", authenticateToken, async (req, res) => {
    try {
      const personalisationId = req.params.id;
      
      // Call Nova Manager to update personalisation details
      const novaPersonalisation = await callNovaBackend<any>(
        `/api/v1/personalisations/${personalisationId}/`,
        {
          method: 'PATCH',
          body: JSON.stringify(req.body),
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaPersonalisation);
    } catch (error) {
      console.error("Failed to update personalisation:", error);
      handleBackendError(error, res, "Failed to update personalisation");
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
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaPersonalisation);
    } catch (error) {
      console.error("Failed to create personalisation:", error);
      handleBackendError(error, res, "Failed to create personalisation");
    }
  });
  
  // Experience Personalisation endpoints
  app.get("/api/personalisations/personalised-experiences/:experienceId", authenticateToken, async (req, res) => {
    try {
      const { experienceId } = req.params;
      const { skip = 0, limit = 100 } = req.query;

      // Call Nova Manager to get personalisations
      const novaPersonalisations = await callNovaBackend<any[]>(
        `/api/v1/personalisations/personalised-experiences/${experienceId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaPersonalisations);
    } catch (error) {
      console.error("Failed to get personalisations:", error);
      handleBackendError(error, res, "Failed to get personalised experiences");
    }
  });

  app.get("/api/experiences/:experienceId/personalisations/:personalisationId", authenticateToken, async (req, res) => {
    try {
      const { experienceId, personalisationId } = req.params;

      // Call Nova Manager to get personalisation details
      const novaPersonalisation = await callNovaBackend<any>(
        `/api/v1/experiences/${experienceId}/personalisations/${personalisationId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
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
      console.error("Failed to get personalisation:", error);
      handleBackendError(error, res, "Failed to get personalisation");
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
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
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
      handleBackendError(error, res, "Failed to update personalisation");
    }
  });

  app.delete("/api/experiences/:experienceId/personalisations/:personalisationId", authenticateToken, async (req, res) => {
    try {
      const { experienceId, personalisationId } = req.params;

      // Call Nova Manager to delete personalisation
      await callNovaBackend<any>(
        `/api/v1/experiences/${experienceId}/personalisations/${personalisationId}/`,
        {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json({ message: "Personalisation deleted successfully" });
    } catch (error) {
      console.error("Failed to delete personalisation:", error);
      handleBackendError(error, res, "Failed to delete personalisation");
    }
  });

  // Recommendations routes
  app.post("/api/recommendations/get-ai-recommendations", authenticateToken, async (req, res) => {
    try {
      const userPrompt = req.body.userPrompt || "";

      // Call Nova Manager to get recommendations - JWT contains org/app context
      const novaPersonalisations = await callNovaBackend<any[]>(
        `/api/v1/recommendations/get-ai-recommendations/`,
        {
          method: "POST",
          body: JSON.stringify({
            user_prompt: userPrompt,
          }),
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaPersonalisations);
    } catch (error) {
      handleBackendError(error, res, "Failed to get AI recommendations");
    }
  });

  // Analytics routes
  // app.get("/api/analytics/dashboard", authenticateToken, async (req, res) => {
  //   try {
  //     const { projectId } = req.query;
      
  //     if (!projectId) {
  //       return res.status(400).json({ message: "Project ID is required" });
  //     }

  //     // Verify user has access to project
  //     const project = await storage.getProject(Number(projectId));
  //     if (!project || project.userId !== req.user.userId) {
  //       return res.status(403).json({ message: "Access denied" });
  //     }

  //     const experiments = await storage.getExperimentsByProjectId(Number(projectId));
      
  //     // Calculate analytics
  //     const activeExperiments = experiments.filter(exp => exp.status === "running").length;
  //     const completedExperiments = experiments.filter(exp => exp.status === "completed").length;
      
  //     // Mock analytics data for now
  //     const analytics = {
  //       activeExperiments,
  //       completedExperiments,
  //       totalExperiments: experiments.length,
  //       avgCompletionRate: 67.3,
  //       dayOneRetention: 42.1,
  //       recentExperiments: experiments.slice(0, 5),
  //     };

  //     res.json(analytics);
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch analytics" });
  //   }
  // });

  // Get dashboard metrics overview
  // app.get("/api/metrics/overview", authenticateToken, async (req, res) => {
  //   try {
  //     // Get user's projects to calculate metrics
  //     const projects = await storage.getProjectsByUserId(req.user.userId);
      
  //     if (projects.length === 0) {
  //       return res.json({
  //         activeExperiences: 0,
  //         avgD0Retention: 0,
  //         avgD1Retention: 0,
  //         activationRate: 0,
  //         campaignsNeedAttention: false,
  //         activeCampaigns: []
  //       });
  //     }

  //     // Get all campaigns for user's projects
  //     const allCampaigns = [];
  //     const allExperiments: any[] = [];
      
  //     for (const project of projects) {
  //       const campaigns = await storage.getCampaignsByProjectId(project.id);
  //       const experiments = await storage.getExperimentsByProjectId(project.id);
  //       allCampaigns.push(...campaigns);
  //       allExperiments.push(...experiments);
  //     }

  //     // Filter active campaigns and calculate metrics
  //     const activeCampaigns = allCampaigns
  //       .filter(campaign => campaign.status === "Active")
  //       .map(campaign => {
  //         // Match experiences to campaigns based on source/description
  //         let campaignActiveExperiences = 0;
          
  //         if (campaign.utmSource === "facebook") {
  //           // Facebook campaign gets "Double Coins for Facebook Players"
  //           campaignActiveExperiences = allExperiments.filter(exp => 
  //             exp.status === "active" && exp.name.toLowerCase().includes("facebook")
  //           ).length;
  //         } else if (campaign.utmSource === "tiktok") {
  //           // TikTok campaign gets "TikTok Welcome Popup Personalization"
  //           campaignActiveExperiences = allExperiments.filter(exp => 
  //             exp.status === "active" && exp.name.toLowerCase().includes("tiktok")
  //           ).length;
  //         } else if (campaign.utmSource === "google") {
  //           // Google campaign gets "Google UAC Welcome Bonus"
  //           campaignActiveExperiences = allExperiments.filter(exp => 
  //             exp.status === "active" && (exp.name.toLowerCase().includes("google") || exp.name.toLowerCase().includes("uac"))
  //           ).length;
  //         } else {
  //           // Other campaigns get remaining experiences
  //           campaignActiveExperiences = 0;
  //         }
          
  //         return {
  //           id: campaign.id,
  //           label: campaign.name,
  //           utmSource: campaign.utmSource,
  //           d1Highest: Number(campaign.d1Retention) + Math.floor(Math.random() * 10), // Add some variance
  //           d1Lowest: Math.max(Number(campaign.d1Retention) - Math.floor(Math.random() * 15), 0),
  //           newUsersToday: campaign.installs || 0,
  //           activeExperiences: campaignActiveExperiences,
  //           status: campaign.status as "Active" | "Paused" | "Draft"
  //         };
  //       });

  //     const activeExperiences = allExperiments.filter(exp => exp.status === "active").length;
  //     const avgD0Retention = allCampaigns.reduce((sum, c) => sum + Number(c.d0Retention || 0), 0) / Math.max(allCampaigns.length, 1);
  //     const avgD1Retention = allCampaigns.reduce((sum, c) => sum + Number(c.d1Retention || 0), 0) / Math.max(allCampaigns.length, 1);
      
  //     // Calculate average session length (mock data for now, in minutes)
  //     const avgSessionLength = 4.2 + (Math.random() * 2.5); // 4.2-6.7 minutes range

  //     const metrics = {
  //       activeExperiences,
  //       avgD0Retention: Math.round(avgD0Retention * 10) / 10,
  //       avgD1Retention: Math.round(avgD1Retention * 10) / 10,
  //       sessionLength: Math.round(avgSessionLength * 10) / 10, // Replace activationRate with sessionLength
  //       campaignsNeedAttention: activeCampaigns.some(c => c.d1Lowest < 40),
  //       activeCampaigns: activeCampaigns.slice(0, 3) // Show top 3
  //     };

  //     res.json(metrics);
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch metrics" });
  //   }
  // });

  // Segments routes
  app.get("/api/segments", authenticateToken, async (req, res) => {
    try {
      // Call Nova backend to get segments - JWT contains org/app context
      const novaResponse = await callNovaBackend<SegmentListResponseItem[]>(
        `/api/v1/segments/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
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
      handleBackendError(error, res, "Failed to fetch segments");
    }
  });

  app.post("/api/segments", authenticateToken, async (req, res) => {
    try {
      // Call Nova backend to create segment - JWT contains org/app context
      const segmentData = {
        name: req.body.name,
        description: req.body.description || "",
        rule_config: req.body.rule_config || { conditions: [] },
      };
      
      const createdSegment = await callNovaBackend<any>("/api/v1/segments/", {
        method: "POST",
        body: JSON.stringify(segmentData),
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
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
      handleBackendError(error, res, "Failed to create segment");
    }
  });

  app.get("/api/segments/:id", authenticateToken, async (req, res) => {
    try {
      const id = req.params.id;

      // Call Nova backend to get segment details
      const novaResponse = await callNovaBackend<SegmentDetailsResponse>(
        `/api/v1/segments/${id}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
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
      handleBackendError(error, res, "Failed to fetch segment details");
    }
  });

  // Campaign routes
  app.get("/api/campaigns", authenticateToken, async (req, res) => {
    try {
      // Call Nova Manager to get campaigns - JWT contains org/app context
      const novaCampaigns = await callNovaBackend<any[]>(
        `/api/v1/campaigns/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
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
      handleBackendError(error, res, "Failed to fetch campaigns");
    }
  });

  app.post("/api/campaigns", authenticateToken, async (req, res) => {
    try {
      const campaignData = req.body;

      // Transform frontend data to Nova Manager format - JWT contains org/app context
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
      };

      // Call Nova Manager to create campaign
      const novaCampaign = await callNovaBackend<any>(
        `/api/v1/campaigns/`,
        {
          method: "POST",
          body: JSON.stringify(novaCampaignData),
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
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
      handleBackendError(error, res, "Failed to create campaign");
      }
  });

  // Get single campaign details
  app.get("/api/campaigns/:id", authenticateToken, async (req, res) => {
    try {
      const campaignId = req.params.id;
      
      // Call Nova Manager to get campaign details
      const novaCampaign = await callNovaBackend<any>(
        `/api/v1/campaigns/${campaignId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
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
      handleBackendError(error, res, "Failed to get campaign details");
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
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
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
      handleBackendError(error, res, "Failed to update campaign");
    }
  });

  // Object routes
  app.get("/api/objects", authenticateToken, async (req, res) => {
    try {
      // Call Nova backend to get feature flags - JWT contains org/app context
      const novaResponse = await callNovaBackend<GetFeatureFlagsResponse>(
        `/api/v1/feature-flags/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      // Transform Nova feature flags to objects format for dashboard
      const objects = novaResponse.map((flag: any) => {
        const flags = Object.entries(flag.keys_config).map(
          ([keyName, keyConfig]) => ({ ...(keyConfig as any), key: keyName })
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
      handleBackendError(error, res, "Failed to fetch objects");
    }
  });

  // Get single object details
  app.get("/api/objects/:id", authenticateToken, async (req, res) => {
    try {
      const objectId = req.params.id;

      // Call Nova backend to get detailed feature flag information
      const novaFlag = await callNovaBackend<any>(
        `/api/v1/feature-flags/${objectId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
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
      handleBackendError(error, res, "Failed to fetch object details");
    }
  });

  // OpenAI experience analysis
  // app.post("/api/analyze-experience", authenticateToken, async (req, res) => {
  //   try {
  //     const { description } = req.body;
      
  //     if (!description || description.trim().length < 10) {
  //       return res.status(400).json({ message: "Description must be at least 10 characters long" });
  //     }

  //     // Get user's first project (assuming single project for now)
  //     const projects = await storage.getProjectsByUserId(req.user.userId);
  //     if (projects.length === 0) {
  //       return res.status(400).json({ message: "No project found for user" });
  //     }
  //     const projectId = projects[0].id;

  //     // Get available objects from database
  //     const objects = await storage.getObjectsByProjectId(projectId);
      
  //     // Get available segments from database 
  //     const segments = await storage.getSegmentsByProjectId(projectId);

  //     const analysis = await analyzeExperienceDescription(description, objects, segments);
      
  //     // Log the final analysis being sent to client
  //     console.log("Analysis sent to client:", JSON.stringify(analysis, null, 2));
      
  //     res.json(analysis);
  //   } catch (error) {
  //     console.error("Experience analysis failed:", error);
  //     res.status(500).json({ message: "Failed to analyze experience description" });
  //   }
  // });

  // Metrics Builder endpoints
  app.post("/api/metrics/compute", authenticateToken, async (req, res) => {
    try {
      const { type, config } = req.body;

      // Call Nova Manager to run the metric query - JWT contains org/app context
      const queryData = await callNovaBackend<any>(
        `/api/v1/metrics/compute/`,
        {
          method: "POST",
          body: JSON.stringify({
            type,
            config,
          }),
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
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

  // Events schema endpoints
  app.get("/api/metrics/events-schema", authenticateToken, async (req, res) => {
    try {
      const { search } = req.query;

      let url = `/api/v1/metrics/events-schema/`;
      
      if (search) {
        url += `?search=${encodeURIComponent(search as string)}`;
      }

      // Call Nova Manager to get events schema - JWT contains org/app context
      const novaEventsSchema = await callNovaBackend<any[]>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });

      res.json(novaEventsSchema);
    } catch (error) {
      console.error("Failed to fetch events schema:", error);
      handleBackendError(error, res, "Failed to fetch events schema");
    }
  });

  // User profile keys endpoints
  app.get("/api/metrics/user-profile-keys", authenticateToken, async (req, res) => {
    try {
      const { search } = req.query;

      let url = `/api/v1/metrics/user-profile-keys/`;
      
      if (search) {
        url += `?search=${encodeURIComponent(search as string)}`;
      }

      // Call Nova Manager to get user profile keys - JWT contains org/app context
      const novaUserProfileKeys = await callNovaBackend<any[]>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });

      res.json(novaUserProfileKeys);
    } catch (error) {
      console.error("Failed to fetch user profile keys:", error);
      handleBackendError(error, res, "Failed to fetch user profile keys");
    }
  });

  // Metrics endpoints
  app.get("/api/metrics", authenticateToken, async (req, res) => {
    try {
      // Call Nova Manager to get metrics - JWT contains org/app context
      const novaMetrics = await callNovaBackend<any[]>(
        `/api/v1/metrics/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaMetrics);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      handleBackendError(error, res, "Failed to fetch metrics");
    }
  });

  app.get("/api/metrics/:id", authenticateToken, async (req, res) => {
    try {
      const metricId = req.params.id;

      // Call Nova Manager to get metric details
      const novaMetric = await callNovaBackend<any>(
        `/api/v1/metrics/${metricId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaMetric);
    } catch (error) {
      console.error("Failed to fetch metric details:", error);
      handleBackendError(error, res, "Failed to fetch metric details");
    }
  });

  app.post("/api/metrics", authenticateToken, async (req, res) => {
    try {
      const metricData = req.body;

      // Transform frontend data to Nova Manager format - JWT contains org/app context
      const novaMetricData = {
        name: metricData.name,
        description: metricData.description || "",
        type: metricData.type,
        config: metricData.config,
      };

      // Call Nova Manager to create metric
      const novaMetric = await callNovaBackend<any>(
        `/api/v1/metrics/`,
        {
          method: "POST",
          body: JSON.stringify(novaMetricData),
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaMetric);
    } catch (error) {
      console.error("Failed to create metric:", error);
      handleBackendError(error, res, "Failed to create metric");
    }
  });

  app.put("/api/metrics/:id", authenticateToken, async (req, res) => {
    try {
      const metricId = req.params.id;
      const metricData = req.body;

      // Transform frontend data to Nova Manager format
      const novaMetricData = {
        name: metricData.name,
        description: metricData.description || "",
        type: metricData.type,
        config: metricData.config,
      };

      // Call Nova Manager to update metric
      const novaMetric = await callNovaBackend<any>(
        `/api/v1/metrics/${metricId}/`,
        {
          method: "PUT",
          body: JSON.stringify(novaMetricData),
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );

      res.json(novaMetric);
    } catch (error) {
      console.error("Failed to update metric:", error);
      handleBackendError(error, res, "Failed to update metric");
    }
  });

  // Insights endpoints
  // app.get("/api/insights/top-experiences", authenticateToken, async (req, res) => {
  //   try {
  //     const projects = await storage.getProjectsByUserId(req.user.userId);
      
  //     if (projects.length === 0) {
  //       return res.json([]);
  //     }

  //     const allExperiments: any[] = [];
  //     for (const project of projects) {
  //       const experiments = await storage.getExperimentsByProjectId(project.id);
  //       allExperiments.push(...experiments);
  //     }

  //     // Generate realistic performance data for active experiments
  //     const topExperiences = allExperiments
  //       .filter(exp => exp.status === "active")
  //       .map(exp => ({
  //         id: exp.id,
  //         name: exp.name,
  //         campaign: exp.description || "Default Campaign",
  //         uplift: Math.round((Math.random() * 15 + 2) * 10) / 10, // 2-17% uplift
  //         confidence: Math.round((Math.random() * 20 + 80) * 10) / 10, // 80-100% confidence
  //         participants: Math.floor(Math.random() * 5000 + 1000) // 1000-6000 participants
  //       }))
  //       .sort((a, b) => b.uplift - a.uplift) // Sort by uplift descending
  //       .slice(0, 10); // Top 10

  //     res.json(topExperiences);
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch top experiences" });
  //   }
  // });

  // app.get("/api/insights/campaign-health", authenticateToken, async (req, res) => {
  //   try {
  //     const projects = await storage.getProjectsByUserId(req.user.userId);
      
  //     if (projects.length === 0) {
  //       return res.json([]);
  //     }

  //     const allCampaigns = [];
  //     for (const project of projects) {
  //       const campaigns = await storage.getCampaignsByProjectId(project.id);
  //       allCampaigns.push(...campaigns);
  //     }

  //     // Calculate campaign health based on D1 retention performance
  //     const campaignHealth = allCampaigns
  //       .filter(campaign => campaign.status === "Active")
  //       .map(campaign => {
  //         const d1Delta = Number(campaign.d1Retention) - 45; // Compare against 45% baseline
  //         let status: "Good" | "Warning" | "Critical" = "Good";
          
  //         if (d1Delta < -6) status = "Critical"; // TikTok: 38.9 - 45 = -6.1, should be Critical
  //         else if (d1Delta < -2) status = "Warning";
          
  //         return {
  //           campaign: campaign.name,
  //           d1Delta: Math.round(d1Delta * 10) / 10,
  //           status
  //         };
  //       });

  //     res.json(campaignHealth);
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch campaign health" });
  //   }
  // });

  // app.get("/api/insights/ideas", authenticateToken, async (req, res) => {
  //   try {
  //     const projects = await storage.getProjectsByUserId(req.user.userId);
      
  //     if (projects.length === 0) {
  //       return res.json([]);
  //     }

  //     // Get user's campaigns to generate targeted ideas
  //     const allCampaigns = [];
  //     const allExperiments: any[] = [];
      
  //     for (const project of projects) {
  //       const campaigns = await storage.getCampaignsByProjectId(project.id);
  //       const experiments = await storage.getExperimentsByProjectId(project.id);
  //       allCampaigns.push(...campaigns);
  //       allExperiments.push(...experiments);
  //     }

  //     // Generate optimization ideas based on actual data
  //     const ideas = [];
  //     let idCounter = 1;

  //     // Check for underperforming campaigns
  //     const poorCampaigns = allCampaigns.filter(c => Number(c.d1Retention) < 40);
  //     if (poorCampaigns.length > 0) {
  //       ideas.push({
  //         id: idCounter++,
  //         title: `Improve ${poorCampaigns[0].name} D1 Retention`,
  //         description: `This campaign shows D1 retention of ${poorCampaigns[0].d1Retention}%. Consider testing welcome bonuses or tutorial improvements.`,
  //         impact: "High" as const,
  //         effort: "Medium" as const,
  //         category: "Retention" as const
  //       });
  //     }

  //     // Skip the onboarding coin rewards suggestion as requested

  //     // Always include a monetization idea
  //     ideas.push({
  //       id: idCounter++,
  //       title: "Limited-Time Purchase Bonus",
  //       description: "Add 50% extra coins to in-app purchases during first 24 hours of gameplay to boost early monetization.",
  //       impact: "High" as const,
  //       effort: "Medium" as const,
  //       category: "Monetization" as const
  //     });

  //     res.json(ideas);
  //   } catch (error) {
  //     res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch optimization ideas" });
  //   }
  // });

  app.patch("/api/personalisations/:id/enable", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const response = await callNovaBackend<any>(
        `/api/v1/personalisations/${id}/enable/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );
      res.json(response);
    } catch (error) {
      console.error("Failed to enable personalisation:", error);
      handleBackendError(error, res, "Failed to enable personalisation");
    }
  });

  // Disable personalisation
  app.patch("/api/personalisations/:id/disable", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const response = await callNovaBackend<any>(
        `/api/v1/personalisations/${id}/disable/`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${req.token}`,
          },
        }
      );
      res.json(response);
    } catch (error) {
      console.error("Failed to disable personalisation:", error);
      handleBackendError(error, res, "Failed to disable personalisation");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

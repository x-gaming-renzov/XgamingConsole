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

  // API Keys routes - Proxy to Nova backend
  app.post("/api/apikeys/generate", authenticateToken, async (req, res) => {
    try {
      const response = await callNovaBackend<any>(`/api/v1/apikeys/generate`, {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });

      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to generate API key");
    }
  });

  app.get("/api/apikeys", authenticateToken, async (req, res) => {
    try {
      const response = await callNovaBackend<any[]>(`/api/v1/apikeys/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });

      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to fetch API keys");
    }
  });

  app.delete("/api/apikeys", authenticateToken, async (req, res) => {
    try {
      const { name } = req.query;
      let url = '/api/v1/apikeys/';
      if (name) url += `?name=${encodeURIComponent(name as string)}`;

      const response = await callNovaBackend<any>(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${req.token}`,
        },
      });

      // Forward backend response (may be empty or contain detail)
      res.json(response);
    } catch (error) {
      handleBackendError(error, res, "Failed to delete API key");
    }
  });

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

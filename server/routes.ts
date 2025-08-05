import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertExperimentSchema, insertSegmentSchema, insertTeamMemberSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { analyzeExperienceDescription } from "./openai";
import fetch from 'node-fetch';
import { AsyncLocalStorage } from 'async_hooks';
import { registerNovaRoutes } from './routes/novaRoutes';
import { registerMembershipRoutes } from './routes/membershipRoutes';
import { GetFeatureFlagDetailsResponse, GetFeatureFlagsResponse, FlagVariant, SegmentListResponseItem, SegmentDetailsResponse } from "./types";

const NOVA_BACKEND_URL = process.env.NOVA_BACKEND_URL || "http://127.0.0.1:8000";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// AsyncLocalStorage to propagate the original Authorization header
const authStorage = new AsyncLocalStorage<{ authHeader?: string }>();

// Middleware to verify JWT token
export function authenticateToken(req: any, res: any, next: any) {
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
export async function callNovaBackend<T>(endpoint: string, options: any = {}): Promise<T> {
  console.log(`callNovaBackend: forwarding request to Nova ${NOVA_BACKEND_URL}${endpoint}`, options);
  // Retrieve auth header saved in AsyncLocalStorage
  const store = authStorage.getStore();
  const forwardedAuth = store?.authHeader;
  // Merge headers: content-type, forwarded auth, and any custom headers
  const headers = {
    'Content-Type': 'application/json',
    ...(forwardedAuth ? { Authorization: forwardedAuth } : {}),
    ...options.headers,
  };
  const response = await fetch(`${NOVA_BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nova backend error: ${response.status} - ${errorText}`);
  }

  return response.json() as T;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Log all incoming API requests and capture auth header for Nova calls
  app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.path}`);
    // Run with AsyncLocalStorage to forward auth header
    authStorage.run({ authHeader: req.headers['authorization'] as string | undefined }, () => {
      next();
    });
  });
  // Auth routes
  // Proxy registration to Nova
  app.post("/api/auth/register", async (req, res) => {
    console.log('Proxy /api/auth/register -> Nova', req.body);
    try {
      const novaResp = await callNovaBackend<any>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      return res.json(novaResp);
    } catch (err: any) {
      console.error('Nova register error:', err);
      return res.status(err.status || 502).json({ message: err.message || 'Registration failed' });
    }
  });

  // Proxy login to Nova
  app.post("/api/auth/login", async (req, res) => {
    console.log('Proxy /api/auth/login -> Nova', req.body);
    try {
      // Prepare OAuth2 form data for Nova token endpoint
      const { email, password } = req.body;
      const form = new URLSearchParams({
        grant_type: 'password',
        username: email,
        password,
        scope: '',
        client_id: '',
        client_secret: ''
      }).toString();
      const novaResp = await callNovaBackend<any>('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      return res.json(novaResp);
    } catch (err: any) {
      console.error('Nova login error:', err);
      return res.status(err.status || 502).json({ message: err.message || 'Login failed' });
    }
  });
  // Nova proxy routes (orgs & apps)
  registerNovaRoutes(app);
  // Nova membership and invitation routes
  registerMembershipRoutes(app);


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

  // Metrics Builder endpoints
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

  // Events schema endpoints
  app.get("/api/metrics/events-schema", authenticateToken, async (req, res) => {
    try {
      const organisationId = "org123";
      const appId = "app123";
      const { search } = req.query;

      let url = `/api/v1/metrics/events-schema/?organisation_id=${organisationId}&app_id=${appId}`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search as string)}`;
      }

      // Call Nova Manager to get events schema
      const novaEventsSchema = await callNovaBackend<any[]>(url);

      res.json(novaEventsSchema);
    } catch (error) {
      console.error("Failed to fetch events schema:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch events schema" });
    }
  });

  // User profile keys endpoints
  app.get("/api/metrics/user-profile-keys", authenticateToken, async (req, res) => {
    try {
      const organisationId = "org123";
      const appId = "app123";
      const { search } = req.query;

      let url = `/api/v1/metrics/user-profile-keys/?organisation_id=${organisationId}&app_id=${appId}`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search as string)}`;
      }

      // Call Nova Manager to get user profile keys
      const novaUserProfileKeys = await callNovaBackend<any[]>(url);

      res.json(novaUserProfileKeys);
    } catch (error) {
      console.error("Failed to fetch user profile keys:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch user profile keys" });
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
        }
      );

      res.json(novaMetric);
    } catch (error) {
      console.error("Failed to update metric:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update metric" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

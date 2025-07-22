import type { Express, Request, Response } from 'express';
import { authenticateToken, callNovaBackend } from '../routes';

// Register proxy routes for Nova backend: orgs and apps
export function registerNovaRoutes(app: Express) {
  // List organizations
  app.get('/api/orgs', async (req: any, res: Response) => {
    try {
      // forward orgs request to Nova, passing through auth header
      const orgs = await callNovaBackend<any[]>('/api/v1/auth/organisations', {
        headers: { Authorization: req.headers['authorization'] }
      });
      res.json(orgs);
    } catch (error: any) {
      console.error('Failed to fetch orgs:', error);
      res.status(502).json({ message: error.message || 'Failed to fetch orgs' });
    }
  });

  // List applications
  app.get('/api/apps', async (req: any, res: Response) => {
    try {
      // forward apps request to Nova, passing through auth header
      const apps = await callNovaBackend<any[]>('/api/v1/auth/apps', {
        headers: { Authorization: req.headers['authorization'] }
      });
      res.json(apps);
    } catch (error: any) {
      console.error('Failed to fetch apps:', error);
      res.status(502).json({ message: error.message || 'Failed to fetch apps' });
    }
  });
  
  // Switch app token
  app.post('/api/auth/token/app/:appPid', async (req: any, res: Response) => {
    try {
      // forward switch app to Nova
      const endpoint = `/api/v1/auth/token/app/${req.params.appPid}`;
      const result = await callNovaBackend<any>(endpoint, {
        method: 'POST',
        headers: { Authorization: req.headers['authorization'] }
      });
      res.json(result);
    } catch (error: any) {
      console.error('Failed to switch app token:', error);
      res.status(502).json({ message: error.message || 'Failed to switch app' });
    }
  });
  
  // Get app members
  app.get('/api/apps/:appPid/members', async (req: any, res: Response) => {
    try {
      const members = await callNovaBackend<any[]>(`/api/v1/apps/${req.params.appPid}/members`, {
        headers: { Authorization: req.headers['authorization'] }
      });
      res.json(members);
    } catch (error: any) {
      console.error('Failed to fetch app members:', error);
      res.status(502).json({ message: error.message || 'Failed to fetch app members' });
    }
  });
  
  // Get organization members
  app.get('/api/orgs/:orgPid/members', async (req: any, res: Response) => {
    try {
      const members = await callNovaBackend<any[]>(`/api/v1/orgs/${req.params.orgPid}/members`, {
        headers: { Authorization: req.headers['authorization'] }
      });
      res.json(members);
    } catch (error: any) {
      console.error('Failed to fetch org members:', error);
      res.status(502).json({ message: error.message || 'Failed to fetch org members' });
    }
  });
}

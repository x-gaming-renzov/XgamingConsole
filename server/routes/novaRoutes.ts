import type { Express, Request, Response } from 'express';
import { callNovaBackend } from '../routes';

// Register proxy routes for Nova backend: orgs and apps
export function registerNovaRoutes(app: Express) {
  // List organizations
  app.get('/api/orgs', async (req: any, res: Response) => {
    try {
      // forward orgs request to Nova, passing through auth header
      const orgs = await callNovaBackend<any[]>('/api/v1/auth/organisations');
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
      const apps = await callNovaBackend<any[]>('/api/v1/auth/apps');
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
      const result = await callNovaBackend<any>(endpoint, { method: 'POST' });
      res.json(result);
    } catch (error: any) {
      console.error('Failed to switch app token:', error);
      res.status(502).json({ message: error.message || 'Failed to switch app' });
    }
  });
  
  // Get app members
  app.get('/api/apps/:appPid/members', async (req: any, res: Response) => {
    try {
      const members = await callNovaBackend<any[]>(`/api/v1/apps/${req.params.appPid}/members`);
      res.json(members);
    } catch (error: any) {
      console.error('Failed to fetch app members:', error);
      res.status(502).json({ message: error.message || 'Failed to fetch app members' });
    }
  });
  
  // Get organization members
  app.get('/api/orgs/:orgPid/members', async (req: any, res: Response) => {
    try {
      const members = await callNovaBackend<any[]>(`/api/v1/orgs/${req.params.orgPid}/members`);
      res.json(members);
    } catch (error: any) {
      console.error('Failed to fetch org members:', error);
      res.status(502).json({ message: error.message || 'Failed to fetch org members' });
    }
  });

  app.post('/api/orgs', async (req: Request, res: Response) => {
    try {
      const org = await callNovaBackend<{ pid: string; name: string }>(
        '/api/v1/auth/organisations',
        {
          method: 'POST',
          body: JSON.stringify(req.body),
        }
      );
      res.json(org);
    } catch (err: any) {
      console.error('Failed to create organisation:', err);
      res.status(502).json({ message: 'Failed to create organisation' });
    }
  });

  // Create app under an organisation
  app.post('/api/orgs/:orgPid/apps', async (req: Request, res: Response) => {
    try {
      const appResp = await callNovaBackend<{ pid: string; name: string }>(
        `/api/v1/auth/organisations/${req.params.orgPid}/apps`,
        {
          method: 'POST',
          body: JSON.stringify(req.body),
        }
      );
      res.json(appResp);
    } catch (err: any) {
      console.error('Failed to create app:', err);
      res.status(502).json({ message: 'Failed to create app' });
    }
  });
}

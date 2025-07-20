import type { Express, Request, Response } from 'express';
import { authenticateToken, callNovaBackend } from '../routes';

// Register proxy routes for Nova backend: orgs and apps
export function registerNovaRoutes(app: Express) {
  // List organizations
  app.get('/api/orgs', authenticateToken, async (req: any, res: Response) => {
    try {
      const orgs = await callNovaBackend<any[]>('/api/v1/organisations/');
      res.json(orgs);
    } catch (error: any) {
      console.error('Failed to fetch orgs:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch orgs' });
    }
  });

  // List applications
  app.get('/api/apps', authenticateToken, async (req: any, res: Response) => {
    try {
      const apps = await callNovaBackend<any[]>('/api/v1/apps/');
      res.json(apps);
    } catch (error: any) {
      console.error('Failed to fetch apps:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch apps' });
    }
  });
}

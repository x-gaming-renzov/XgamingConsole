import type { Express, Request, Response } from 'express';
import { callNovaBackend, authenticateToken } from '../routes';

// Register membership and invitation endpoints proxying to Nova
export function registerMembershipRoutes(app: Express) {
  // Invite user to organization
  app.post('/api/orgs/:orgPid/invite', authenticateToken, async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/orgs/${req.params.orgPid}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers['authorization'] },
        body: JSON.stringify(req.body),
      });
      res.status(201).json(result);
    } catch (err: any) {
      console.error('Failed to invite to org:', err);
      res.status(502).json({ message: err.message || 'Failed to invite to org' });
    }
  });

  // Invite user to application
  app.post('/api/apps/:appPid/invite', authenticateToken, async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/apps/${req.params.appPid}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers['authorization'] },
        body: JSON.stringify(req.body),
      });
      res.status(201).json(result);
    } catch (err: any) {
      console.error('Failed to invite to app:', err);
      res.status(502).json({ message: err.message || 'Failed to invite to app' });
    }
  });

  // Respond to invitation
  app.post('/api/invitations/:invitationPid/respond', authenticateToken, async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/invitations/${req.params.invitationPid}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers['authorization'] },
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to respond to invitation:', err);
      res.status(502).json({ message: err.message || 'Failed to respond to invitation' });
    }
  });

  // Change organization member role
  app.patch('/api/orgs/:orgPid/members/:userId/role', authenticateToken, async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/orgs/${req.params.orgPid}/members/${req.params.userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers['authorization'] },
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to change org member role:', err);
      res.status(502).json({ message: err.message || 'Failed to change org member role' });
    }
  });

  // Change application member role
  app.patch('/api/apps/:appPid/members/:userId/role', authenticateToken, async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/apps/${req.params.appPid}/members/${req.params.userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers['authorization'] },
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to change app member role:', err);
      res.status(502).json({ message: err.message || 'Failed to change app member role' });
    }
  });

  // Remove organization member
  app.delete('/api/orgs/:orgPid/members/:userId', authenticateToken, async (req: any, res: Response) => {
    try {
      await callNovaBackend<void>(`/api/v1/orgs/${req.params.orgPid}/members/${req.params.userId}`, {
        method: 'DELETE',
        headers: { Authorization: req.headers['authorization'] },
      });
      res.sendStatus(204);
    } catch (err: any) {
      console.error('Failed to remove org member:', err);
      res.status(502).json({ message: err.message || 'Failed to remove org member' });
    }
  });

  // Remove application member
  app.delete('/api/apps/:appPid/members/:userId', authenticateToken, async (req: any, res: Response) => {
    try {
      await callNovaBackend<void>(`/api/v1/apps/${req.params.appPid}/members/${req.params.userId}`, {
        method: 'DELETE',
        headers: { Authorization: req.headers['authorization'] },
      });
      res.sendStatus(204);
    } catch (err: any) {
      console.error('Failed to remove app member:', err);
      res.status(502).json({ message: err.message || 'Failed to remove app member' });
    }
  });

  // Self-service leave organization
  app.delete('/api/orgs/:orgPid/members/me', authenticateToken, async (req: any, res: Response) => {
    try {
      await callNovaBackend<void>(`/api/v1/orgs/${req.params.orgPid}/members/me`, {
        method: 'DELETE',
        headers: { Authorization: req.headers['authorization'] },
      });
      res.sendStatus(204);
    } catch (err: any) {
      console.error('Failed to leave org:', err);
      res.status(502).json({ message: err.message || 'Failed to leave org' });
    }
  });

  // Self-service leave application
  app.delete('/api/apps/:appPid/members/me', authenticateToken, async (req: any, res: Response) => {
    try {
      await callNovaBackend<void>(`/api/v1/apps/${req.params.appPid}/members/me`, {
        method: 'DELETE',
        headers: { Authorization: req.headers['authorization'] },
      });
      res.sendStatus(204);
    } catch (err: any) {
      console.error('Failed to leave app:', err);
      res.status(502).json({ message: err.message || 'Failed to leave app' });
    }
  });

  // Transfer organization ownership
  app.post('/api/orgs/:orgPid/transfer-ownership', authenticateToken, async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/orgs/${req.params.orgPid}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers['authorization'] },
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to transfer org ownership:', err);
      res.status(502).json({ message: err.message || 'Failed to transfer org ownership' });
    }
  });

  // Transfer application ownership
  app.post('/api/apps/:appPid/transfer-ownership', authenticateToken, async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/apps/${req.params.appPid}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: req.headers['authorization'] },
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to transfer app ownership:', err);
      res.status(502).json({ message: err.message || 'Failed to transfer app ownership' });
    }
  });
}

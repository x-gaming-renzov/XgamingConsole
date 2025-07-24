import type { Express, Request, Response } from 'express';
import { callNovaBackend } from '../routes';

// Register membership and invitation endpoints proxying to Nova
export function registerMembershipRoutes(app: Express) {
  // Invite user to organization
  app.post('/api/orgs/:orgPid/invite', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/orgs/${req.params.orgPid}/invite`, {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.status(201).json(result);
    } catch (err: any) {
      console.error('Failed to invite to org:', err);
      res.status(502).json({ message: err.message || 'Failed to invite to org' });
    }
  });

  // Invite user to application
  app.post('/api/apps/:appPid/invite', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/apps/${req.params.appPid}/invite`, {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.status(201).json(result);
    } catch (err: any) {
      console.error('Failed to invite to app:', err);
      res.status(502).json({ message: err.message || 'Failed to invite to app' });
    }
  });

  // Respond to invitation
  app.post('/api/invitations/:invitationPid/respond', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/invitations/${req.params.invitationPid}/respond`, {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to respond to invitation:', err);
      res.status(502).json({ message: err.message || 'Failed to respond to invitation' });
    }
  });

  // Change organization member role
  app.patch('/api/orgs/:orgPid/members/:userId/role', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/orgs/${req.params.orgPid}/members/${req.params.userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to change org member role:', err);
      res.status(502).json({ message: err.message || 'Failed to change org member role' });
    }
  });

  // Change application member role
  app.patch('/api/apps/:appPid/members/:userId/role', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/apps/${req.params.appPid}/members/${req.params.userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to change app member role:', err);
      res.status(502).json({ message: err.message || 'Failed to change app member role' });
    }
  });

  // Remove organization member
  app.delete('/api/orgs/:orgPid/members/:userId', async (req: any, res: Response) => {
    try {
      await callNovaBackend<void>(`/api/v1/orgs/${req.params.orgPid}/members/${req.params.userId}`, { method: 'DELETE' });
      res.sendStatus(204);
    } catch (err: any) {
      console.error('Failed to remove org member:', err);
      res.status(502).json({ message: err.message || 'Failed to remove org member' });
    }
  });

  // Remove application member
  app.delete('/api/apps/:appPid/members/:userId', async (req: any, res: Response) => {
    try {
      await callNovaBackend<void>(`/api/v1/apps/${req.params.appPid}/members/${req.params.userId}`, { method: 'DELETE' });
      res.sendStatus(204);
    } catch (err: any) {
      console.error('Failed to remove app member:', err);
      res.status(502).json({ message: err.message || 'Failed to remove app member' });
    }
  });

  // Self-service leave organization
  app.delete('/api/orgs/:orgPid/members/me', async (req: any, res: Response) => {
    try {
      await callNovaBackend<void>(`/api/v1/orgs/${req.params.orgPid}/members/me`, { method: 'DELETE' });
      res.sendStatus(204);
    } catch (err: any) {
      console.error('Failed to leave org:', err);
      res.status(502).json({ message: err.message || 'Failed to leave org' });
    }
  });

  // Self-service leave application
  app.delete('/api/apps/:appPid/members/me', async (req: any, res: Response) => {
    try {
      await callNovaBackend<void>(`/api/v1/apps/${req.params.appPid}/members/me`, { method: 'DELETE' });
      res.sendStatus(204);
    } catch (err: any) {
      console.error('Failed to leave app:', err);
      res.status(502).json({ message: err.message || 'Failed to leave app' });
    }
  });

  // Transfer organization ownership
  app.post('/api/orgs/:orgPid/transfer-ownership', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/orgs/${req.params.orgPid}/transfer-ownership`, { method: 'POST', body: JSON.stringify(req.body) });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to transfer org ownership:', err);
      res.status(502).json({ message: err.message || 'Failed to transfer org ownership' });
    }
  });

  // Transfer application ownership
  app.post('/api/apps/:appPid/transfer-ownership', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/apps/${req.params.appPid}/transfer-ownership`, { method: 'POST', body: JSON.stringify(req.body) });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to transfer app ownership:', err);
      res.status(502).json({ message: err.message || 'Failed to transfer app ownership' });
    }
  });

  // Get pending invites for organization
  app.get('/api/orgs/:orgPid/pending-invites', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/orgs/${req.params.orgPid}/pending-invites`, {
        method: 'GET',
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to get org pending invites:', err);
      res.status(502).json({ message: err.message || 'Failed to get org pending invites' });
    }
  });

  // Get pending invites for application
  app.get('/api/apps/:appPid/pending-invites', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/apps/${req.params.appPid}/pending-invites`, {
        method: 'GET',
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to get app pending invites:', err);
      res.status(502).json({ message: err.message || 'Failed to get app pending invites' });
    }
  });

  // Cancel/delete pending invite for organization
  app.delete('/api/orgs/:orgPid/pending-invites/:inviteId', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/orgs/${req.params.orgPid}/pending-invites/${req.params.inviteId}`, {
        method: 'DELETE',
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to cancel org pending invite:', err);
      res.status(502).json({ message: err.message || 'Failed to cancel org pending invite' });
    }
  });

  // Cancel/delete pending invite for application
  app.delete('/api/apps/:appPid/pending-invites/:inviteId', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/apps/${req.params.appPid}/pending-invites/${req.params.inviteId}`, {
        method: 'DELETE',
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to cancel app pending invite:', err);
      res.status(502).json({ message: err.message || 'Failed to cancel app pending invite' });
    }
  });

  // Revoke invite for organization
  app.post('/api/orgs/:orgPid/revoke-invite/:inviteId', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/orgs/${req.params.orgPid}/revoke-invite/${req.params.inviteId}`, {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to revoke org invite:', err);
      res.status(502).json({ message: err.message || 'Failed to revoke org invite' });
    }
  });

  // Revoke invite for application
  app.post('/api/apps/:appPid/revoke-invite/:inviteId', async (req: any, res: Response) => {
    try {
      const result = await callNovaBackend<any>(`/api/v1/apps/${req.params.appPid}/revoke-invite/${req.params.inviteId}`, {
        method: 'POST',
        body: JSON.stringify(req.body),
      });
      res.json(result);
    } catch (err: any) {
      console.error('Failed to revoke app invite:', err);
      res.status(502).json({ message: err.message || 'Failed to revoke app invite' });
    }
  });
}

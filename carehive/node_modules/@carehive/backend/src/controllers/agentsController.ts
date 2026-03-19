/**
 * Agent activity and interventions list
 */
import { Request, Response } from 'express';
import { getInterventionsByUser } from '../services/interventionService.js';

export async function getAgentActivity(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: 'userId required' });
      return;
    }
    const interventions = await getInterventionsByUser(userId, 50);
    const activity = interventions.map((i) => ({
      agentType: i.agentType,
      action: 'intervention',
      message: i.message,
      priority: i.priority,
      timestamp: i.createdAt,
    }));
    res.json({ activity });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch agent activity' });
  }
}

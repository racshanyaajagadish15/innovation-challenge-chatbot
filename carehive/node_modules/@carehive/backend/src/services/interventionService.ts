/**
 * Intervention engine - persist and retrieve proactive messages
 */
import type { AgentType } from '@carehive/shared';
import { supabase } from '../utils/supabaseClient.js';
import {
  createIntervention as dbCreate,
  getInterventionsByUserId,
  toIntervention,
  ensureUserRowExists,
} from '../db/supabase.js';

export async function createIntervention(
  userId: string,
  agentType: AgentType,
  message: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  // Ensure FK rows exist so the intervention insert doesn't fail on first sign-in.
  await ensureUserRowExists(userId, null);
  const { data, error } = await dbCreate({
    user_id: userId,
    agent_type: agentType,
    message,
    priority,
  });
  if (error) throw new Error(error.message);
  return data ? toIntervention(data) : null;
}

export async function getInterventionsByUser(userId: string, limit = 50) {
  const { data } = await getInterventionsByUserId(userId, limit);
  return data.map(toIntervention);
}

export async function markInterventionRead(id: string) {
  const { error } = await supabase.from('interventions').update({ read: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

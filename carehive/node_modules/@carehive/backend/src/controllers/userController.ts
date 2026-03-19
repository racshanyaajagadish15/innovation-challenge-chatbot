import { Response } from 'express';
import { getFirstUser, getUserById, upsertUserProfile, toUser, ensureUserRowExists } from '../db/supabase.js';
import { AuthRequest } from '../middleware/auth.js';
import { supabase } from '../utils/supabaseClient.js';

export async function getDemoUser(_req: AuthRequest, res: Response) {
  try {
    const { data: user, error } = await getFirstUser();
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch user' });
      return;
    }
    if (!user) {
      res.status(404).json({ error: 'No user found. Run db:seed first.' });
      return;
    }
    res.json(toUser(user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;

    // Ensure a placeholder row exists so newly-signed-in users don't fall back to demo mode.
    await ensureUserRowExists(userId, req.authUser?.email ?? null);

    const { data: user, error } = await getUserById(userId);
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch profile' });
      return;
    }
    if (!user) {
      res.status(404).json({ error: 'Profile not found. Complete sign-up with POST /api/user/profile.' });
      return;
    }
    res.json(toUser(user));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    const { name, age, condition, role } = req.body as {
      name?: string;
      age?: number;
      condition?: string;
      role?: string;
    };
    const email = req.authUser?.email ?? null;

    let validRole: string | undefined;
    if (role && ['patient', 'clinician', 'family'].includes(role)) {
      const { data: existing } = await getUserById(userId);
      const currentRole = existing?.role;
      const isFirstTimeRole = !currentRole || currentRole === 'patient';
      if (isFirstTimeRole || currentRole === role) {
        validRole = role;
      }
      console.log(`[updateProfile] role=${role}, currentRole=${currentRole}, validRole=${validRole}`);
    }

    const effectiveRole = (validRole ?? (await getUserById(userId)).data?.role ?? 'patient') as string;

    // Condition is a patient-only profile field. For clinician/family we accept it as optional.
    if (!name || typeof age !== 'number') {
      res.status(400).json({ error: 'Missing or invalid: name, age' });
      return;
    }
    const safeCondition =
      effectiveRole === 'patient'
        ? (condition || '')
        : (condition && condition.trim() ? condition : 'other');
    if (effectiveRole === 'patient' && !safeCondition) {
      res.status(400).json({ error: 'Missing or invalid: condition' });
      return;
    }

    const { data, error } = await upsertUserProfile(userId, {
      name, age, condition: safeCondition, email, role: validRole,
    });
    if (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to save profile' });
      return;
    }

    if (validRole) {
      // Persist role in two places for reliability:
      // 1. users table (DB column, may or may not exist)
      // 2. auth.users app_metadata (baked into JWT — survives page refreshes)
      try {
        await supabase.from('users').update({ role: validRole }).eq('id', userId);
        if (data) data.role = validRole;
      } catch (e) {
        console.warn('DB role update failed (column may not exist yet):', e);
      }
      try {
        await supabase.auth.admin.updateUserById(userId, {
          app_metadata: { role: validRole },
        });
        console.log(`[updateProfile] app_metadata.role set to ${validRole} for ${userId}`);
      } catch (e) {
        console.warn('app_metadata role update failed:', e);
      }
    }

    res.json(data ? toUser(data) : {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save profile' });
  }
}

export async function deleteAccount(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;
    console.log(`[deleteAccount] Deleting user ${userId}`);

    await supabase.from('medication_logs').delete().eq('user_id', userId);
    await supabase.from('medications').delete().eq('user_id', userId);
    await supabase.from('health_logs').delete().eq('user_id', userId);
    await supabase.from('interventions').delete().eq('user_id', userId);
    await supabase.from('ehr_uploads').delete().eq('user_id', userId);
    await supabase.from('user_relationships').delete().eq('from_user_id', userId);
    await supabase.from('user_relationships').delete().eq('to_user_id', userId);
    await supabase.from('users').delete().eq('id', userId);

    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (e) {
      console.warn('Could not delete auth user (may need admin privileges):', e);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('deleteAccount error:', e);
    res.status(500).json({ error: 'Failed to delete account' });
  }
}

export async function getPatients(req: AuthRequest, res: Response) {
  try {
    const userId = req.userId!;

    const { data: rels, error: relErr } = await supabase
      .from('user_relationships')
      .select('to_user_id')
      .eq('from_user_id', userId);

    if (relErr) {
      console.error('getPatients relationships error:', relErr);
      res.json({ patients: [] });
      return;
    }

    const ids = (rels ?? []).map((r: { to_user_id: string }) => r.to_user_id);
    if (ids.length === 0) {
      res.json({ patients: [] });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name, age, condition')
      .in('id', ids)
      .order('name');

    if (error) {
      console.error('getPatients users error:', error);
      res.json({ patients: [] });
      return;
    }

    res.json({ patients: data ?? [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
}

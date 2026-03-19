import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { supabase } from '../utils/supabaseClient.js';

const TABLE = 'user_relationships';

function isTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST205' || (error.message || '').includes('schema cache');
}

async function ensureTable(): Promise<void> {
  // This requires a custom SQL function in Supabase. If it doesn't exist,
  // we must fall back to asking the developer to run migrations manually.
  await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS user_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(from_user_id, to_user_id)
      );
    `,
  });

  await supabase.rpc('exec_sql', { query: "NOTIFY pgrst, 'reload schema';" });
}

async function sqlInsertRelationship(fromId: string, toId: string): Promise<void> {
  const { error } = await supabase.rpc('exec_sql', {
    query: `INSERT INTO user_relationships (from_user_id, to_user_id) VALUES ('${fromId}', '${toId}') ON CONFLICT (from_user_id, to_user_id) DO NOTHING;`,
  });
  if (error) throw error;
}

async function sqlSelectLinked(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `SELECT to_user_id FROM user_relationships WHERE from_user_id = '${userId}';`,
  });
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return data.map((r: { to_user_id: string }) => r.to_user_id);
}

async function sqlDeleteRelationship(fromId: string, toId: string): Promise<void> {
  const { error } = await supabase.rpc('exec_sql', {
    query: `DELETE FROM user_relationships WHERE from_user_id = '${fromId}' AND to_user_id = '${toId}';`,
  });
  if (error) throw error;
}

function migrationSql() {
  return `CREATE TABLE IF NOT EXISTS user_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);`;
}

export async function getLinkedPatients(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  try {
    const { data: rels, error } = await supabase
      .from(TABLE)
      .select('to_user_id')
      .eq('from_user_id', userId);

    let ids: string[] = [];

    if (error && isTableMissing(error)) {
      // Table truly missing. We cannot create tables via PostgREST; return migration SQL.
      res.json({ patients: [], migrationRequired: true, sql: migrationSql() });
      return;
    } else if (error) {
      console.error('getLinkedPatients error:', error);
      res.json({ patients: [] });
      return;
    } else {
      ids = (rels ?? []).map((r) => r.to_user_id);
    }

    if (ids.length === 0) {
      res.json({ patients: [] });
      return;
    }

    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, name, age, condition')
      .in('id', ids)
      .order('name');

    if (userErr) {
      console.error('getLinkedPatients users error:', userErr);
      res.json({ patients: [] });
      return;
    }

    res.json({ patients: users ?? [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch linked patients' });
  }
}

export async function addRelationship(req: AuthRequest, res: Response) {
  const fromUserId = req.userId!;
  const { patientId } = req.body as { patientId?: string };

  if (!patientId) {
    res.status(400).json({ error: 'patientId is required' });
    return;
  }
  if (patientId === fromUserId) {
    res.status(400).json({ error: 'Cannot add yourself' });
    return;
  }

  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { from_user_id: fromUserId, to_user_id: patientId },
        { onConflict: 'from_user_id,to_user_id' }
      );

    if (error && isTableMissing(error)) {
      res.status(500).json({
        error: 'Relationships table is missing in Supabase. Run the migration SQL in Supabase SQL Editor.',
        migrationRequired: true,
        sql: migrationSql(),
      });
      return;
    } else if (error) {
      console.error('addRelationship error:', error);
      res.status(500).json({ error: 'Failed to add relationship' });
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, name, age, condition')
      .eq('id', patientId)
      .single();

    res.json({ success: true, patient: user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add relationship' });
  }
}

export async function removeRelationship(req: AuthRequest, res: Response) {
  const fromUserId = req.userId!;
  const { patientId } = req.params;

  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('from_user_id', fromUserId)
      .eq('to_user_id', patientId);

    if (error && isTableMissing(error)) {
      try {
        await sqlDeleteRelationship(fromUserId, patientId);
      } catch (e) {
        console.error('SQL fallback delete error:', e);
        res.status(500).json({ error: 'Failed to remove relationship' });
        return;
      }
    } else if (error) {
      console.error('removeRelationship error:', error);
      res.status(500).json({ error: 'Failed to remove relationship' });
      return;
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to remove relationship' });
  }
}

export async function searchUsers(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const q = String(req.query.q || '').trim();

  if (!q || q.length < 2) {
    res.json({ users: [] });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, age, condition')
      .ilike('name', `%${q}%`)
      .neq('id', userId)
      .limit(15);

    if (error) {
      console.error('searchUsers error:', error);
      res.json({ users: [] });
      return;
    }

    res.json({ users: data ?? [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to search users' });
  }
}

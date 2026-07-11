import { createClient } from '@supabase/supabase-js';

let _supabase;
function getSupabase() {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return _supabase;
}

async function getAdminUser(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await getSupabase().auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await getSupabase().from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return null;
  return user;
}

export async function getAllUsers(req, res) {
  const admin = await getAdminUser(req.headers.authorization);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

export async function patchUser(req, res) {
  const admin = await getAdminUser(req.headers.authorization);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;
  const updates = req.body;
  const { error } = await getSupabase().from('profiles').update(updates).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
}

export async function removeUser(req, res) {
  const admin = await getAdminUser(req.headers.authorization);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  const { id } = req.params;
  const { error } = await getSupabase().auth.admin.deleteUser(id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
}

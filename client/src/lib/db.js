import { supabase } from './supabase';

// ── Progress ──────────────────────────────────────────────

export async function getProgress(userId) {
  const { data } = await supabase
    .from('progress')
    .select('module_id, percentage')
    .eq('user_id', userId);
  if (!data) return {};
  return Object.fromEntries(data.map(r => [r.module_id, r.percentage]));
}

export async function setModuleProgress(userId, moduleId, pct) {
  await supabase.from('progress').upsert(
    { user_id: userId, module_id: moduleId, percentage: pct, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,module_id' }
  );
}

// ── Sessions ─────────────────────────────────────────────

export async function getSessions(userId) {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  return data || [];
}

export async function addSession(userId, { moduleId, moduleTitle, duration }) {
  await supabase.from('sessions').insert({
    user_id: userId,
    module_id: moduleId,
    module_title: moduleTitle,
    duration,
  });
}

export function computeStreak(sessions) {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map(s => s.created_at.slice(0, 10)));
  const sorted = [...days].sort().reverse();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const day of sorted) {
    const d = new Date(day);
    const diff = Math.round((cursor - d) / 86400000);
    if (diff <= 1) { streak++; cursor = d; }
    else break;
  }
  return streak;
}

// ── Conversations ─────────────────────────────────────────

export async function getConversationHistory(userId, moduleId) {
  const { data } = await supabase
    .from('conversations')
    .select('messages')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .single();
  return data?.messages || [];
}

export async function saveConversationHistory(userId, moduleId, messages) {
  await supabase.from('conversations').upsert(
    { user_id: userId, module_id: moduleId, messages: messages.slice(-40), updated_at: new Date().toISOString() },
    { onConflict: 'user_id,module_id' }
  );
}

export async function clearConversationHistory(userId, moduleId) {
  await supabase.from('conversations')
    .update({ messages: [], updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('module_id', moduleId);
}

// ── Admin (via backend avec service_role) ─────────────────

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function adminFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAllProfiles() {
  return adminFetch('/api/admin/users');
}

export async function updateProfile(userId, updates) {
  await adminFetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteUser(userId) {
  await adminFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
}

export async function getProgressForUser(userId) {
  const { data } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId);
  return data || [];
}

export async function getSessionsForUser(userId) {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

// ── Daily challenge ──────────────────────────────────────────

export async function getDailyChallengeDone(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('progress')
    .select('percentage')
    .eq('user_id', userId)
    .eq('module_id', `daily-challenge-${today}`)
    .single();
  return data?.percentage === 100;
}

export async function setDailyChallengeDone(userId) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('progress').upsert(
    { user_id: userId, module_id: `daily-challenge-${today}`, percentage: 100, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,module_id' }
  );
}

// ── Parent: children linked by parent_id ─────────────────────
export async function getChildren(parentId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('parent_id', parentId);
  return data || [];
}

export async function linkChildToParent(childId, parentId) {
  return updateProfile(childId, { parent_id: parentId });
}

import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

let _groq, _supabase;
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}
function getSupabase() {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return _supabase;
}

async function getAdmin(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user } } = await getSupabase().auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await getSupabase().from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? user : null;
}

const DIRECTOR_SYSTEM = `You are an AI assistant for the director of a language school using the SpeakUp platform.
You have access to aggregated statistics about learners. Answer the director's questions in French, concisely and directly.
Be specific: cite numbers, identify individuals by name when relevant, give actionable recommendations.
Never invent data — only use what is provided in the context.
Format your answer with short paragraphs, using ✓ for positive points and ⚠️ for concerns.`;

export async function directorChat(req, res) {
  const admin = await getAdmin(req.headers.authorization);
  if (!admin) return res.status(401).json({ error: 'Not authorized' });

  const { question, schoolData } = req.body;
  if (!question) return res.status(400).json({ error: 'No question' });

  // Build context from schoolData
  const { learners = [], sessions = [], progress = [] } = schoolData;

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  // Compute per-learner stats
  const learnerStats = learners.map(l => {
    const lSessions = sessions.filter(s => s.user_id === l.id);
    const lProgress = progress.filter(p => p.user_id === l.id && !p.module_id.startsWith('daily-'));
    const recentSessions = lSessions.filter(s => s.created_at >= sevenDaysAgo);
    const lastSession = lSessions.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const totalMinutes = Math.round(lSessions.reduce((s, x) => s + (x.duration || 0), 0) / 60);
    const completedModules = lProgress.filter(p => p.percentage >= 80).length;
    const avgProgress = lProgress.length ? Math.round(lProgress.reduce((s, p) => s + p.percentage, 0) / lProgress.length) : 0;
    const daysSinceLastSession = lastSession
      ? Math.floor((Date.now() - new Date(lastSession.created_at)) / 86400000)
      : 999;

    return {
      name: l.full_name,
      level: l.level,
      approved: l.approved,
      totalSessions: lSessions.length,
      recentSessions: recentSessions.length,
      totalMinutes,
      completedModules,
      avgProgress,
      daysSinceLastSession,
      atRisk: daysSinceLastSession > 7 && lSessions.length > 0,
      inactive: lSessions.length === 0,
    };
  });

  const context = `
## School statistics as of ${today}

**Overview**
- Total learners: ${learners.length}
- Active (approved): ${learners.filter(l => l.approved).length}
- Pending approval: ${learners.filter(l => !l.approved).length}
- Total sessions: ${sessions.length}

**Learner details**
${learnerStats.map(l =>
    `- ${l.name} (${l.level}): ${l.totalSessions} sessions, ${l.totalMinutes} min total, ${l.recentSessions} sessions this week, ${l.completedModules} modules completed (avg ${l.avgProgress}%), last session ${l.daysSinceLastSession === 999 ? 'never' : l.daysSinceLastSession + ' days ago'}${l.atRisk ? ' ⚠️ AT RISK' : ''}${l.inactive ? ' ⚠️ NEVER PRACTICED' : ''}`
  ).join('\n')}

**At-risk learners (inactive >7 days)**
${learnerStats.filter(l => l.atRisk).map(l => `- ${l.name}: ${l.daysSinceLastSession} days without practice`).join('\n') || 'None identified'}

**Never practiced**
${learnerStats.filter(l => l.inactive).map(l => `- ${l.name}`).join('\n') || 'None'}

**Top performers (most sessions this week)**
${learnerStats.sort((a, b) => b.recentSessions - a.recentSessions).slice(0, 5).map(l => `- ${l.name}: ${l.recentSessions} sessions this week`).join('\n')}
`;

  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.3,
      messages: [
        { role: 'system', content: DIRECTOR_SYSTEM },
        { role: 'user', content: `${context}\n\n**Director's question:** ${question}` },
      ],
    });
    res.json({ answer: response.choices[0].message.content });
  } catch (err) {
    console.error('[director] error:', err.message);
    res.status(500).json({ error: 'AI assistant unavailable' });
  }
}

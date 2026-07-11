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

async function getUserProfile(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await getSupabase().auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await getSupabase().from('profiles').select('*').eq('id', user.id).single();
  return profile;
}

function buildSystemPrompt(profile, topicContext) {
  const levelDesc = {
    'beginner': 'Use very simple words and short sentences. Be extremely patient and encouraging.',
    'beginner-intermediate': 'Use simple, clear sentences. Be very patient and never make them feel judged.',
    'intermediate': 'Mix simple and more complex sentences. Gently introduce new vocabulary.',
    'intermediate-advanced': 'Your English is already quite solid. Push for natural, idiomatic expression.',
    'advanced': 'Challenge with native-level vocabulary and complex structures.',
  }[profile.level] || "Adapt to the user's level.";

  return `You are a warm, friendly English conversation coach helping ${profile.full_name}, a young Ivorian learning to speak English fluently.

## User profile
- Level: ${profile.level}
- ${levelDesc}
- Interests: ${(profile.interests || []).join(', ') || 'general topics'}

## Your coaching style
- Respond in natural spoken English, as a curious friend — not as a teacher evaluating.
- Keep responses concise (2-4 sentences), leaving space for the user to speak.
- When the user makes a grammar mistake, weave the correct form naturally into your reply without calling it out.
- If the user writes in French, reply warmly in English but acknowledge their point. Switching briefly to French to unblock them is allowed — but gently steer back to English.
- Ask follow-up questions to keep the conversation going.

${topicContext ? `## Current topic\n${topicContext}` : ''}

## Pronunciation tip (voice messages only)
When the user sends a voice message, occasionally (not every time) add a short pronunciation note at the end like: "By the way, the word 'three' is pronounced /θriː/ — the 'th' sound, not 'tree'." Only do this for common Ivorian pronunciation challenges.

## Format
Plain spoken text only — no bullet points, no markdown. Write as you would speak.`;
}

export async function chat(req, res) {
  const { messages, topicContext } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const profile = await getUserProfile(req.headers.authorization);
  if (!profile) return res.status(401).json({ error: 'Not authenticated' });
  if (!profile.approved && profile.role !== 'admin') {
    return res.status(403).json({ error: 'Account not approved yet' });
  }

  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      messages: [
        { role: 'system', content: buildSystemPrompt(profile, topicContext) },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      ],
    });

    res.json({ text: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Coach unavailable' });
  }
}

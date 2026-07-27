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

async function getUser(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await getSupabase().auth.getUser(token);
  if (error || !user) return null;
  return user;
}

const EVAL_SYSTEM = `You are an expert English language evaluator. Analyze an English learning conversation between an AI coach and an Ivorian student.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences:

{
  "words_learned": [],
  "expressions": [],
  "errors_corrected": [
    {"error": "he go", "correction": "he goes", "rule": "Subject-verb agreement (3rd person singular)"}
  ],
  "scores": {
    "grammar": 70,
    "vocabulary": 65,
    "fluency": 75,
    "confidence": 70
  },
  "level": "A2",
  "strengths": [],
  "improvements": [],
  "tomorrow_objectives": []
}

Rules:
- words_learned: max 12 distinct English words the student used correctly or was explicitly taught
- expressions: max 4 phrases/idioms
- errors_corrected: list ONLY actual grammar/vocab errors found in student's messages (max 6)
- scores: integers 0-100. Be realistic — many errors = 40-60, not 80+
- level: CEFR level A1/A1+/A2/A2+/B1/B1+/B2 based on actual output quality
- strengths: 2-3 specific observations about what the student did well
- improvements: 2-3 concrete areas to work on
- tomorrow_objectives: 2-3 actionable practice suggestions`;

export async function evaluate(req, res) {
  const user = await getUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { messages, moduleTitle, level } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length < 2) {
    return res.status(400).json({ error: 'Not enough student responses' });
  }

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'STUDENT' : 'COACH'}: ${m.content}`)
    .join('\n');

  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 900,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EVAL_SYSTEM },
        {
          role: 'user',
          content: `Module: "${moduleTitle || 'English Practice'}"\nStudent declared level: ${level || 'beginner-intermediate'}\n\nConversation:\n${conversationText}`,
        },
      ],
    });

    const evaluation = JSON.parse(response.choices[0].message.content);
    res.json(evaluation);
  } catch (err) {
    console.error('[evaluate] error:', err.message);
    res.status(500).json({ error: 'Evaluation unavailable' });
  }
}

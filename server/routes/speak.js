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
  return error ? null : user;
}

export async function speak(req, res) {
  const user = await getUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  try {
    const audio = await getGroq().audio.speech.create({
      model: 'distil-whisper-large-v3-en',
      voice: 'Arista-PlayAI',
      input: text,
      response_format: 'wav',
    });

    const buffer = Buffer.from(await audio.arrayBuffer());
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('[speak] full error:', JSON.stringify(err, null, 2));
    res.status(500).json({ error: err.message || 'TTS failed' });
  }
}

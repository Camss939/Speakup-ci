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

export async function transcribe(req, res) {
  const user = await getUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    // req.body is a Buffer thanks to express.raw() middleware
    const buffer = req.body;
    if (!buffer || buffer.length < 500) {
      return res.status(400).json({ error: 'Audio too short' });
    }

    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' });

    const transcription = await getGroq().audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: 'en',
    });

    res.json({ text: transcription.text || '' });
  } catch (err) {
    console.error('[transcribe]', err);
    res.status(500).json({ error: 'Transcription failed: ' + err.message });
  }
}

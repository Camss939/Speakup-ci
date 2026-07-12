import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

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
  return user;
}

export async function transcribe(req, res) {
  const user = await getUserProfile(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    await new Promise(resolve => req.on('end', resolve));
    const buffer = Buffer.concat(chunks);

    // Create a File-like object for Groq
    const file = new File([buffer], 'audio.webm', { type: 'audio/webm' });

    const transcription = await getGroq().audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: 'en',
    });

    res.json({ text: transcription.text });
  } catch (err) {
    console.error('[transcribe]', err);
    res.status(500).json({ error: 'Transcription failed' });
  }
}

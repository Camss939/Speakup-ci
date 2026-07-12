import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createClient } from '@supabase/supabase-js';

let _supabase;
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
    const tts = new MsEdgeTTS();
    await tts.setMetadata('en-US-SaraNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const chunks = [];
    await new Promise((resolve, reject) => {
      const readable = tts.toStream(text);
      readable.on('data', chunk => chunks.push(chunk));
      readable.on('end', resolve);
      readable.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('[speak] Edge TTS error:', err.message);
    res.status(500).json({ error: err.message || 'TTS failed' });
  }
}

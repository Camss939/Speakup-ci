import { supabase } from './supabase';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function sendMessage(userId, messages, topicContext) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${API}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages, topicContext }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Coach unavailable');
  }
  const data = await res.json();
  return data.text;
}

let currentAudio = null;

export async function speak(text, onEnd) {
  stopSpeaking();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('no session');
    const res = await fetch(`${API}/api/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('TTS failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.onended = () => { URL.revokeObjectURL(url); onEnd?.(); };
    currentAudio.onerror = () => { URL.revokeObjectURL(url); onEnd?.(); };
    await currentAudio.play();
  } catch {
    // Fallback vers browser TTS si Groq TTS échoue
    if (!window.speechSynthesis) { onEnd?.(); return; }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  }
}

export function stopSpeaking() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  window.speechSynthesis?.cancel();
}

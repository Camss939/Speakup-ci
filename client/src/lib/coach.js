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
let fallbackTimer = null;

export async function speak(text, onEnd, accessToken) {
  stopSpeaking();

  // Fallback timer — always calls onEnd after estimated duration + buffer
  const words = text.split(' ').length;
  const estimatedMs = Math.max(4000, words * 400);
  fallbackTimer = setTimeout(() => { onEnd?.(); }, estimatedMs);

  const done = () => {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
    onEnd?.();
  };

  try {
    const res = await fetch(`${API}/api/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('TTS failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.onended = () => { URL.revokeObjectURL(url); done(); };
    currentAudio.onerror = () => { URL.revokeObjectURL(url); done(); };
    await currentAudio.play();
  } catch {
    // fallback to browser TTS
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US'; utter.rate = 0.92;
    utter.onend = done;
    utter.onerror = done;
    if (window.speechSynthesis) {
      window.speechSynthesis.speak(utter);
    } else {
      done();
    }
  }
}

export function stopSpeaking() {
  clearTimeout(fallbackTimer);
  fallbackTimer = null;
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  window.speechSynthesis?.cancel();
}

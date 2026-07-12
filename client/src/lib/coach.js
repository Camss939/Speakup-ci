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

export function speak(text, onEnd) {
  stopSpeaking();
  if (!window.speechSynthesis) { onEnd?.(); return; }

  const words = text.split(' ').length;
  const estimatedMs = Math.max(4000, words * 450);
  fallbackTimer = setTimeout(() => { onEnd?.(); }, estimatedMs);

  const done = () => {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
    onEnd?.();
  };

  const doSpeak = () => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.9;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (
        v.name.includes('Samantha') ||
        v.name.includes('Google US') ||
        v.name.includes('Karen') ||
        v.name.includes('Daniel') ||
        v.name.includes('Moira')
      )
    );
    if (preferred) utter.voice = preferred;
    utter.onend = done;
    utter.onerror = done;
    window.speechSynthesis.speak(utter);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      doSpeak();
    };
  }
}

export function stopSpeaking() {
  clearTimeout(fallbackTimer);
  fallbackTimer = null;
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  window.speechSynthesis?.cancel();
}

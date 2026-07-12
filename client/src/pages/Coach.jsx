import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import topics from '../data/topics.json';
import {
  getConversationHistory, saveConversationHistory,
  clearConversationHistory, setModuleProgress, addSession,
} from '../lib/db';
import { sendMessage, speak, stopSpeaking } from '../lib/coach';
import styles from './Coach.module.css';

function findModule(moduleId) {
  for (const topic of topics) {
    const mod = topic.modules.find(m => m.id === moduleId);
    if (mod) return { topic, mod };
  }
  return null;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Voice states
const VS = { IDLE: 'idle', LISTENING: 'listening', PROCESSING: 'processing', SPEAKING: 'speaking' };

export default function Coach() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const found = findModule(moduleId);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [sessionStart] = useState(Date.now());

  // Voice conversation mode
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState(VS.IDLE);

  const voiceModeRef = useRef(false);
  const voiceStateRef = useRef(VS.IDLE);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const bottomRef = useRef(null);
  const initialized = useRef(false);
  const messagesRef = useRef([]);

  // Keep messagesRef in sync to avoid stale closures
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  function setVS(state) {
    voiceStateRef.current = state;
    setVoiceState(state);
  }

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;
    getConversationHistory(user.id, moduleId).then(hist => {
      setMessages(hist);
      setReady(true);
    });
  }, [user, moduleId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (ready && messages.length === 0) replyAsCoach("Hi! I'm ready to practice. Please start!");
  }, [ready]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop();
      const duration = Math.round((Date.now() - sessionStart) / 1000);
      if (messagesRef.current.length > 0 && duration > 20 && user) {
        addSession(user.id, { moduleId, moduleTitle: found?.mod.title || moduleId, duration });
      }
    };
  }, []);

  const topicContext = found
    ? `Topic: ${found.topic.label} — Module: "${found.mod.title}"\nVocab to use: ${found.mod.vocab.join(', ')}\nCoach direction: ${found.mod.coachSeed}`
    : null;

  async function replyAsCoach(userText) {
    const userMsg = { role: 'user', content: userText };
    const current = messagesRef.current;
    const next = [...current, userMsg];
    setMessages(next);
    setLoading(true);
    setError(null);
    if (voiceModeRef.current) setVS(VS.PROCESSING);
    try {
      const text = await sendMessage(profile?.id || user?.id, next, topicContext);
      const coachMsg = { role: 'assistant', content: text };
      const final = [...next, coachMsg];
      setMessages(final);
      if (user) {
        await saveConversationHistory(user.id, moduleId, final);
        if (final.length >= 6) setModuleProgress(user.id, moduleId, Math.min(100, final.length * 8));
      }
      if (voiceModeRef.current) {
        setVS(VS.SPEAKING);
        speak(text, () => {
          if (voiceModeRef.current) {
            setTimeout(() => startVoiceListening(), 600);
          } else {
            setVS(VS.IDLE);
          }
        });
      }
    } catch {
      setError('Le coach est indisponible. Vérifie ta connexion.');
      if (voiceModeRef.current) setVS(VS.LISTENING);
    } finally {
      setLoading(false);
    }
  }

  async function startVoiceListening() {
    if (!voiceModeRef.current) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (!voiceModeRef.current) { setVS(VS.IDLE); return; }
        setVS(VS.PROCESSING);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 500) {
          if (voiceModeRef.current) startVoiceListening();
          return;
        }
        try {
          const { supabase } = await import('../lib/supabase.js');
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${API}/api/transcribe`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'audio/webm' },
            body: blob,
          });
          const data = await res.json();
          if (data.text?.trim()) {
            await replyAsCoach(data.text.trim());
          } else {
            if (voiceModeRef.current) startVoiceListening();
          }
        } catch {
          setError("Erreur réseau. Réessaie.");
          if (voiceModeRef.current) setTimeout(() => startVoiceListening(), 2000);
        }
      };
      mr.start();
      setVS(VS.LISTENING);
    } catch {
      setError("Micro refusé. Autorise le micro dans les paramètres.");
      stopVoiceMode();
    }
  }

  function stopCurrentRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }

  function startVoiceMode() {
    // Unlock browser audio on user gesture
    const silence = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    silence.play().catch(() => {});
    const u = new SpeechSynthesisUtterance('');
    window.speechSynthesis?.speak(u);

    voiceModeRef.current = true;
    setVoiceMode(true);
    startVoiceListening();
  }

  function stopVoiceMode() {
    voiceModeRef.current = false;
    setVoiceMode(false);
    setVS(VS.IDLE);
    stopSpeaking();
    stopCurrentRecording();
  }

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    replyAsCoach(input.trim());
    setInput('');
  }

  async function handleReset() {
    stopVoiceMode();
    stopSpeaking();
    if (user) await clearConversationHistory(user.id, moduleId);
    setMessages([]); setError(null);
    initialized.current = false;
    setTimeout(() => {
      initialized.current = true;
      replyAsCoach("Hi! I'm ready to practice. Please start!");
    }, 100);
  }

  if (!found) return <div className={styles.notfound}>Module introuvable. <button onClick={() => navigate('/topics')}>Retour</button></div>;
  const { topic, mod } = found;

  const stateLabel = {
    [VS.LISTENING]: "Je t'écoute... parle puis clique ⏹",
    [VS.PROCESSING]: "Traitement en cours...",
    [VS.SPEAKING]: "Le coach parle...",
  }[voiceState] || '';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(`/topics/${topic.id}`)}>←</button>
        <div className={styles.headerInfo}>
          <span className={styles.headerTopic}>{topic.emoji} {topic.label}</span>
          <span className={styles.headerModule}>{mod.title}</span>
        </div>
        <button className={styles.resetBtn} onClick={handleReset} title="Recommencer">↺</button>
      </header>

      <div className={styles.vocab}>
        {mod.vocab.map(w => <span key={w} className={styles.chip}>{w}</span>)}
      </div>

      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.bubble} ${m.role === 'user' ? styles.user : styles.coach}`}>
            {m.role === 'assistant' && <span className={styles.coachAvatar}>🎙️</span>}
            <div className={styles.bubbleText}>{m.content}</div>
          </div>
        ))}
        {loading && !voiceMode && (
          <div className={`${styles.bubble} ${styles.coach}`}>
            <span className={styles.coachAvatar}>🎙️</span>
            <div className={styles.bubbleText}>
              <span className={styles.dots}><span /><span /><span /></span>
            </div>
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Voice Mode Overlay */}
      {voiceMode && (
        <div className={styles.voiceOverlay}>
          <div className={`${styles.voiceCircle} ${styles[`vc_${voiceState}`]}`}>
            <div className={styles.voiceRing1} />
            <div className={styles.voiceRing2} />
            <div className={styles.voiceRing3} />
            <div className={styles.voiceIcon}>
              {voiceState === VS.LISTENING ? '🎤' : voiceState === VS.SPEAKING ? '🔊' : '⏳'}
            </div>
          </div>
          <p className={styles.voiceLabel}>{stateLabel}</p>
          {voiceState === VS.LISTENING && (
            <button className={styles.voiceSendBtn} onClick={stopCurrentRecording}>
              ⏹ Envoyer
            </button>
          )}
          <button className={styles.voiceStopBtn} onClick={stopVoiceMode}>
            Arrêter la conversation
          </button>
        </div>
      )}

      {/* Normal controls */}
      {!voiceMode && (
        <div className={styles.controls}>
          <button
            className={styles.voiceStartBtn}
            onClick={startVoiceMode}
            title="Démarrer la conversation vocale">
            🎙️
          </button>
          <form className={styles.textForm} onSubmit={handleSend}>
            <input className={styles.textInput} value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tape un message…" disabled={loading} />
            <button className={styles.sendBtn} type="submit" disabled={!input.trim() || loading}>Envoyer</button>
          </form>
        </div>
      )}
      {!voiceMode && (
        <p className={styles.hint}>🎙️ Conversation vocale · ou tape en dessous</p>
      )}
    </div>
  );
}

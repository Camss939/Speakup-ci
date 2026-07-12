import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
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


export default function Coach() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const found = findModule(moduleId);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [sessionStart] = useState(Date.now());

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const bottomRef = useRef(null);
  const initialized = useRef(false);

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
    if (ready && messages.length === 0 && !loading) {
      replyAsCoach("Hi! I'm ready to practice. Please start!");
    }
  }, [ready]);

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      const duration = Math.round((Date.now() - sessionStart) / 1000);
      if (messages.length > 0 && duration > 20 && user) {
        addSession(user.id, { moduleId, moduleTitle: found?.mod.title || moduleId, duration });
      }
    };
  }, [messages]);

  const topicContext = found
    ? `Topic: ${found.topic.label} — Module: "${found.mod.title}"\nVocab to use: ${found.mod.vocab.join(', ')}\nCoach direction: ${found.mod.coachSeed}`
    : null;

  async function replyAsCoach(userText) {
    const userMsg = { role: 'user', content: userText };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    setError(null);
    try {
      const text = await sendMessage(profile?.id || user?.id, next, topicContext);
      const coachMsg = { role: 'assistant', content: text };
      const final = [...next, coachMsg];
      setMessages(final);
      if (user) {
        await saveConversationHistory(user.id, moduleId, final);
        if (final.length >= 6) setModuleProgress(user.id, moduleId, Math.min(100, final.length * 8));
      }
      setSpeaking(true);
      speak(text, () => setSpeaking(false));
    } catch {
      setError('Le coach est indisponible. Vérifie ta connexion.');
    } finally {
      setLoading(false);
    }
  }

  async function startListening() {
    if (listening) {
      // Stop recording and send
      mediaRecorderRef.current?.stop();
      return;
    }
    stopSpeaking(); setSpeaking(false); setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setListening(false);
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 1000) { setError("Trop court. Parle un peu plus longtemps."); return; }
        setLoading(true);
        try {
          const { data: { session } } = await (await import('../lib/supabase.js')).supabase.auth.getSession();
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/transcribe`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'audio/webm' },
            body: blob,
          });
          const data = await res.json();
          if (data.text?.trim()) replyAsCoach(data.text.trim());
          else setError("Aucun texte détecté. Réessaie.");
        } catch {
          setError("Erreur de transcription. Vérifie ta connexion.");
        } finally {
          setLoading(false);
        }
      };
      mr.start();
      setListening(true);
    } catch {
      setError("Micro refusé. Autorise le micro dans les paramètres du navigateur.");
    }
  }

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    replyAsCoach(input.trim()); setInput('');
  }

  async function handleReset() {
    stopSpeaking();
    if (user) await clearConversationHistory(user.id, moduleId);
    setMessages([]); setError(null);
    initialized.current = false;
    setTimeout(() => { initialized.current = true; replyAsCoach("Hi! I'm ready to practice. Please start!"); }, 100);
  }

  if (!found) return <div className={styles.notfound}>Module introuvable. <button onClick={() => navigate('/topics')}>Retour</button></div>;
  const { topic, mod } = found;

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
        {loading && (
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

      <div className={styles.controls}>
        <button
          className={`${styles.mic} ${listening ? styles.active : ''} ${speaking ? styles.speaking : ''}`}
          onClick={startListening}
          disabled={loading} aria-label={listening ? "Arrêter" : "Parler"}>
          {listening ? '⏹️' : speaking ? '🔊' : '🎤'}
        </button>
        <form className={styles.textForm} onSubmit={handleSend}>
          <input className={styles.textInput} value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ou tape ici…" disabled={loading} />
          <button className={styles.sendBtn} type="submit" disabled={!input.trim() || loading}>Envoyer</button>
        </form>
      </div>
      <p className={styles.hint}>🎤 Commencer · ⏹️ Arrêter et envoyer · ou tape en dessous</p>
    </div>
  );
}

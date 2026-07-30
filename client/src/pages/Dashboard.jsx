import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { signOut } from '../lib/auth';
import { getProgress, getSessions, computeStreak, getDailyChallengeDone, setDailyChallengeDone } from '../lib/db';
import { starsFromPct } from '../lib/utils';
import topics from '../data/topics.json';
import expressions from '../data/dailyExpressions.json';
import challenges from '../data/dailyChallenges.json';
import NavBar from '../components/NavBar';
import styles from './Dashboard.module.css';

function getDailyItem(arr) {
  const day = Math.floor(Date.now() / 86400000);
  return arr[day % arr.length];
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState({});
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [challengeDone, setChallengeDone] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const expression = getDailyItem(expressions);
  const challenge = getDailyItem(challenges);

  useEffect(() => {
    if (!user) return;
    Promise.all([getProgress(user.id), getSessions(user.id), getDailyChallengeDone(user.id)]).then(([p, s, done]) => {
      setProgress(p); setSessions(s); setChallengeDone(done); setLoading(false);
    });
  }, [user]);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  function handleSpeakExpression() {
    if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); return; }
    const text = `${expression.expression}. ${expression.example}`;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.85;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(utter);
  }

  async function handleChallengeStart() {
    await setDailyChallengeDone(user.id);
    setChallengeDone(true);
    const topic = topics.find(t => t.id === challenge.topic);
    if (topic) navigate(`/topics/${topic.id}`);
  }

  const streak = computeStreak(sessions);
  const allTopics = topics;
  const total = allTopics.reduce((n, t) => n + t.modules.length, 0);
  const explored = Object.values(progress).filter(p => p >= 100).length;

  // Daily quests — auto-detected
  const today = new Date().toISOString().slice(0, 10);
  const sessionToday = sessions.some(s => s.created_at?.slice(0, 10) === today);
  const libreToday = user ? !!localStorage.getItem(`libre-visited-${user.id}-${today}`) : false;
  const quests = [
    { id: 'session', icon: '🎙️', label: 'Faire une session aujourd\'hui', xp: 50, done: sessionToday },
    { id: 'challenge', icon: '🎯', label: 'Relever le défi du jour', xp: 50, done: challengeDone },
    { id: 'libre', icon: '💬', label: 'Essayer la Conversation libre', xp: 40, done: libreToday },
  ];

  if (loading) return <div style={{padding:'3rem', textAlign:'center', color:'var(--text-muted)'}}>Chargement…</div>;

  return (
    <div className={styles.page}>
      <NavBar onSignOut={handleSignOut} />
      <main className={styles.main}>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroTop}>
            <div>
              <span className={styles.heroSub}>Bonjour 👋</span>
              <span className={styles.heroName}>{profile?.full_name?.split(' ')[0] || 'Toi'} !</span>
            </div>
            <span className={styles.heroFlame}>🔥</span>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatEmoji}>🔥</span>
              <span className={styles.heroStatNum}>{streak}</span>
              <span className={styles.heroStatLabel}>jours</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatEmoji}>⭐</span>
              <span className={styles.heroStatNum}>{sessions.length * 50}</span>
              <span className={styles.heroStatLabel}>XP</span>
            </div>
            <div className={styles.heroStat}>
              <span className={styles.heroStatEmoji}>📚</span>
              <span className={styles.heroStatNum}>{explored}</span>
              <span className={styles.heroStatLabel}>modules</span>
            </div>
          </div>
        </div>

{/* Passeport link */}
        <Link to="/passport" className={styles.passportLink}>
          <span>🛂</span>
          <div>
            <span className={styles.passportLinkTitle}>Passeport SpeakUp</span>
            <span className={styles.passportLinkSub}>Visite le monde en apprenant l'anglais</span>
          </div>
          <span className={styles.passportLinkArrow}>›</span>
        </Link>

        {/* Daily quests */}
        <div className={styles.questsCard}>
          <div className={styles.questsHeader}>
            <span className={styles.questsTitle}>⚡ Missions du jour</span>
            <span className={styles.questsXP}>+{quests.filter(q => q.done).reduce((s, q) => s + q.xp, 0)} / {quests.reduce((s, q) => s + q.xp, 0)} XP</span>
          </div>
          {quests.map(q => (
            <div key={q.id} className={`${styles.quest} ${q.done ? styles.questDone : ''}`}>
              <span className={styles.questIcon}>{q.done ? '✅' : q.icon}</span>
              <span className={styles.questLabel}>{q.label}</span>
              <span className={styles.questReward}>+{q.xp} XP</span>
            </div>
          ))}
        </div>

        {/* Expression du jour */}
        <div className={styles.expressionCard}>
          <div className={styles.expressionBadge}>✨ Expression du jour</div>
          <div className={styles.expressionMain}>
            <span className={styles.expressionEmoji}>{expression.emoji}</span>
            <div style={{flex:1}}>
              <div className={styles.expressionWord}>"{expression.expression}"</div>
              <div className={styles.expressionMeaning}>{expression.meaning}</div>
            </div>
            <button
              onClick={handleSpeakExpression}
              title={speaking ? 'Arrêter' : 'Écouter'}
              style={{
                fontSize: '1.4rem', background: 'none', border: 'none',
                cursor: 'pointer', padding: '0.2rem',
                opacity: speaking ? 1 : 0.7,
                animation: speaking ? 'pulse 1s infinite' : 'none',
              }}>
              {speaking ? '🔉' : '🔊'}
            </button>
          </div>
          <div className={styles.expressionExample}>
            💬 <em>"{expression.example}"</em>
          </div>
        </div>

        {/* Défi du jour */}
        <div className={`${styles.challengeCard} ${challengeDone ? styles.challengeDone : ''}`}>
          <div className={styles.challengeHeader}>
            <span className={styles.challengeBadge}>🎯 Défi du jour</span>
            {challengeDone
              ? <span className={styles.doneTag}>✅ Complété</span>
              : <span className={styles.doneTag}>+50 XP</span>}
          </div>
          <div className={styles.challengeTitle}>{challenge.emoji} {challenge.title}</div>
          <div className={styles.challengeInstruction}>{challenge.instruction}</div>
          <button
            className={styles.challengeBtn}
            onClick={handleChallengeStart}
            disabled={challengeDone}
          >
            {challengeDone ? 'Défi du jour terminé !' : 'Relever le défi →'}
          </button>
        </div>

        {/* Topics */}
        {/* Conversation libre — always available */}
        <Link to="/coach/libre" className={styles.libreCard}>
          <span className={styles.libreEmoji}>💬</span>
          <div className={styles.libreInfo}>
            <span className={styles.libreTitle}>Conversation libre</span>
            <span className={styles.libreSub}>Parle de n'importe quel sujet — sans limite</span>
          </div>
          <span className={styles.libreArrow}>›</span>
        </Link>

        <h2 className={styles.sectionTitle}>Explore les thèmes</h2>
        <div className={styles.topicGrid}>
          {allTopics.map(topic => {
            const totalStars = topic.modules.reduce((s, m) => {
              const p = progress[m.id] || 0;
              return s + (p <= 0 ? 0 : p <= 20 ? 1 : p <= 40 ? 2 : p <= 60 ? 3 : p <= 80 ? 4 : 5);
            }, 0);
            const maxStars = topic.modules.length * 5;
            const pct = Math.round((totalStars / maxStars) * 100);
            const masteredCount = topic.modules.filter(m => (progress[m.id] || 0) > 80).length;
            return (
              <Link key={topic.id} to={`/topics/${topic.id}`} className={styles.topicCard}>
                <span className={styles.topicEmoji}>{topic.emoji}</span>
                <div className={styles.topicInfo}>
                  <span className={styles.topicLabel}>{topic.label}</span>
                  <span className={styles.topicMeta}>
                    {masteredCount > 0 ? `${masteredCount}/${topic.modules.length} maîtrisés` : `${topic.modules.length} modules`}
                  </span>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%`, background: topic.color }} />
                  </div>
                </div>
                <span className={styles.chevron}>›</span>
              </Link>
            );
          })}
        </div>

        {/* Sessions récentes */}
        {sessions.length > 0 && (
          <>
            <h2 className={styles.sectionTitle}>Sessions récentes</h2>
            <div className={styles.sessionList}>
              {sessions.slice(0, 5).map(s => (
                <div key={s.id} className={styles.session}>
                  <span className={styles.sessionDate}>
                    {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className={styles.sessionTitle}>{s.module_title}</span>
                  <span className={styles.sessionDur}>{Math.round(s.duration / 60)}m</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

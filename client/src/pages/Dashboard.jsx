import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { signOut } from '../lib/auth';
import { getProgress, getSessions, computeStreak } from '../lib/db';
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

  const expression = getDailyItem(expressions);
  const challenge = getDailyItem(challenges);

  useEffect(() => {
    if (!user) return;
    Promise.all([getProgress(user.id), getSessions(user.id)]).then(([p, s]) => {
      setProgress(p); setSessions(s); setLoading(false);
    });
    const key = `challenge_done_${new Date().toDateString()}_${user.id}`;
    setChallengeDone(!!localStorage.getItem(key));
  }, [user]);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  function handleChallengeStart() {
    const key = `challenge_done_${new Date().toDateString()}_${user.id}`;
    localStorage.setItem(key, '1');
    setChallengeDone(true);
    const topic = topics.find(t => t.id === challenge.topic);
    if (topic) navigate(`/topics/${topic.id}`);
  }

  const streak = computeStreak(sessions);
  const allTopics = topics;
  const total = allTopics.reduce((n, t) => n + t.modules.length, 0);
  const explored = Object.values(progress).filter(p => p >= 100).length;

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

        {/* Expression du jour */}
        <div className={styles.expressionCard}>
          <div className={styles.expressionBadge}>✨ Expression du jour</div>
          <div className={styles.expressionMain}>
            <span className={styles.expressionEmoji}>{expression.emoji}</span>
            <div style={{flex:1}}>
              <div className={styles.expressionWord}>"{expression.expression}"</div>
              <div className={styles.expressionMeaning}>{expression.meaning}</div>
            </div>
            <span style={{fontSize:'1.4rem', cursor:'pointer'}} title="Écouter">🔊</span>
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
        <h2 className={styles.sectionTitle}>Explore les thèmes</h2>
        <div className={styles.topicGrid}>
          {allTopics.map(topic => {
            const done = topic.modules.filter(m => (progress[m.id] || 0) >= 100).length;
            const pct = Math.round((done / topic.modules.length) * 100);
            return (
              <Link key={topic.id} to={`/topics/${topic.id}`} className={styles.topicCard}>
                <span className={styles.topicEmoji}>{topic.emoji}</span>
                <div className={styles.topicInfo}>
                  <span className={styles.topicLabel}>{topic.label}</span>
                  <span className={styles.topicMeta}>{done}/{topic.modules.length} modules</span>
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

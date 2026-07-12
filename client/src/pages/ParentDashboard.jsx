import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { signOut } from '../lib/auth';
import { getChildren, getProgressForUser, getSessionsForUser, computeStreak } from '../lib/db';
import topics from '../data/topics.json';
import NavBar from '../components/NavBar';
import styles from './ParentDashboard.module.css';

const totalModules = topics.reduce((n, t) => n + t.modules.length, 0);

export default function ParentDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [childData, setChildData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user) return;
    getChildren(user.id).then(async kids => {
      setChildren(kids);
      const data = {};
      await Promise.all(kids.map(async kid => {
        const [progress, sessions] = await Promise.all([
          getProgressForUser(kid.id),
          getSessionsForUser(kid.id),
        ]);
        data[kid.id] = { progress, sessions };
      }));
      setChildData(data);
      if (kids.length > 0) setSelected(kids[0].id);
      setLoading(false);
    });
  }, [user]);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</div>;

  const kid = children.find(c => c.id === selected);
  const data = selected ? childData[selected] : null;
  const sessions = data?.sessions || [];
  const progress = data?.progress || [];
  const streak = computeStreak(sessions);
  const completed = progress.filter(p => p.percentage >= 100 && !p.module_id.startsWith('daily-')).length;
  const totalMinutes = Math.round(sessions.reduce((s, sess) => s + (sess.duration || 0), 0) / 60);

  return (
    <div className={styles.page}>
      <NavBar onSignOut={handleSignOut} />
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Suivi parental</h1>
            <p className={styles.sub}>Bonjour {profile?.full_name?.split(' ')[0]} 👋</p>
          </div>
        </div>

        {children.length === 0 ? (
          <div className={styles.empty}>
            <span style={{ fontSize: '3rem' }}>👶</span>
            <p>Aucun enfant lié à votre compte pour le moment.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Contactez l'administrateur pour lier le compte de votre enfant.
            </p>
          </div>
        ) : (
          <>
            {/* Child selector */}
            {children.length > 1 && (
              <div className={styles.childTabs}>
                {children.map(c => (
                  <button
                    key={c.id}
                    className={`${styles.childTab} ${selected === c.id ? styles.childTabActive : ''}`}
                    onClick={() => setSelected(c.id)}
                  >
                    {c.full_name}
                  </button>
                ))}
              </div>
            )}

            {kid && (
              <>
                {/* Stats */}
                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <span className={styles.statNum}>🔥 {streak}</span>
                    <span className={styles.statLabel}>Jours consécutifs</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statNum}>⭐ {sessions.length * 50}</span>
                    <span className={styles.statLabel}>XP total</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statNum}>📚 {completed}</span>
                    <span className={styles.statLabel}>Modules complétés</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statNum}>⏱️ {totalMinutes}</span>
                    <span className={styles.statLabel}>Minutes de pratique</span>
                  </div>
                </div>

                {/* Progress by topic */}
                <h2 className={styles.sectionTitle}>Progression par thème</h2>
                <div className={styles.topicList}>
                  {topics.map(topic => {
                    const moduleIds = topic.modules.map(m => m.id);
                    const done = progress.filter(p => moduleIds.includes(p.module_id) && p.percentage >= 100).length;
                    const pct = Math.round((done / topic.modules.length) * 100);
                    return (
                      <div key={topic.id} className={styles.topicRow}>
                        <span className={styles.topicEmoji}>{topic.emoji}</span>
                        <div className={styles.topicInfo}>
                          <div className={styles.topicTop}>
                            <span className={styles.topicLabel}>{topic.label}</span>
                            <span className={styles.topicPct}>{done}/{topic.modules.length}</span>
                          </div>
                          <div className={styles.bar}>
                            <div className={styles.barFill} style={{ width: `${pct}%`, background: topic.color }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recent sessions */}
                {sessions.length > 0 && (
                  <>
                    <h2 className={styles.sectionTitle}>Sessions récentes</h2>
                    <div className={styles.sessionList}>
                      {sessions.slice(0, 8).map(s => (
                        <div key={s.id} className={styles.session}>
                          <span className={styles.sessionDate}>
                            {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className={styles.sessionTitle}>{s.module_title}</span>
                          <span className={styles.sessionDur}>{Math.round(s.duration / 60)}m</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {sessions.length === 0 && (
                  <div className={styles.empty}>
                    <span style={{ fontSize: '2.5rem' }}>📖</span>
                    <p>{kid.full_name} n'a pas encore commencé à pratiquer.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

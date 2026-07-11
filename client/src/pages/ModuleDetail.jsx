import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { signOut } from '../lib/auth';
import topics from '../data/topics.json';
import { getProgress } from '../lib/db';
import NavBar from '../components/NavBar';
import styles from './ModuleDetail.module.css';

export default function ModuleDetail() {
  const { topicId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const topic = topics.find(t => t.id === topicId);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (user) getProgress(user.id).then(setProgress);
  }, [user]);

  async function handleSignOut() {
    await signOut(); navigate('/login');
  }

  if (!topic) return <div>Topic not found. <Link to="/topics">Back</Link></div>;

  return (
    <div className={styles.page}>
      <NavBar onSignOut={handleSignOut} />
      <main className={styles.main}>
        <button className={styles.back} onClick={() => navigate('/topics')}>← Back</button>
        <div className={styles.header}>
          <span className={styles.emoji}>{topic.emoji}</span>
          <h1 className={styles.heading}>{topic.label}</h1>
        </div>
        <div className={styles.modules}>
          {topic.modules.map((mod, i) => {
            const pct = progress[mod.id] || 0;
            return (
              <div key={mod.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.num}>Module {i + 1}</span>
                  {pct >= 100 && <span className={styles.badge}>Done ✓</span>}
                </div>
                <h2 className={styles.title}>{mod.title}</h2>
                <p className={styles.intro}>{mod.intro}</p>
                <div className={styles.vocab}>
                  {mod.vocab.map(w => <span key={w} className={styles.chip}>{w}</span>)}
                </div>
                <div className={styles.bar}>
                  <div className={styles.fill} style={{ width: `${pct}%`, background: topic.color }} />
                </div>
                <Link to={`/coach/${mod.id}`} className={styles.btn}>
                  🎙️ Practice with the coach
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

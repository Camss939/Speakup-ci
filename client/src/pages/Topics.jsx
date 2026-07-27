import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { signOut } from '../lib/auth';
import topics from '../data/topics.json';
import { getProgress } from '../lib/db';
import { starsFromPct } from '../lib/utils';
import NavBar from '../components/NavBar';
import styles from './Topics.module.css';

export default function Topics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (user) getProgress(user.id).then(setProgress);
  }, [user]);

  async function handleSignOut() {
    await signOut(); navigate('/login');
  }

  return (
    <div className={styles.page}>
      <NavBar onSignOut={handleSignOut} />
      <main className={styles.main}>
        <h1 className={styles.heading}>Topics</h1>
        <p className={styles.sub}>Choose a topic you're passionate about</p>
        <div className={styles.grid}>
          {topics.map(topic => {
            const totalStars = topic.modules.reduce((s, m) => {
              const pct = progress[m.id] || 0;
              return s + (pct <= 0 ? 0 : pct <= 20 ? 1 : pct <= 40 ? 2 : pct <= 60 ? 3 : pct <= 80 ? 4 : 5);
            }, 0);
            const maxStars = topic.modules.length * 5;
            const pct = Math.round((totalStars / maxStars) * 100);
            const masteredCount = topic.modules.filter(m => (progress[m.id] || 0) > 80).length;
            return (
              <Link key={topic.id} to={`/topics/${topic.id}`} className={styles.card}>
                <div className={styles.cardTop} style={{ background: topic.color + '18' }}>
                  <span className={styles.emoji}>{topic.emoji}</span>
                  <span className={styles.count} style={{ background: topic.color }}>{topic.modules.length}</span>
                </div>
                <div className={styles.cardBody}>
                  <span className={styles.label}>{topic.label}</span>
                  <span className={styles.meta}>
                    {masteredCount > 0 ? `${masteredCount}/${topic.modules.length} maîtrisés` : `${topic.modules.length} modules`}
                  </span>
                  <div className={styles.bar}>
                    <div className={styles.fill} style={{ width: `${pct}%`, background: topic.color }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

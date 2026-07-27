import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { signOut } from '../lib/auth';
import { getProgress } from '../lib/db';
import { starsFromPct } from '../lib/utils';
import topics from '../data/topics.json';
import NavBar from '../components/NavBar';
import styles from './Passport.module.css';

const DESTINATIONS = {
  'football':       { flag: '🇧🇷', country: 'Brésil',      city: 'Rio de Janeiro' },
  'animals':        { flag: '🇰🇪', country: 'Kenya',        city: 'Nairobi Safari' },
  'finance':        { flag: '🇦🇪', country: 'Dubaï',        city: 'Financial Hub' },
  'cars':           { flag: '🇩🇪', country: 'Allemagne',    city: 'Munich' },
  'travel':         { flag: '🇫🇷', country: 'France',       city: 'Paris' },
  'daily-life':     { flag: '🇬🇧', country: 'Angleterre',   city: 'Londres' },
  'music':          { flag: '🇯🇲', country: 'Jamaïque',     city: 'Kingston' },
  'gaming':         { flag: '🇯🇵', country: 'Japon',        city: 'Tokyo' },
  'movies-series':  { flag: '🇺🇸', country: 'USA',          city: 'Hollywood' },
  'entrepreneurship':{ flag: '🇸🇬', country: 'Singapour',  city: 'Business District' },
  'fashion':        { flag: '🇮🇹', country: 'Italie',       city: 'Milan' },
  'scenarios':      { flag: '🌍', country: 'Monde entier', city: 'Scénarios réels' },
};

export default function Passport() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (user) getProgress(user.id).then(setProgress);
  }, [user]);

  const totalStars = topics.reduce((sum, t) =>
    sum + t.modules.reduce((s, m) => {
      const p = progress[m.id] || 0;
      return s + (p <= 0 ? 0 : p <= 20 ? 1 : p <= 40 ? 2 : p <= 60 ? 3 : p <= 80 ? 4 : 5);
    }, 0), 0);
  const maxStars = topics.reduce((s, t) => s + t.modules.length * 5, 0);
  const globalPct = Math.round((totalStars / maxStars) * 100);
  const visited = topics.filter(t => t.modules.some(m => (progress[m.id] || 0) > 0)).length;
  const stamped = topics.filter(t => t.modules.every(m => (progress[m.id] || 0) > 80)).length;

  return (
    <div className={styles.page}>
      <NavBar onSignOut={async () => { await signOut(); navigate('/login'); }} />

      <main className={styles.main}>
        {/* Passport cover */}
        <div className={styles.cover}>
          <div className={styles.coverLeft}>
            <div className={styles.passportLabel}>SPEAKUP PASSPORT</div>
            <div className={styles.passportName}>{profile?.full_name || 'Apprenant'}</div>
            <div className={styles.passportMeta}>Côte d'Ivoire · English Learner</div>
          </div>
          <div className={styles.coverRight}>
            <div className={styles.passportFlag}>🇨🇮</div>
            <div className={styles.passportSeal}>CI</div>
          </div>
        </div>

        {/* Global stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{visited}</span>
            <span className={styles.statLabel}>Destinations visitées</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{stamped}</span>
            <span className={styles.statLabel}>Tampons obtenus</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{globalPct}%</span>
            <span className={styles.statLabel}>Progression globale</span>
          </div>
        </div>

        {/* Destinations grid */}
        <h2 className={styles.sectionTitle}>Tes destinations</h2>
        <div className={styles.grid}>
          {topics.map(topic => {
            const dest = DESTINATIONS[topic.id] || { flag: '🌐', country: 'Monde', city: '' };
            const topicStars = topic.modules.reduce((s, m) => {
              const p = progress[m.id] || 0;
              return s + (p <= 0 ? 0 : p <= 20 ? 1 : p <= 40 ? 2 : p <= 60 ? 3 : p <= 80 ? 4 : 5);
            }, 0);
            const topicMax = topic.modules.length * 5;
            const pct = Math.round((topicStars / topicMax) * 100);
            const isStamped = pct >= 80;
            const hasVisited = pct > 0;

            return (
              <Link key={topic.id} to={`/topics/${topic.id}`} className={`${styles.card} ${isStamped ? styles.cardStamped : ''} ${!hasVisited ? styles.cardLocked : ''}`}>
                {isStamped && <div className={styles.stamp}>✓ TAMPONNÉ</div>}
                <div className={styles.flag}>{dest.flag}</div>
                <div className={styles.topicEmoji}>{topic.emoji}</div>
                <div className={styles.country}>{dest.country}</div>
                <div className={styles.city}>{dest.city}</div>
                <div className={styles.topicLabel}>{topic.label}</div>
                <div className={styles.stars}>{starsFromPct(pct)}</div>
                <div className={styles.barWrap}>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${pct}%`, background: topic.color }} />
                  </div>
                  <span className={styles.barPct}>{pct}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

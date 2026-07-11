import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import styles from './NavBar.module.css';

export default function NavBar({ onSignOut }) {
  const loc = useLocation();
  const { profile } = useAuth();
  const name = profile?.full_name?.split(' ')[0] || '';

  return (
    <nav className={styles.nav}>
      <Link to="/dashboard" className={styles.brand}>
        <span>🎙️</span> <span className={styles.brandText}>SpeakUp CI</span>
      </Link>
      <div className={styles.links}>
        <Link to="/dashboard" className={`${styles.link} ${loc.pathname === '/dashboard' ? styles.active : ''}`}>Home</Link>
        <Link to="/topics" className={`${styles.link} ${loc.pathname.startsWith('/topics') ? styles.active : ''}`}>Topics</Link>
      </div>
      <div className={styles.right}>
        <span className={styles.userName}>👤 {name}</span>
        {onSignOut && <button className={styles.logout} onClick={onSignOut}>Déconnexion</button>}
      </div>
    </nav>
  );
}

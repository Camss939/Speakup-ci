import users from '../data/users.json';
import styles from './SelectProfile.module.css';

export default function SelectProfile({ onSelect }) {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>🎙️</span>
          <span className={styles.logoText}>SpeakUp CI</span>
        </div>
        <h1 className={styles.heading}>Who's learning today?</h1>
        <p className={styles.sub}>Choose your profile to continue</p>
        <div className={styles.cards}>
          {users.map(u => (
            <button key={u.id} className={styles.card} onClick={() => onSelect(u.id)}>
              <span className={styles.avatar}>{u.emoji}</span>
              <div>
                <span className={styles.name}>{u.name}</span>
                <span className={styles.level}>{u.level.replace('-', ' → ')}</span>
              </div>
              <span className={styles.arrow}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '../lib/auth';
import { useAuth } from '../lib/AuthContext';
import styles from './Auth.module.css';

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect as soon as the user is authenticated
  useEffect(() => {
    if (authLoading || !user) return;
    if (profile?.role === 'admin') navigate('/admin', { replace: true });
    else navigate('/dashboard', { replace: true });
  }, [authLoading, user, profile, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      // navigation handled by useEffect above when auth context updates
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : err.message);
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span>🗣️✨</span>
          <span className={styles.logoText}>SpeakUp CI</span>
        </div>
        <p className={styles.sub}>Apprends l'anglais, à ta façon ✨</p>

        <div className={styles.pillToggle}>
          <button className={`${styles.pillTab} ${styles.pillTabActive}`} type="button">Connexion</button>
          <Link to="/register" className={styles.pillTab} style={{textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center'}}>Inscription</Link>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Mot de passe</label>
            <div className={styles.passwordWrapper}>
              <input
                className={styles.input}
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPwd(v => !v)}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
            <div style={{textAlign:'right', marginTop:'0.25rem'}}>
              <span style={{fontSize:'0.78rem', color:'var(--accent)', fontWeight:600, cursor:'pointer'}}>Mot de passe oublié ?</span>
            </div>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Connexion...' : "C'est parti 🚀"}
          </button>
        </form>

        <p className={styles.footer}>
          Nouveau ici ?{' '}
          <Link to="/register" className={styles.link}>Crée un compte</Link>
        </p>
      </div>
    </div>
  );
}

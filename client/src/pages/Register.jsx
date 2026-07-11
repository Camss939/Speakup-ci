import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../lib/auth';
import styles from './Auth.module.css';

const INTERESTS_OPTIONS = [
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'music', label: 'Musique', icon: '🎵' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'movies-series', label: 'Films & Séries', icon: '🎬' },
  { id: 'cars', label: 'Voitures', icon: '🚗' },
  { id: 'animals', label: 'Animaux', icon: '🦁' },
  { id: 'fashion', label: 'Mode & Style', icon: '👟' },
  { id: 'travel', label: 'Voyage', icon: '✈️' },
  { id: 'entrepreneurship', label: 'Business', icon: '💡' },
  { id: 'finance', label: 'Finance', icon: '📈' },
  { id: 'daily-life', label: 'Vie quotidienne', icon: '🌍' },
];
const LEVELS = [
  { value: 'beginner', label: "Débutant (je connais très peu d'anglais)" },
  { value: 'beginner-intermediate', label: 'Faux débutant (je comprends un peu)' },
  { value: 'intermediate', label: 'Intermédiaire (je peux me débrouiller)' },
  { value: 'intermediate-advanced', label: 'Avancé (je veux atteindre le niveau natif)' },
];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirm: '',
    role: 'learner', level: 'beginner-intermediate', interests: [],
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function toggleInterest(id) {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(id)
        ? f.interests.filter(i => i !== id)
        : [...f.interests, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (form.password.length < 6) { setError('Le mot de passe doit avoir au moins 6 caractères.'); return; }
    setError(''); setLoading(true);
    try {
      await signUp(form.email, form.password, form.fullName, form.role, form.level, form.interests);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.successIcon}>✅</div>
        <h1 className={styles.heading}>Compte créé !</h1>
        <p className={styles.sub}>
          {form.role === 'learner'
            ? "Ton compte est en attente d'approbation par l'administrateur. Tu recevras un accès très bientôt !"
            : "Compte créé. Connecte-toi maintenant."}
        </p>
        <button className={styles.btn} onClick={() => navigate('/login')}>
          Aller à la connexion
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span>🎙️</span>
          <span className={styles.logoText}>SpeakUp CI</span>
        </div>
        <h1 className={styles.heading}>Créer un compte</h1>

        <div className={styles.steps}>
          {[1,2,3].map(n => (
            <div key={n} className={`${styles.step} ${step >= n ? styles.stepActive : ''}`}>{n}</div>
          ))}
        </div>

        <form onSubmit={step < 3 ? e => { e.preventDefault(); setStep(s => s+1); } : handleSubmit} className={styles.form}>

          {step === 1 && <>
            <div className={styles.field}>
              <label className={styles.label}>Prénom et nom</label>
              <input className={styles.input} value={form.fullName}
                onChange={e => update('fullName', e.target.value)}
                placeholder="Abdoul Karim Diallo" required autoFocus />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input className={styles.input} type="email" value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="ton@email.com" required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Mot de passe</label>
              <div className={styles.passwordWrapper}>
                <input className={styles.input} type={showPwd ? 'text' : 'password'} value={form.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="Au moins 6 caractères" required />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirmer le mot de passe</label>
              <div className={styles.passwordWrapper}>
                <input className={styles.input} type={showPwd ? 'text' : 'password'} value={form.confirm}
                  onChange={e => update('confirm', e.target.value)}
                  placeholder="••••••••" required />
              </div>
            </div>
          </>}

          {step === 2 && <>
            <div className={styles.field}>
              <label className={styles.label}>Je suis…</label>
              <div className={styles.roleGrid}>
                {[
                  { value: 'learner', label: '👨‍🎓 Apprenant', desc: 'Je veux apprendre l\'anglais' },
                  { value: 'parent', label: '👨‍👩‍👦 Parent', desc: 'Je suis le parent d\'un apprenant' },
                ].map(r => (
                  <button key={r.value} type="button"
                    className={`${styles.roleCard} ${form.role === r.value ? styles.roleCardActive : ''}`}
                    onClick={() => update('role', r.value)}>
                    <span className={styles.roleLabel}>{r.label}</span>
                    <span className={styles.roleDesc}>{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {form.role === 'learner' && (
              <div className={styles.field}>
                <label className={styles.label}>Mon niveau d'anglais</label>
                {LEVELS.map(l => (
                  <label key={l.value} className={`${styles.radioLabel} ${form.level === l.value ? styles.radioActive : ''}`}>
                    <input type="radio" name="level" value={l.value}
                      checked={form.level === l.value}
                      onChange={() => update('level', l.value)} />
                    {l.label}
                  </label>
                ))}
              </div>
            )}
          </>}

          {step === 3 && form.role === 'learner' && <>
            <div className={styles.field}>
              <label className={styles.label}>Mes centres d'intérêt (choisis au moins un)</label>
              <div className={styles.interestsGrid}>
                {INTERESTS_OPTIONS.map(({ id, label, icon }) => {
                  const active = form.interests.includes(id);
                  return (
                    <button key={id} type="button"
                      className={`${styles.interestChip} ${active ? styles.interestActive : ''}`}
                      onClick={() => toggleInterest(id)}>
                      {icon} {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>}

          {step === 3 && form.role === 'parent' && (
            <div className={styles.field}>
              <p className={styles.sub} style={{textAlign:'left'}}>
                Après la création de ton compte, l'administrateur liera ton profil à celui de ton enfant. Tu pourras ensuite suivre sa progression.
              </p>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.btnRow}>
            {step > 1 && (
              <button type="button" className={styles.btnSecondary} onClick={() => setStep(s => s-1)}>
                ← Retour
              </button>
            )}
            <button className={styles.btn} type="submit" disabled={loading}
              style={{ flex: 1 }}>
              {loading ? 'Création...' : step < 3 ? 'Suivant →' : 'Créer mon compte'}
            </button>
          </div>
        </form>

        <p className={styles.footer}>
          Déjà un compte ? <Link to="/login" className={styles.link}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

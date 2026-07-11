import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getAllProfiles, updateProfile, deleteUser, getSessionsForUser, getProgressForUser } from '../lib/db';
import { signOut } from '../lib/auth';
import topics from '../data/topics.json';
import styles from './AdminDashboard.module.css';

const LEVEL_LABELS = {
  'beginner': 'Débutant',
  'beginner-intermediate': 'Faux débutant',
  'intermediate': 'Intermédiaire',
  'intermediate-advanced': 'Avancé',
  'advanced': 'Natif',
};

const totalModules = topics.reduce((n, t) => n + t.modules.length, 0);

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [selectedProgress, setSelectedProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');

  useEffect(() => {
    getAllProfiles().then(data => { setUsers(data); setLoading(false); });
  }, []);

  async function selectUser(u) {
    setSelected(u);
    const [sessions, progress] = await Promise.all([
      getSessionsForUser(u.id),
      getProgressForUser(u.id),
    ]);
    setSelectedSessions(sessions);
    setSelectedProgress(Object.fromEntries(progress.map(p => [p.module_id, p.percentage])));
  }

  async function approve(userId) {
    await updateProfile(userId, { approved: true });
    setUsers(us => us.map(u => u.id === userId ? { ...u, approved: true } : u));
    if (selected?.id === userId) setSelected(s => ({ ...s, approved: true }));
  }

  async function revoke(userId) {
    await updateProfile(userId, { approved: false });
    setUsers(us => us.map(u => u.id === userId ? { ...u, approved: false } : u));
    if (selected?.id === userId) setSelected(s => ({ ...s, approved: false }));
  }

  async function handleDelete(userId) {
    if (!confirm('Supprimer cet utilisateur définitivement ?')) return;
    await deleteUser(userId);
    setUsers(us => us.filter(u => u.id !== userId));
    if (selected?.id === userId) setSelected(null);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const pending = users.filter(u => !u.approved && u.role !== 'admin');
  const learners = users.filter(u => u.role === 'learner');
  const parents = users.filter(u => u.role === 'parent');

  if (loading) return <div className={styles.loader}>Chargement…</div>;

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.brand}>🎙️ <span>SpeakUp CI</span></div>
          <div className={styles.adminBadge}>Admin</div>
        </div>

        <nav className={styles.nav}>
          <button className={`${styles.navItem} ${tab === 'users' ? styles.active : ''}`}
            onClick={() => setTab('users')}>
            👥 Apprenants <span className={styles.badge}>{learners.length}</span>
          </button>
          <button className={`${styles.navItem} ${tab === 'parents' ? styles.active : ''}`}
            onClick={() => setTab('parents')}>
            👨‍👩‍👦 Parents <span className={styles.badge}>{parents.length}</span>
          </button>
          {pending.length > 0 && (
            <button className={`${styles.navItem} ${tab === 'pending' ? styles.active : ''}`}
              onClick={() => setTab('pending')}>
              ⏳ En attente <span className={`${styles.badge} ${styles.badgeAlert}`}>{pending.length}</span>
            </button>
          )}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.adminInfo}>
            <span className={styles.adminName}>👤 {profile?.full_name}</span>
          </div>
          <button className={styles.signoutBtn} onClick={handleSignOut}>Déconnexion</button>
        </div>
      </aside>

      <main className={styles.main}>
        {tab === 'pending' && (
          <section>
            <h1 className={styles.pageTitle}>Comptes en attente</h1>
            <div className={styles.userList}>
              {pending.map(u => (
                <div key={u.id} className={styles.userCard}>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{u.full_name}</span>
                    <span className={styles.userMeta}>{u.role} · {u.level || '—'}</span>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.approveBtn} onClick={() => approve(u.id)}>✓ Approuver</button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(u.id)}>✕ Refuser</button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && <p className={styles.empty}>Aucun compte en attente</p>}
            </div>
          </section>
        )}

        {(tab === 'users' || tab === 'parents') && (
          <div className={styles.splitView}>
            <section className={styles.listPane}>
              <h1 className={styles.pageTitle}>
                {tab === 'users' ? '👨‍🎓 Apprenants' : '👨‍👩‍👦 Parents'}
              </h1>
              <div className={styles.userList}>
                {(tab === 'users' ? learners : parents).map(u => (
                  <div key={u.id}
                    className={`${styles.userCard} ${selected?.id === u.id ? styles.userCardActive : ''}`}
                    onClick={() => selectUser(u)}>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{u.full_name}</span>
                      <span className={styles.userMeta}>
                        {LEVEL_LABELS[u.level] || '—'} · {u.approved ? '✅ Actif' : '⏳ En attente'}
                      </span>
                    </div>
                    <span className={styles.chevron}>›</span>
                  </div>
                ))}
                {(tab === 'users' ? learners : parents).length === 0 &&
                  <p className={styles.empty}>Aucun {tab === 'users' ? 'apprenant' : 'parent'}</p>}
              </div>
            </section>

            <section className={styles.detailPane}>
              {!selected ? (
                <div className={styles.noSelection}>
                  <span>← Sélectionne un utilisateur</span>
                </div>
              ) : (
                <>
                  <div className={styles.detailHeader}>
                    <div>
                      <h2 className={styles.detailName}>{selected.full_name}</h2>
                      <span className={styles.detailMeta}>
                        {selected.role} · {LEVEL_LABELS[selected.level] || '—'}
                      </span>
                    </div>
                    <div className={styles.detailActions}>
                      {selected.approved
                        ? <button className={styles.revokeBtn} onClick={() => revoke(selected.id)}>Suspendre</button>
                        : <button className={styles.approveBtn} onClick={() => approve(selected.id)}>✓ Approuver</button>}
                      <button className={styles.deleteBtn} onClick={() => handleDelete(selected.id)}>Supprimer</button>
                    </div>
                  </div>

                  <div className={styles.statsRow}>
                    <div className={styles.statBox}>
                      <span className={styles.statNum}>{selectedSessions.length}</span>
                      <span className={styles.statLabel}>Sessions</span>
                    </div>
                    <div className={styles.statBox}>
                      <span className={styles.statNum}>
                        {Object.values(selectedProgress).filter(p => p >= 100).length}/{totalModules}
                      </span>
                      <span className={styles.statLabel}>Modules finis</span>
                    </div>
                    <div className={styles.statBox}>
                      <span className={styles.statNum}>
                        {selectedSessions.length
                          ? Math.round(selectedSessions.reduce((s, x) => s + x.duration, 0) / 60)
                          : 0}m
                      </span>
                      <span className={styles.statLabel}>Temps total</span>
                    </div>
                  </div>

                  {selected.role === 'learner' && (
                    <>
                      <h3 className={styles.sectionTitle}>Progression par topic</h3>
                      <div className={styles.topicProgress}>
                        {topics.filter(t => t.forUsers.includes(selected.id) || true).map(topic => {
                          const done = topic.modules.filter(m => (selectedProgress[m.id] || 0) >= 100).length;
                          const pct = Math.round(done / topic.modules.length * 100);
                          return (
                            <div key={topic.id} className={styles.topicRow}>
                              <span className={styles.topicEmoji}>{topic.emoji}</span>
                              <div className={styles.topicInfo}>
                                <span className={styles.topicLabel}>{topic.label}</span>
                                <div className={styles.bar}>
                                  <div className={styles.barFill} style={{ width: `${pct}%`, background: topic.color }} />
                                </div>
                              </div>
                              <span className={styles.topicCount}>{done}/{topic.modules.length}</span>
                            </div>
                          );
                        })}
                      </div>

                      <h3 className={styles.sectionTitle}>Dernières sessions</h3>
                      <div className={styles.sessionList}>
                        {selectedSessions.slice(0, 8).map(s => (
                          <div key={s.id} className={styles.sessionRow}>
                            <span className={styles.sessionDate}>
                              {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className={styles.sessionTitle}>{s.module_title}</span>
                            <span className={styles.sessionDur}>{Math.round(s.duration / 60)}min</span>
                          </div>
                        ))}
                        {!selectedSessions.length && <p className={styles.empty}>Aucune session encore</p>}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

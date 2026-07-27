import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { getProgress, getSessions } from '../lib/db';
import { starsFromPct, masteryLabel } from '../lib/utils';
import topics from '../data/topics.json';
import styles from './Portfolio.module.css';

// Admin can view /portfolio/:userId, learner views /portfolio (own)
export default function Portfolio() {
  const { userId: paramUserId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef();

  const [targetProfile, setTargetProfile] = useState(null);
  const [progress, setProgress] = useState({});
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const targetId = paramUserId || user?.id;

  useEffect(() => {
    if (!targetId) return;
    async function load() {
      // Fetch profile
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', targetId).single();
      setTargetProfile(prof);

      const [prog, sess] = await Promise.all([getProgress(targetId), getSessions(targetId)]);
      setProgress(prog);
      setSessions(sess);
      setLoading(false);
    }
    load();
  }, [targetId]);

  function handlePrint() {
    window.print();
  }

  if (loading) return <div className={styles.loader}>Chargement…</div>;
  if (!targetProfile) return <div className={styles.loader}>Profil introuvable.</div>;

  // Compute stats
  const totalSessions = sessions.length;
  const totalMinutes = Math.round(sessions.reduce((s, x) => s + (x.duration || 0), 0) / 60);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const allModules = topics.flatMap(t => t.modules.map(m => ({ ...m, topicLabel: t.label, topicEmoji: t.emoji, topicColor: t.color })));
  const started = allModules.filter(m => (progress[m.id] || 0) > 0);
  const mastered = allModules.filter(m => (progress[m.id] || 0) >= 80);

  // CEFR estimate from avg progress
  const avgPct = started.length ? Math.round(started.reduce((s, m) => s + (progress[m.id] || 0), 0) / started.length) : 0;
  const cefrLevel =
    avgPct >= 90 ? 'B2' :
    avgPct >= 70 ? 'B1' :
    avgPct >= 50 ? 'A2' :
    avgPct >= 25 ? 'A1' : 'Débutant';

  // Score dimensions (mock from session count heuristic — real scores would come from DB)
  const grammarScore = Math.min(100, Math.round(avgPct * 0.9 + totalSessions * 1.5));
  const vocabScore   = Math.min(100, Math.round(avgPct * 0.85 + mastered.length * 4));
  const fluencyScore = Math.min(100, Math.round(totalSessions * 3 + avgPct * 0.5));
  const confScore    = Math.min(100, Math.round(totalSessions * 2 + avgPct * 0.7));

  const issueDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const firstSession = sessions.length ? new Date(sessions[sessions.length - 1].created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—';

  return (
    <div className={styles.wrapper}>
      {/* Action bar — hidden in print */}
      <div className={styles.actionBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Retour</button>
        <span className={styles.actionTitle}>Attestation de pratique SpeakUp</span>
        <button className={styles.printBtn} onClick={handlePrint}>🖨️ Imprimer / PDF</button>
      </div>

      {/* Printable document */}
      <div className={styles.document} ref={printRef}>

        {/* Header */}
        <div className={styles.docHeader}>
          <div className={styles.docBrand}>
            <span className={styles.docLogo}>🎤</span>
            <div>
              <div className={styles.docBrandName}>SpeakUp CI</div>
              <div className={styles.docBrandSub}>Plateforme d'apprentissage de l'anglais</div>
            </div>
          </div>
          <div className={styles.docTitle}>
            <div className={styles.docTitleMain}>ATTESTATION DE PRATIQUE</div>
            <div className={styles.docTitleSub}>Ce document certifie l'activité de pratique sur la plateforme SpeakUp</div>
          </div>
        </div>

        {/* Student info */}
        <div className={styles.studentBox}>
          <div className={styles.studentAvatar}>{(targetProfile.full_name || 'A')[0].toUpperCase()}</div>
          <div className={styles.studentInfo}>
            <div className={styles.studentName}>{targetProfile.full_name || 'Apprenant'}</div>
            <div className={styles.studentMeta}>
              <span>Niveau déclaré : <strong>{targetProfile.level || '—'}</strong></span>
              <span>Pratique depuis : <strong>{firstSession}</strong></span>
              <span>Émis le : <strong>{issueDate}</strong></span>
            </div>
          </div>
          <div className={styles.cefrBadge}>
            <div className={styles.cefrLevel}>{cefrLevel}</div>
            <div className={styles.cefrLabel}>Niveau estimé</div>
          </div>
        </div>

        {/* Key metrics */}
        <div className={styles.metricsGrid}>
          <div className={styles.metric}>
            <div className={styles.metricNum}>{totalHours}</div>
            <div className={styles.metricLabel}>Heures de pratique</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricNum}>{totalSessions}</div>
            <div className={styles.metricLabel}>Sessions complétées</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricNum}>{mastered.length}</div>
            <div className={styles.metricLabel}>Modules maîtrisés</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricNum}>{started.length}</div>
            <div className={styles.metricLabel}>Modules explorés</div>
          </div>
        </div>

        {/* Skill bars */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Évaluation des compétences</div>
          <div className={styles.skillBars}>
            {[
              { label: 'Grammaire', score: grammarScore, icon: '📝' },
              { label: 'Vocabulaire', score: vocabScore, icon: '📚' },
              { label: 'Aisance orale', score: fluencyScore, icon: '🗣️' },
              { label: 'Confiance', score: confScore, icon: '💪' },
            ].map(sk => (
              <div key={sk.label} className={styles.skillRow}>
                <span className={styles.skillIcon}>{sk.icon}</span>
                <span className={styles.skillLabel}>{sk.label}</span>
                <div className={styles.skillTrack}>
                  <div className={styles.skillFill} style={{ width: `${sk.score}%` }} />
                </div>
                <span className={styles.skillScore}>{sk.score}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Module progression */}
        {started.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Progression par module</div>
            <div className={styles.moduleGrid}>
              {started.map(m => {
                const pct = progress[m.id] || 0;
                return (
                  <div key={m.id} className={styles.moduleCard}>
                    <div className={styles.moduleCardTop}>
                      <span className={styles.moduleCardEmoji}>{m.topicEmoji}</span>
                      <span className={styles.moduleCardTitle}>{m.title}</span>
                      {pct >= 80 && <span className={styles.masterStamp}>✓</span>}
                    </div>
                    <div className={styles.moduleCardBar}>
                      <div className={styles.moduleCardFill} style={{ width: `${pct}%`, background: m.topicColor }} />
                    </div>
                    <div className={styles.moduleCardMeta}>
                      <span>{starsFromPct(pct)}</span>
                      <span className={styles.moduleCardLabel}>{masteryLabel(pct)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.docFooter}>
          <div className={styles.footerNote}>
            ⚠️ Ce document atteste uniquement de l'activité de pratique sur la plateforme SpeakUp CI. Il ne constitue pas une certification officielle de niveau de langue. Les scores sont des estimations basées sur les sessions de pratique.
          </div>
          <div className={styles.footerSig}>
            <div className={styles.footerSigLine}>
              <div className={styles.sigBlank} />
              <div className={styles.sigLabel}>Directeur de l'établissement</div>
            </div>
            <div className={styles.footerSigLine}>
              <div className={styles.sigBrand}>SpeakUp CI ™</div>
              <div className={styles.sigLabel}>Plateforme certifiée</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import styles from './SessionReport.module.css';

const LEVEL_COLORS = {
  'A1': '#6B7280', 'A1+': '#6B7280',
  'A2': '#3B82F6', 'A2+': '#3B82F6',
  'B1': '#10B981', 'B1+': '#10B981',
  'B2': '#8B5CF6', 'B2+': '#8B5CF6',
};

function ScoreBar({ label, value, color }) {
  return (
    <div className={styles.scoreRow}>
      <div className={styles.scoreLabel}>{label}</div>
      <div className={styles.scoreTrack}>
        <div className={styles.scoreFill} style={{ width: `${value}%`, background: color }} />
      </div>
      <div className={styles.scoreNum}>{value}<span className={styles.scoreOf}>/100</span></div>
    </div>
  );
}

export default function SessionReport({ evaluation, moduleTitle, duration, onClose }) {
  const { words_learned = [], expressions = [], errors_corrected = [],
    scores = {}, level = '—', strengths = [], improvements = [], tomorrow_objectives = [] } = evaluation;

  const durationMin = Math.round((duration || 0) / 60);
  const levelColor = LEVEL_COLORS[level] || '#6B7280';

  const scoreItems = [
    { label: 'Grammaire', key: 'grammar', color: '#3B82F6' },
    { label: 'Vocabulaire', key: 'vocabulary', color: '#10B981' },
    { label: 'Fluidité', key: 'fluency', color: '#8B5CF6' },
    { label: 'Confiance', key: 'confidence', color: '#F59E0B' },
  ];

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerTitle}>Rapport de session</div>
            <div className={styles.headerModule}>{moduleTitle}</div>
          </div>
          <div className={styles.levelBadge} style={{ background: levelColor }}>
            {level}
          </div>
        </div>

        {/* Quick stats */}
        <div className={styles.quickStats}>
          <div className={styles.qstat}>
            <span className={styles.qstatNum}>{durationMin}m</span>
            <span className={styles.qstatLabel}>Durée</span>
          </div>
          <div className={styles.qstat}>
            <span className={styles.qstatNum}>{words_learned.length}</span>
            <span className={styles.qstatLabel}>Mots appris</span>
          </div>
          <div className={styles.qstat}>
            <span className={styles.qstatNum}>{expressions.length}</span>
            <span className={styles.qstatLabel}>Expressions</span>
          </div>
          <div className={styles.qstat}>
            <span className={styles.qstatNum}>{errors_corrected.length}</span>
            <span className={styles.qstatLabel}>Erreurs corrigées</span>
          </div>
        </div>

        <div className={styles.body}>

          {/* Scores */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>📊 Compétences</div>
            <div className={styles.scores}>
              {scoreItems.map(({ label, key, color }) => (
                <ScoreBar key={key} label={label} value={scores[key] ?? 0} color={color} />
              ))}
            </div>
          </div>

          {/* Words learned */}
          {words_learned.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>✅ Mots maîtrisés aujourd'hui</div>
              <div className={styles.chips}>
                {words_learned.map((w, i) => (
                  <span key={i} className={styles.chip}>{w}</span>
                ))}
              </div>
            </div>
          )}

          {/* Expressions */}
          {expressions.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>💬 Expressions utilisées</div>
              <div className={styles.chips}>
                {expressions.map((e, i) => (
                  <span key={i} className={`${styles.chip} ${styles.chipExpr}`}>{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {errors_corrected.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>🔧 Erreurs corrigées</div>
              <div className={styles.errors}>
                {errors_corrected.map((e, i) => (
                  <div key={i} className={styles.errorRow}>
                    <span className={styles.errorBad}>✕ {e.error}</span>
                    <span className={styles.errorArrow}>→</span>
                    <span className={styles.errorGood}>✓ {e.correction}</span>
                    {e.rule && <span className={styles.errorRule}>{e.rule}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & improvements side by side */}
          {(strengths.length > 0 || improvements.length > 0) && (
            <div className={styles.twoCol}>
              {strengths.length > 0 && (
                <div className={`${styles.section} ${styles.sectionGreen}`}>
                  <div className={styles.sectionTitle}>💪 Points forts</div>
                  <ul className={styles.feedbackList}>
                    {strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {improvements.length > 0 && (
                <div className={`${styles.section} ${styles.sectionAmber}`}>
                  <div className={styles.sectionTitle}>🎯 À améliorer</div>
                  <ul className={styles.feedbackList}>
                    {improvements.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tomorrow */}
          {tomorrow_objectives.length > 0 && (
            <div className={`${styles.section} ${styles.sectionBlue}`}>
              <div className={styles.sectionTitle}>📅 Objectifs pour demain</div>
              <ul className={styles.feedbackList}>
                {tomorrow_objectives.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.closeBtn} onClick={onClose}>
            Terminer la session →
          </button>
        </div>
      </div>
    </div>
  );
}

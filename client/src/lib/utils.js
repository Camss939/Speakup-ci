// Convert 0-100 percentage to star display (5 stars max)
export function starsFromPct(pct) {
  const n = pct <= 0 ? 0 : pct <= 20 ? 1 : pct <= 40 ? 2 : pct <= 60 ? 3 : pct <= 80 ? 4 : 5;
  return '⭐'.repeat(n) + '☆'.repeat(5 - n);
}

export function masteryLabel(pct) {
  if (pct <= 0)  return 'Non commencé';
  if (pct <= 20) return 'Découverte';
  if (pct <= 40) return 'Notions';
  if (pct <= 60) return 'En progression';
  if (pct <= 80) return 'Avancé';
  return 'Maîtrisé ✓';
}

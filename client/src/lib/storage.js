const KEY = (userId, suffix) => `speakup:${userId}:${suffix}`;

export function getProgress(userId) {
  const raw = localStorage.getItem(KEY(userId, 'progress'));
  return raw ? JSON.parse(raw) : {};
}

export function setModuleProgress(userId, moduleId, pct) {
  const p = getProgress(userId);
  p[moduleId] = pct;
  localStorage.setItem(KEY(userId, 'progress'), JSON.stringify(p));
}

export function getSessions(userId) {
  const raw = localStorage.getItem(KEY(userId, 'sessions'));
  return raw ? JSON.parse(raw) : [];
}

export function addSession(userId, session) {
  const sessions = getSessions(userId);
  sessions.unshift({ ...session, id: Date.now(), date: new Date().toISOString() });
  localStorage.setItem(KEY(userId, 'sessions'), JSON.stringify(sessions.slice(0, 100)));
}

export function getStreak(userId) {
  const sessions = getSessions(userId);
  if (!sessions.length) return 0;

  const days = new Set(sessions.map(s => s.date.slice(0, 10)));
  const sorted = [...days].sort().reverse();

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const day of sorted) {
    const d = new Date(day);
    const diff = Math.round((cursor - d) / 86400000);
    if (diff <= 1) {
      streak++;
      cursor = d;
    } else break;
  }
  return streak;
}

export function getConversationHistory(userId, moduleId) {
  const raw = localStorage.getItem(KEY(userId, `conv:${moduleId}`));
  return raw ? JSON.parse(raw) : [];
}

export function saveConversationHistory(userId, moduleId, messages) {
  localStorage.setItem(KEY(userId, `conv:${moduleId}`), JSON.stringify(messages.slice(-40)));
}

export function clearConversationHistory(userId, moduleId) {
  localStorage.removeItem(KEY(userId, `conv:${moduleId}`));
}

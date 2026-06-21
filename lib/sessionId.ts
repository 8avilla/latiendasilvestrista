const KEY = '_lts_sid';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem(KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(KEY, sid);
    }
    return sid;
  } catch {
    return '';
  }
}

export function trackEvent(
  event: string,
  meta?: Record<string, string | number>
) {
  const sid = getSessionId();
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, sessionId: sid, ...(meta ? { meta } : {}) }),
  }).catch(() => {});
}

export const SESSION_KEY = 'shichuang.session';
export const SESSION_TOKEN_KEY = 'shichuang.session.token';
export const SESSION_CHANGED = 'shichuang.session.changed';
export const SHARED_SESSION_KEY = 'shichuang.session.shared';

// 同源窗口复用已有会话；链接中不携带凭据，过期时间仍由 readSession 校验。
export function shareStoredSession() {
  try {
    window.localStorage?.setItem(SHARED_SESSION_KEY, JSON.stringify({
      session: sessionStorage.getItem(SESSION_KEY), token: sessionStorage.getItem(SESSION_TOKEN_KEY),
    }));
  } catch { /* 存储受限时保留当前窗口的会话。 */ }
}

export function restoreSharedSession() {
  try {
    const shared = window.localStorage?.getItem(SHARED_SESSION_KEY);
    if (shared === 'null') {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } else if (shared && !sessionStorage.getItem(SESSION_KEY)) {
      const value = JSON.parse(shared);
      if (typeof value?.session === 'string' && typeof value?.token === 'string') {
        sessionStorage.setItem(SESSION_KEY, value.session);
        sessionStorage.setItem(SESSION_TOKEN_KEY, value.token);
      }
    }
  } catch { /* 无有效共享会话时沿用正常登录校验。 */ }
}

export function clearStoredSession() {
  // 保留退出标记，避免其他窗口用旧会话重新恢复登录。
  try { window.localStorage?.setItem(SHARED_SESSION_KEY, 'null'); } catch { /* 当前窗口仍正常退出。 */ }
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGED));
}

// A late response from a previous login must not invalidate the current login.
export function invalidateSession(requestToken: string | null) {
  try {
    const shared = window.localStorage?.getItem(SHARED_SESSION_KEY);
    if (shared && shared !== 'null' && JSON.parse(shared)?.token !== requestToken) return;
  } catch { /* 沿用当前窗口的令牌校验。 */ }
  if (sessionStorage.getItem(SESSION_TOKEN_KEY) === requestToken) clearStoredSession();
}

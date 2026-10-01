export const SESSION_KEY = 'shichuang.session';
export const SESSION_TOKEN_KEY = 'shichuang.session.token';
export const SESSION_CHANGED = 'shichuang.session.changed';

export function clearStoredSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  window.dispatchEvent(new Event(SESSION_CHANGED));
}

// A late response from a previous login must not invalidate the current login.
export function invalidateSession(requestToken: string | null) {
  if (sessionStorage.getItem(SESSION_TOKEN_KEY) === requestToken) clearStoredSession();
}

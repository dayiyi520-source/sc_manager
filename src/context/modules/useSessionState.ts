import { useEffect, useState } from 'react';
import { resolveDataMode } from '../../hooks/useDataMode';
import { readSession } from '../../services/session';
import type { CurrentUser } from '../../types';

export function useSessionState(fallbackUser: CurrentUser) {
  const initialSession = readSession();
  const [currentUser, setCurrentUser] = useState<CurrentUser>(initialSession?.user || fallbackUser);
  const [sessionToken, setSessionToken] = useState(initialSession?.token || '');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const session = readSession();
    setSessionToken(session?.token || '');
    setSessionReady(Boolean(session));
    if (session) setCurrentUser(session.user);
  }, []);

  return {
    currentUser,
    setCurrentUser,
    sessionToken,
    dataMode: resolveDataMode(sessionToken, sessionReady),
  };
}

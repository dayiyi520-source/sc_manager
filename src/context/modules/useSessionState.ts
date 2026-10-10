import { useEffect, useState } from 'react';
import { resolveDataMode } from '../../hooks/useDataMode';
import { readSession } from '../../services/session';
import type { CurrentUser } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { teamRepository } from '../../services/teamRepository';

export function useSessionState(fallbackUser: CurrentUser) {
  const initialSession = readSession();
  const [currentUser, setCurrentUser] = useState<CurrentUser>(initialSession?.user || fallbackUser);
  const [sessionToken, setSessionToken] = useState(initialSession?.token || '');
  const [sessionReady, setSessionReady] = useState(false);
  const members = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, retry: false });
  const member = members.data?.find(item => item.id === currentUser.id);
  const resolvedUser = member ? {
    ...currentUser,
    name: member.name,
    department: member.department || '',
    roleTitle: member.jobTitle || member.roleTitle || '团队成员',
    avatar: member.avatar || currentUser.avatar,
  } : currentUser;

  useEffect(() => {
    const session = readSession();
    setSessionToken(session?.token || '');
    setSessionReady(Boolean(session));
    if (session) setCurrentUser(session.user);
  }, []);

  return {
    currentUser: resolvedUser,
    setCurrentUser,
    sessionToken,
    dataMode: resolveDataMode(sessionToken, sessionReady),
  };
}

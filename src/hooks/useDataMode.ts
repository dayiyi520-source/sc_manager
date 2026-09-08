export type DataMode = 'local' | 'remote';

export const resolveDataMode = (token: string, ready: boolean): DataMode =>
  Boolean(token) && ready && !token.startsWith('local-dev-') ? 'remote' : 'local';

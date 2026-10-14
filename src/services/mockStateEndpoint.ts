export function mockStateEndpoint(kind: 'okr-state' | 'research-template'): string {
  return import.meta.env.DEV || import.meta.env.MODE === 'test'
    ? `/__dev/${kind}`
    : `${import.meta.env.BASE_URL}api/mock/${kind}`;
}

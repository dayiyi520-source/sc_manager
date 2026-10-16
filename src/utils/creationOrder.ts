/** Missing or invalid creation dates sort last; equal dates keep their input order. */
export const newestCreatedFirst = (a: { createdAt?: string }, b: { createdAt?: string }) => {
  const time = (value?: string) => { const parsed = Date.parse(value || ''); return Number.isFinite(parsed) ? parsed : 0; };
  return time(b.createdAt) - time(a.createdAt);
};

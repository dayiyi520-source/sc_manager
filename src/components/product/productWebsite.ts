export const normalizeProductWebsiteUrl = (value?: string) => {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname ? candidate : null;
  } catch {
    return null;
  }
};

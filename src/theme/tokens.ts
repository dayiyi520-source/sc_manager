export const AIEDIT_TOKENS = {
  dark: { bgMain: '#0C0F13', bgNav: '#0B111A', surface: '#121923', surfaceSoft: '#151A22', border: '#2C3440', borderStrong: '#3A4655', primary: '#2F66F6', primaryHover: '#3B73FF', text: '#F8FAFC', textMuted: '#A5ADBA', textSubtle: '#7C8796', success: '#22C55E', warning: '#FACC15', danger: '#F26D5B' },
  light: { bgMain: '#F5F6F8', bgNav: '#001529', surface: '#FFFFFF', surfaceSoft: '#F7F8FA', border: '#E5E7EB', borderStrong: '#D1D5DB', primary: '#1677FF', primaryHover: '#4096FF', text: '#111827', textMuted: '#374151', textSubtle: '#6B7280', success: '#16A34A', warning: '#D97706', danger: '#DC2626' },
} as const;

export type AieditTheme = keyof typeof AIEDIT_TOKENS;
export const tokenCss = (mode: AieditTheme) => Object.entries(AIEDIT_TOKENS[mode]).map(([key,value]) => `--aiedit-${key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${value}`).join(';');

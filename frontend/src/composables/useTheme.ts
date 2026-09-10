import { ref, watch, onMounted } from 'vue';

export type Theme = 'light' | 'dark';

const theme = ref<Theme>('light');

export function useTheme() {
  // 初始化主题
  onMounted(() => {
    const storedTheme = window.localStorage.getItem('sc-admin-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      theme.value = storedTheme;
    }
    applyTheme(theme.value);
  });

  // 监听主题变化
  watch(theme, (newTheme) => {
    applyTheme(newTheme);
    window.localStorage.setItem('sc-admin-theme', newTheme);
  });

  function applyTheme(t: Theme) {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.colorScheme = t;
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme;
  }

  return {
    theme,
    toggleTheme,
    setTheme,
  };
}

import React, { StrictMode, useEffect, useState } from 'react';
import {createRoot} from 'react-dom/client';
import {ConfigProvider, theme} from 'antd';
import App from './App.tsx';
import './index.css';
import './styles/antd-override.css';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AIEDIT_TOKENS } from './theme/tokens';

const queryClient = new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000}}});
const routerBasePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

const cssToken = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
};

// 主题包装器组件 - 根据 .dark 类动态切换主题
const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    // 监听 dark 类的变化
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const tokens = isDark ? AIEDIT_TOKENS.dark : AIEDIT_TOKENS.light;
  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          // AIEDIT 品牌色
          colorPrimary: cssToken('--primary', tokens.primary),
          colorSuccess: cssToken('--success', tokens.success),
          colorWarning: cssToken('--warning', tokens.warning),
          colorError: cssToken('--danger', tokens.danger),
          colorInfo: cssToken('--primary-hover', tokens.primaryHover),
          
          // 字体
          fontSize: 12,
          fontFamily: cssToken('--font-sans', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'),
          controlHeight: 36,
          colorText: tokens.text,
          colorTextSecondary: tokens.textMuted,
          colorTextPlaceholder: tokens.textSubtle,
          colorBgBase: tokens.bgMain,
          colorBgContainer: tokens.surface,
          colorBorder: tokens.border,
          colorBorderSecondary: tokens.borderStrong,
          
          // 圆角
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,
          
          // 间距
          paddingLG: 24,
          padding: 16,
          paddingSM: 12,
          paddingXS: 8,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeWrapper>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={routerBasePath}><App /></BrowserRouter>
        </QueryClientProvider>
      </ThemeWrapper>
    </ErrorBoundary>
  </StrictMode>,
);

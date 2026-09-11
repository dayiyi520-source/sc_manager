import React, { StrictMode, useEffect, useState } from 'react';
import {createRoot} from 'react-dom/client';
import {ConfigProvider, theme} from 'antd';
import App from './App.tsx';
import './index.css';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const queryClient = new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000}}});

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

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          // AIEDIT 品牌色
          colorPrimary: cssToken('--primary', '#2F66F6'),
          colorSuccess: cssToken('--success', '#22C55E'),
          colorWarning: cssToken('--warning', '#FACC15'),
          colorError: cssToken('--danger', '#F26D5B'),
          colorInfo: cssToken('--primary', '#3B82F6'),
          
          // 字体
          fontSize: 14,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          
          // 圆角
          borderRadius: 6,
          borderRadiusLG: 8,
          borderRadiusSM: 4,
          
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
          <BrowserRouter><App /></BrowserRouter>
        </QueryClientProvider>
      </ThemeWrapper>
    </ErrorBoundary>
  </StrictMode>,
);

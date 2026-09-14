import { useEffect, useState, type ReactNode } from 'react';
import { App, ConfigProvider, Empty, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

/** Keep portalled dialogs and feedback on the same AIEDIT tokens as the workspace. */
export function OkrProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const css = getComputedStyle(document.documentElement);
  const value = (name: string) => css.getPropertyValue(name).trim();
  return <ConfigProvider locale={zhCN} renderEmpty={()=><Empty image={<svg viewBox="0 0 48 48" height="48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M33 7c3 15-5 25-20 25 6 8 19 8 25-1 5-8 3-18-2-24Z"/><path d="M13 32c12 3 23-4 23-18M33 7l1-3 4 1-2 3"/></svg>} description="暂无记录"/>} theme={{
    algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: value('--primary'), colorLink: value(dark?'--active-text':'--primary'),
      colorLinkHover: value('--primary-hover'), colorBgContainer: value('--bg-surface'),
      colorBgElevated: value('--bg-elevated'), colorBgLayout: value('--bg-main'),
      colorText: value('--text-primary'), colorTextSecondary: value('--text-body'),
      colorTextPlaceholder: value('--text-muted'), colorBorder: value('--border-main'),
      colorBorderSecondary: value('--border-main'), colorFillAlter: value('--bg-surface-soft'),
      fontSize: 14, fontSizeHeading3: 24, fontSizeHeading4: 18, fontSizeHeading5: 16,
      controlHeight: 32, borderRadius: 8, borderRadiusLG: 12,
      padding: 16, paddingSM: 12, paddingLG: 24,
    },
    components: {
      Table: { headerBg: value('--bg-surface-soft'), rowHoverBg: value('--bg-elevated') },
      Tabs: { titleFontSize: 14 },
    },
  }}><App>{children}</App></ConfigProvider>;
}

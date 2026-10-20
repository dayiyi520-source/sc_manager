import type { ModalProps } from 'antd';

export const feedModalStyles: ModalProps['styles'] = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'min(620px, calc(100dvh - 64px))',
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flex: 'none',
    margin: 0,
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-main)',
  },
  body: {
    flex: '1 1 auto',
    minHeight: 0,
    padding: 0,
    overflow: 'hidden',
  },
  footer: {
    flex: 'none',
    margin: 0,
    padding: '12px 24px',
    borderTop: '1px solid var(--border-main)',
  },
};

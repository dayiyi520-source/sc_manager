// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComprehensivePage } from './ComprehensivePage';

describe('ComprehensivePage header', () => {
  it('retains the header for other comprehensive pages', () => {
    render(<ComprehensivePage title="其他页面" description="说明" icon={<span>图标</span>}><div>业务内容</div></ComprehensivePage>);
    expect(screen.getByRole('heading', { name: '其他页面' })).toBeTruthy();
    expect(screen.getByText('业务内容')).toBeTruthy();
  });

  it('hides the heading block without hiding business content', () => {
    render(<ComprehensivePage title="审批管理" description="说明" icon={<span>图标</span>} hideHeader><div>业务内容</div></ComprehensivePage>);
    expect(screen.queryByRole('heading', { name: '审批管理' })).toBeNull();
    expect(screen.queryByText('COMPREHENSIVE CENTER')).toBeNull();
    expect(screen.getByText('业务内容')).toBeTruthy();
  });
});

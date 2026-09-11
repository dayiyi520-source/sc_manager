// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchableSelect } from './Form';

describe('SearchableSelect compact multiple mode', () => {
  it('renders selected values inline and removes a selected value', () => {
    const onChangeMultiple = vi.fn();

    render(
      <SearchableSelect
        label="负责人"
        value=""
        options={['张瑞', '王浩然']}
        onChange={() => undefined}
        multiple
        compact
        selectedValues={['张瑞', '王浩然']}
        onChangeMultiple={onChangeMultiple}
      />
    );

    expect(screen.getByText('张瑞')).toBeTruthy();
    expect(screen.getByText('王浩然')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '移除张瑞' }));
    expect(onChangeMultiple).toHaveBeenCalledWith(['王浩然']);
  });

  it('supports a controlled menu without rendering a trigger', () => {
    render(
      <SearchableSelect
        label="搜索负责人"
        value=""
        options={['张瑞']}
        onChange={() => undefined}
        open
        hideTrigger
      />
    );

    expect(screen.queryByRole('button', { name: '搜索负责人' })).toBeNull();
    expect(screen.getByPlaceholderText('输入关键词搜索')).toBeTruthy();
  });
});

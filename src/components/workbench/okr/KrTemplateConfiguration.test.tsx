// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OkrSettingsView } from './OkrSettingsView';
import type { OkrSettings } from '../../../services/okrRepository';
const settings: OkrSettings = { defaultView: 'list', timeRules: [], templates: [{ department: '产品规划部', type: 'product', fields: [], stages: ['设计','开发'] }, { department: '产品规划部', type: 'support', fields: [] }], validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true }, dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] } };
describe('unified OKR configuration', () => {
  it('migrates legacy department KR assignments to O templates without exposing phase inputs', async () => {
    const save = vi.fn(async (_settings: OkrSettings) => true);
    render(<OkrSettingsView settings={{ ...settings, objectiveTitleTemplates: [{ id: 'o', department: '产品规划部', title: '本月产品目标', guidance: '', enabled: true }] }} departments={['产品规划部']} onSave={save}/>);
    expect(screen.getByRole('button', { name: 'OKR模板' })).toBeInTheDocument();
    expect(screen.queryByLabelText('KR模板1产研KR阶段')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑本月产品目标' }));
    fireEvent.change(screen.getByLabelText('第1条O标题'), { target: { value: '交付目标' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '提交模板' })); });
    expect(save.mock.calls[0][0].objectiveTitleTemplates?.[0].krTypes).toEqual(['product', 'support']);
    expect(save.mock.calls[0][0].templates).toEqual(settings.templates);
  });
});

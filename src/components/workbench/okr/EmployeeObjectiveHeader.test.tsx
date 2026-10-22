// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { EmployeeObjectiveHeader } from './EmployeeObjectiveHeader';
import type { OKRItem } from '../../../types';
import type { OkrRecord } from '../../../services/okrRepository';

it('uses complete department KR weights and progress rather than the employee subset', () => {
  const objective: OKRItem = { id:'department', cycle:'2026-10', ownerId:'me', ownerName:'本人', department:'产品部', category:'my', objective:'部门目标', weight:100, progress:0, deadline:'2026-10-31', status:'active', keyResults:[{id:'mine',content:'本人负责',weight:100,progress:0,deadline:'2026-10-31'}] };
  const department: OkrRecord = { id:'department',kind:'objective',ownerId:'manager',periodKey:'2026-10',status:'active',version:1,payload:{title:'完整部门目标',goalLevel:'department',weight:40,keyResults:[{id:'mine',title:'本人负责',weight:25,progress:20},{id:'other',title:'其他成果',weight:75,progress:60}]}};
  render(<EmployeeObjectiveHeader objective={objective} records={[department]} index={0} startDate="2026-10-12" endDate="2026-10-18" reviewType="week"/>);
  expect(screen.getByText('完整部门目标')).toBeInTheDocument();
  expect(screen.getByLabelText('目标权重 40%')).toBeInTheDocument();
  expect(screen.getByLabelText('目标进度 50% → 50%')).toBeInTheDocument();
});

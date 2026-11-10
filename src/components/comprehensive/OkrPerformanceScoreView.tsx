import { useEffect, useState } from 'react';
import { Empty, Tag } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { okrRepository, type OkrPerson, type OkrRecord } from '../../services/okrRepository';
import { calculateOkrScore, scoreObjectivesFor } from '../../services/okrPerformanceScore';
import type { KpiEmployee } from '../../services/kpiPerformanceDemo';
import mockOkrState from '../../data/mockOkrState.json';

interface Props {
  month: string;
  employees: KpiEmployee[];
  onScoresLoaded?: (scores: Record<string, { completion: number; objective: number }>) => void;
}

const demoPeople = mockOkrState.okrPeople.filter(person => /^e-0[1-6]$/.test(person.id)) as OkrPerson[];
const demoRecords = mockOkrState.okrRecords.filter(record => record.id.startsWith('kpi-demo-goal-e-')) as OkrRecord[];

export function OkrPerformanceScoreView({ month, employees, onScoresLoaded }: Props) {
  const [people, setPeople] = useState<OkrPerson[]>(demoPeople);
  const [records, setRecords] = useState<OkrRecord[]>(demoRecords);

  useEffect(() => {
    let active = true;
    void Promise.all([okrRepository.people(), okrRepository.records()]).then(([savedPeople, savedRecords]) => {
      if (!active) return;
      const personIds = new Set(savedPeople.map(person => person.id));
      const recordIds = new Set(savedRecords.map(record => record.id));
      setPeople([...savedPeople, ...demoPeople.filter(person => !personIds.has(person.id))]);
      setRecords([...savedRecords, ...demoRecords.filter(record => !recordIds.has(record.id))]);
    }).catch(() => {
      // Checked-in demo rows remain available if the optional file service is unavailable.
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!onScoresLoaded) return;
    const scores: Record<string, { completion: number; objective: number }> = {};
    for (const person of demoPeople) {
      const goals = scoreObjectivesFor(records, people, person.id, month, 'personal');
      const score = calculateOkrScore(goals, []);
      if (score.total === null) continue;
      scores[person.id] = {
        completion: goals.filter(goal => goal.type === 'target').reduce((sum, goal) => sum + goal.weight * goal.progress / 100, 0),
        objective: score.total,
      };
    }
    onScoresLoaded(scores);
  }, [month, people, records]);

  return <>
    <div className="kpi-inline-notice"><DatabaseOutlined /> 数据范围：{month.slice(0, 4)}年{Number(month.slice(5))}月 · {employees.length} 位员工</div>
    <div className="kpi-source-table-wrap"><table className="kpi-source-table"><thead><tr>
      <th>员工</th><th>部门</th><th>月度目标完成率</th><th>目标基础分</th><th>KR 完成率扣分</th><th>刚性红线</th><th>综合基础分</th><th>备注</th>
    </tr></thead><tbody>{employees.map(employee => {
      const goals = scoreObjectivesFor(records, people, employee.id, month, 'personal');
      const score = calculateOkrScore(goals, []);
      const promised = goals.filter(goal => goal.type === 'target');
      const completion = promised.reduce((sum, goal) => sum + goal.weight * goal.progress / 100, 0);
      const below90 = promised.filter(goal => goal.progress < 90);
      const below80 = promised.filter(goal => goal.progress < 80);
      const reasons = [
        ...(below90.length >= 2 ? [`${below90.length} 个承诺型 O 完成率低于 90%`] : []),
        ...(below80.length ? [`承诺型 O「${below80.map(goal => goal.title).join('、')}」完成率低于 80%`] : []),
      ];
      return <tr key={employee.id}><td><b>{employee.name}</b></td><td>{employee.department}</td>
        <td>{score.validWeights ? `${completion.toFixed(1)}%` : '—'}</td>
        <td>{score.validWeights ? score.base.toFixed(2) : '—'}</td>
        <td>{score.validWeights ? score.automaticDeduction.toFixed(2) : '—'}</td>
        <td><Tag color={score.redline ? 'error' : 'success'}>{score.redline ? '是' : '否'}</Tag></td>
        <td>{score.total === null ? '待确认' : score.total.toFixed(2)}</td>
        <td>{reasons.join('；') || (score.validWeights ? '—' : '目标权重待确认')}</td>
      </tr>;
    })}</tbody></table></div>
    {!employees.length && <Empty description="没有匹配的员工原始数据" />}
  </>;
}

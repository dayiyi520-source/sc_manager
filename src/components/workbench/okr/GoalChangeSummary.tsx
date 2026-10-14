import React from 'react';
import { Empty } from 'antd';
import type { OkrPayload, OkrPerson } from '../../../services/okrRepository';
import { goalDifferences } from './goalConfirmation';

export function GoalChangeSummary({ before, after, people = [] }: { before: OkrPayload; after: OkrPayload; people?: OkrPerson[] }) {
  const changes = goalDifferences(before, after, people);
  return changes.length ? <section className="okr-change-summary" aria-label="修改信息">{changes.map(row => <div key={row.id} className="okr-change-summary-row"><strong>{row.label}</strong><span className="is-before">{row.before}</span><span aria-hidden="true">→</span><span className="is-after">{row.after}</span></div>)}</section> : <Empty description="未发现可见内容变化，请核对修改原因"/>;
}

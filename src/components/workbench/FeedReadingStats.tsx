import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Empty, Popover, Spin } from 'antd';
import dayjs from 'dayjs';
import { teamRepository } from '../../services/teamRepository';
import { feedEmployeeReceipts, FEED_READING_CHANGED, readingKey, type FeedEmployeeReceipt } from '../../services/workbenchFeedReading';
import type { WorkbenchFeed } from '../../services/workbenchFeeds';
import type { EmployeeOption } from '../../types';

function ReceiptList({ rows, read }: { rows: FeedEmployeeReceipt[]; read: boolean }) {
  if (!rows.length) return <Empty description="暂无员工"/>;
  return <div className="max-h-72 max-w-full overflow-auto"><table className="w-full text-left text-xs">
    <thead><tr className="text-[var(--text-muted)]">
      <th className="px-2 py-2 font-medium">员工</th>
      <th className="px-2 py-2 font-medium">{read ? '状态（次数）' : '状态'}</th>
      {read && <th className="px-2 py-2 font-medium">最近已读时间</th>}
    </tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} className="border-t border-[var(--border-main)]">
      <td className="max-w-40 break-words px-2 py-2">{row.name}</td>
      <td className="whitespace-nowrap px-2 py-2">{read ? '已读（' + row.readCount + '次）' : '未读'}</td>
      {read && <td className="whitespace-nowrap px-2 py-2 text-[var(--text-muted)]">{row.lastReadAt ? dayjs(row.lastReadAt).format('YYYY-MM-DD HH:mm:ss') : '时间未记录'}</td>}
    </tr>)}</tbody>
  </table></div>;
}

export function FeedReadingStats({ feed }: { feed: WorkbenchFeed }) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    teamRepository.options().then(rows => { if (active) setEmployees(rows); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : '员工读取失败'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    const changed = () => refresh(value => value + 1);
    const stored = (event: StorageEvent) => { if (!event.key || event.key.startsWith(readingKey(''))) changed(); };
    window.addEventListener(FEED_READING_CHANGED, changed); window.addEventListener('storage', stored);
    return () => { window.removeEventListener(FEED_READING_CHANGED, changed); window.removeEventListener('storage', stored); };
  }, []);
  let receipts: FeedEmployeeReceipt[] = [];
  let readError = error;
  if (!loading && !error) {
    try { receipts = feedEmployeeReceipts(feed, employees); }
    catch (cause) { readError = cause instanceof Error ? cause.message : '阅读统计加载失败'; }
  }
  const count = (read: boolean) => {
    if (loading) return <Spin size="small"/>;
    if (readError) return '—';
    const rows = receipts.filter(row => row.read === read);
    const label = read ? '已读' : '未读';
    return <Popover trigger={['hover', 'focus']} title={`${label}员工`} content={<ReceiptList rows={rows} read={read}/>}><button type="button" aria-label={`${label}（${rows.length}）`} className="rounded text-[var(--primary)] transition-opacity hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70">（{rows.length}）</button></Popover>;
  };
  return <section aria-label="阅读统计"><Descriptions column={1} size="small" items={[{key:'read',label:'已读',children:count(true)},{key:'unread',label:'未读',children:count(false)}]}/>{readError && <Alert type="error" showIcon title="阅读统计加载失败" description={readError} action={<Button size="small" onClick={() => setAttempt(value => value + 1)}>重试</Button>}/>}</section>;
}

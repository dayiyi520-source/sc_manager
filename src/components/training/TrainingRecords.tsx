import { useEffect, useState } from 'react';
import { App, Button, Input, Popconfirm, Progress, Select, Table, Tag } from 'antd';
import { DownloadOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { resolveTrainingWarning, trainingStages, trainingSummary, updateLearning, type LearningStatus, type TrainingState } from '../../services/trainingRepository';

export const statusColors: Record<LearningStatus, string> = { '未开始': 'default', '学习中': 'processing', '已完成': 'success', '需重学': 'warning' };
export const dateLabel = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
export const pagination = { defaultPageSize: 10, showSizeChanger: true, showTotal: (total: number) => `共 ${total} 条数据` };
type SummaryRow = ReturnType<typeof trainingSummary>['records'][number];
export type TrainingPerson = { id: string; name: string; account?: string; department?: string };
type Props = { state: TrainingState; person: TrainingPerson; commit: (state: TrainingState) => boolean };

// SpreadsheetML is supported by Excel without adding an export dependency.
export function exportTrainingExcel(name: string, headers: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const xmlRows = [headers, ...rows].map(row => `<Row>${row.map(value => `<Cell><Data ss:Type="${typeof value === 'number' ? 'Number' : 'String'}">${escape(value)}</Data></Cell>`).join('')}</Row>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="培训数据"><Table>${xmlRows}</Table></Worksheet></Workbook>`;
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${name}.xml`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const learningColumns = [
  { title: '业务系统', width: 220, ellipsis: true, render: (_: unknown, row: SummaryRow) => row.course.title },
  { title: '阶段', width: 200, ellipsis: true, render: (_: unknown, row: SummaryRow) => row.lesson.stage },
  { title: '课程', width: 180, ellipsis: true, render: (_: unknown, row: SummaryRow) => row.lesson.title },
  { title: '版本', width: 100, render: (_: unknown, row: SummaryRow) => { const video = row.lesson.videos?.find(item => item.active); return video ? `V${video.version}` : '未配置'; } },
  { title: '有效学时', width: 100, render: (_: unknown, row: SummaryRow) => `${Math.floor(row.record?.watchedSeconds || 0)} 秒` },
  { title: '进度', width: 160, render: (_: unknown, row: SummaryRow) => <Progress size="small" percent={row.record?.status === '已完成' ? 100 : row.lesson.videos?.find(video => video.active)?.duration ? Math.min(100, Math.floor((row.record?.watchedSeconds || 0) / row.lesson.videos.find(video => video.active)!.duration * 100)) : 0} /> },
  { title: '状态', width: 100, render: (_: unknown, row: SummaryRow) => <Tag color={statusColors[row.record?.status || '未开始']}>{row.record?.status || '未开始'}</Tag> },
  { title: '更新时间', width: 180, render: (_: unknown, row: SummaryRow) => dateLabel(row.record?.updatedAt) }
];

export function LearningProgress({ state, enterLesson }: { state: TrainingState; enterLesson: (courseId: string, lessonId: string) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const keyword = query.trim().toLowerCase();
  const rows = trainingSummary(state).records.filter(row => `${row.course.title} ${row.lesson.title}`.toLowerCase().includes(keyword) && (status === 'all' || (row.record?.status || '未开始') === status));
  return <section className="training-list-section"><div className="training-toolbar"><Input.Search placeholder="搜索课程或业务系统" allowClear value={query} onChange={event => setQuery(event.target.value)} style={{ width: 280 }} /><Select aria-label="学习状态" value={status} onChange={setStatus} style={{ width: 140 }} options={[{ value: 'all', label: '全部状态' }, ...Object.keys(statusColors).map(value => ({ value, label: value }))]} /></div><Table rowKey={row => `${row.course.id}-${row.lesson.id}`} dataSource={rows} pagination={pagination} scroll={{ x: 1360 }} columns={[...learningColumns, { title: '操作', width: 120, fixed: 'right', render: (_, row) => <Button type="link" onClick={() => enterLesson(row.course.id, row.lesson.id)}>{row.record?.status === '已完成' ? '复习' : '继续学习'}</Button> }]} /></section>;
}

export function TrainingLedger({ state, person, commit, initialStatus = 'all' }: Props & { initialStatus?: string }) {
  const { message } = App.useApp();
  const [query, setQuery] = useState(''); const [system, setSystem] = useState<string>(); const [status, setStatus] = useState(initialStatus);
  const [applied, setApplied] = useState({ query: '', system: undefined as string | undefined, status: initialStatus });
  useEffect(() => { setStatus(initialStatus); setApplied({ query: '', system: undefined, status: initialStatus }); setQuery(''); setSystem(undefined); }, [initialStatus]);
  const rows = trainingSummary(state).records.filter(row => (!applied.system || row.course.id === applied.system) && (applied.status === 'all' || (row.record?.status || '未开始') === applied.status) && `${person.account || person.id}${person.name}${row.course.title}${row.lesson.title}`.includes(applied.query.trim()));
  return <section className="training-list-section"><div className="training-toolbar-row"><div className="training-toolbar"><Input placeholder="搜索账号/姓名/课程/系统" value={query} onChange={event => setQuery(event.target.value)} onPressEnter={() => setApplied({ query, system, status })} allowClear style={{ width: 280 }} /><Select placeholder="业务系统" aria-label="业务系统" allowClear value={system} onChange={setSystem} options={state.courses.filter(course => course.published).map(course => ({ value: course.id, label: course.title }))} style={{ width: 240 }} /><Select aria-label="学习状态" value={status} onChange={setStatus} style={{ width: 140 }} options={[{ value: 'all', label: '全部状态' }, ...Object.keys(statusColors).map(value => ({ value, label: value }))]} /><Button type="primary" icon={<SearchOutlined />} onClick={() => setApplied({ query, system, status })}>查询</Button><Button icon={<ReloadOutlined />} onClick={() => { setQuery(''); setSystem(undefined); setStatus('all'); setApplied({ query: '', system: undefined, status: 'all' }); }}>重置</Button></div><Button type="primary" icon={<DownloadOutlined />} onClick={() => exportTrainingExcel('学习台账', ['账号', '姓名', '部门', '业务系统', '阶段', '课程', '版本', '进度', '有效学时（秒）', '状态', '更新时间'], rows.map(row => [person.account || person.id, person.name, person.department || '未设置', row.course.title, row.lesson.stage, row.lesson.title, row.course.version, row.record?.status === '已完成' ? '100%' : '0%', 0, row.record?.status || '未开始', dateLabel(row.record?.updatedAt)]))}>导出 Excel</Button></div>
    <Table rowKey={row => `${row.course.id}-${row.lesson.id}`} dataSource={rows} pagination={pagination} scroll={{ x: 1730 }} columns={[
      { title: '账号', width: 140, ellipsis: true, render: () => person.account || person.id }, { title: '姓名', width: 100, render: () => person.name }, { title: '部门', width: 100, render: () => person.department || '未设置' }, ...learningColumns,
      { title: '操作', width: 120, fixed: 'right', render: (_, row) => <Popconfirm title="重置该课程为需重学？" description="该课程的演示完成状态将被重置。" onConfirm={() => { if (commit(updateLearning(state, row.course.id, row.lesson.id, '需重学'))) message.success('已重置为需重学'); }}><Button type="link">重置重学</Button></Popconfirm> }
    ]} /></section>;
}

export function TrainingWarnings({ state, person, commit }: Props) {
  const { message } = App.useApp();
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('未处理'); const [applied, setApplied] = useState({ query: '', status: '未处理' });
  const rows = state.warnings.map(warning => ({ ...warning, lesson: state.courses.find(course => course.id === warning.courseId)?.lessons.find(lesson => lesson.id === warning.lessonId)?.title || '课程已移除' })).filter(warning => (applied.status === 'all' || warning.status === applied.status) && `${person.name}${person.account || person.id}${warning.lesson}`.includes(applied.query.trim()));
  const resolve = (id: string, result: '已忽略' | '已确认') => { try { if (commit(resolveTrainingWarning(state, id, result))) message.success(result === '已确认' ? '已确认告警并标记需重学' : '已忽略告警'); } catch (cause) { message.error(cause instanceof Error ? cause.message : '处理失败'); } };
  return <section className="training-list-section"><div className="training-toolbar-row"><div className="training-toolbar"><Input placeholder="搜索员工/课程" value={query} allowClear onChange={event => setQuery(event.target.value)} style={{ width: 280 }} /><Select aria-label="处理状态" value={status} onChange={setStatus} style={{ width: 160 }} options={['all', '未处理', '已忽略', '已确认'].map(value => ({ value, label: value === 'all' ? '全部状态' : value }))} /><Button type="primary" icon={<SearchOutlined />} onClick={() => setApplied({ query, status })}>查询</Button><Button icon={<ReloadOutlined />} onClick={() => { setQuery(''); setStatus('未处理'); setApplied({ query: '', status: '未处理' }); }}>重置</Button></div><div className="training-header-actions"><Button icon={<PlusOutlined />} disabled={!state.courses.some(course => course.published && course.lessons.length)} onClick={() => { const course = state.courses.find(item => item.published && item.lessons.length); if (course) commit({ ...state, warnings: [{ id: crypto.randomUUID(), courseId: course.id, lessonId: course.lessons[0].id, type: '演示异常', detail: '手动生成的演示告警，用于验证处理流程。', time: new Date().toISOString(), status: '未处理' }, ...state.warnings] }); }}>生成演示告警</Button><Button type="primary" icon={<DownloadOutlined />} onClick={() => exportTrainingExcel('异常告警', ['员工', '账号', '课程', '异常类型', '详情', '时间', '状态'], rows.map(row => [person.name, person.account || person.id, row.lesson, row.type, row.detail, dateLabel(row.time), row.status]))}>导出 Excel</Button></div></div>
    <Table rowKey="id" dataSource={rows} pagination={pagination} scroll={{ x: 1250 }} columns={[
      { title: '员工', width: 100, render: () => person.name }, { title: '账号', width: 140, ellipsis: true, render: () => person.account || person.id }, { title: '课程', dataIndex: 'lesson', width: 180, ellipsis: true }, { title: '异常类型', dataIndex: 'type', width: 120 }, { title: '详情', dataIndex: 'detail', width: 260, ellipsis: true }, { title: '时间', width: 180, render: (_, row) => dateLabel(row.time) }, { title: '状态', width: 100, render: (_, row) => <Tag color={row.status === '未处理' ? 'warning' : 'default'}>{row.status}</Tag> },
      { title: '操作', width: 240, fixed: 'right', render: (_, row) => row.status === '未处理' ? <><Button type="link" onClick={() => resolve(row.id, '已忽略')}>误报忽略</Button><Popconfirm title="确认异常并要求重新学习？" onConfirm={() => resolve(row.id, '已确认')}><Button type="link">确认并重学</Button></Popconfirm></> : '—' }
    ]} /></section>;
}

export function TrainingOverview({ state, person, navigate }: Omit<Props, 'commit'> & { navigate: (section: 'ledger' | 'alerts', status?: string) => void }) {
  const summary = trainingSummary(state); const pending = state.warnings.filter(item => item.status === '未处理');
  const stageCount = summary.courses.reduce((total, course) => total + trainingStages(course).filter(stage => stage.enabled).length, 0);
  const videoCount = summary.courses.reduce((total, course) => total + course.lessons.filter(lesson => lesson.videos?.some(video => video.active)).length, 0);
  const stats = [ ['在职学员', 1, '当前演示账号', 'primary'], ['业务系统', summary.courses.length, `启用阶段 ${stageCount} · 应学课程 ${summary.total}`, 'cam-cyan'], ['生效视频', videoCount, '已发布系统中配置生效视频的课程', 'ai-indigo'], ['已完成记录', summary.counts['已完成'], `完成率 ${summary.rate}%`, 'success'], ['学习中', summary.counts['学习中'], '进行中的学习记录', 'primary'], ['需重学', summary.counts['需重学'], '版本更新或告警触发', 'warning'], ['待处理告警', pending.length, '异常刷课待确认', 'danger'], ['整体完成率', `${summary.rate}%`, '完成 / 全部应学课程', 'cam-cyan'] ];
  const activity = summary.records.filter(row => row.record).sort((a, b) => b.record!.updatedAt.localeCompare(a.record!.updatedAt)).slice(0, 6);
  return <><div className="training-stats">{stats.map(([title, value, hint, color]) => <article className="training-stat" key={title} style={{ borderLeftColor: `var(--${color})` }}><span>{title}</span><strong>{value}</strong><p>{hint}</p></article>)}</div>
    <div className="training-dashboard-bottom"><section className="training-distribution"><div className="training-section-heading"><h2>学习状态分布</h2><span>应学合计 {summary.total}</span></div><div className="training-distribution-bar">{(Object.keys(statusColors) as LearningStatus[]).reverse().map(status => <span key={status} style={{ width: `${summary.total ? summary.counts[status] / summary.total * 100 : 0}%`, background: `var(--${status === '已完成' ? 'success' : status === '学习中' ? 'primary' : status === '需重学' ? 'warning' : 'text-muted'})` }} />)}</div><div className="training-distribution-items">{(['已完成', '学习中', '需重学', '未开始'] as LearningStatus[]).map(status => <div key={status}><Tag color={statusColors[status]}>{status}</Tag><strong>{summary.counts[status]}</strong><p>占比 {summary.total ? (summary.counts[status] / summary.total * 100).toFixed(1) : '0.0'}%</p></div>)}</div></section>
    <section className="training-activity"><div className="training-section-heading"><h2>最近学习动态</h2><Button type="link" onClick={() => navigate('ledger')}>学习台账</Button></div><Table size="small" rowKey={row => `${row.course.id}-${row.lesson.id}`} dataSource={activity} pagination={false} scroll={{ x: 540 }} columns={[{ title: '学员', width: 100, render: () => person.name }, learningColumns[2], learningColumns[6], learningColumns[7]]} /></section></div>
    <div className="training-dashboard-bottom training-dashboard-followup"><section className="training-activity"><div className="training-section-heading"><h2>待处理告警</h2><Button type="link" onClick={() => navigate('alerts')}>查看全部</Button></div><Table size="small" rowKey="id" dataSource={pending.slice(0, 6)} pagination={false} scroll={{ x: 600 }} columns={[{ title: '学员', width: 100, render: () => person.name }, { title: '课程', width: 150, ellipsis: true, render: (_, row) => state.courses.find(course => course.id === row.courseId)?.lessons.find(lesson => lesson.id === row.lessonId)?.title || '课程已移除' }, { title: '类型', dataIndex: 'type', width: 120 }, { title: '状态', width: 100, render: () => <Tag color="warning">未处理</Tag> }, { title: '时间', width: 180, render: (_, row) => dateLabel(row.time) }]} /></section>
    <section className="training-activity"><div className="training-section-heading"><h2>需重学名单</h2><Button type="link" onClick={() => navigate('ledger', '需重学')}>查看台账</Button></div><Table size="small" rowKey={row => `${row.course.id}-${row.lesson.id}`} dataSource={summary.records.filter(row => row.record?.status === '需重学').slice(0, 6)} pagination={false} scroll={{ x: 640 }} columns={[{ title: '学员', width: 100, render: () => person.name }, learningColumns[0], learningColumns[2], learningColumns[7]]} /></section></div></>;
}

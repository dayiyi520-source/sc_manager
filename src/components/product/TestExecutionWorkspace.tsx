import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Radio, Select, Tag, Upload } from 'antd';
import { LinkOutlined, UploadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import type { TestEvidence, TestExecutionCase, TestResultStatus } from '../../types/testManagement';

export const TestExecutionWorkspace: React.FC<{ executionId: string; productLineId: string; onChanged?: () => void }> = ({ executionId, productLineId, onChanged }) => {
  const execution = useQuery({ queryKey: ['test-execution', executionId], queryFn: () => productRepository.testExecutionDetail(executionId), retry: false });
  const defects = useQuery({ queryKey: ['test-defect-options', productLineId], queryFn: () => productRepository.workItems(productLineId, 'bug', ''), retry: false });
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState<Exclude<TestResultStatus, 'NOT_EXECUTED'> | undefined>();
  const [actualResult, setActualResult] = useState('');
  const [evidence, setEvidence] = useState<TestEvidence[]>([]);
  const [defectId, setDefectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = useMemo(() => execution.data?.cases.find((item) => item.id === selectedId) || execution.data?.cases[0], [execution.data, selectedId]);
  useEffect(() => { if (!selected) return; setSelectedId(selected.id); setResult(selected.result === 'NOT_EXECUTED' ? undefined : selected.result); setActualResult(selected.actualResult || ''); setEvidence(selected.evidence || []); }, [selected?.id, selected?.revision]);
  const readOnly = execution.data?.status !== 'IN_PROGRESS';

  const save = async (moveNext = false) => {
    if (!selected || !result) { setError('请选择通过或失败'); return; }
    if (result === 'FAILED' && !actualResult.trim()) { setError('失败时必须填写实际结果'); return; }
    setSaving(true); setError('');
    try {
      const updated = await productRepository.saveTestResult(selected.id, { result, actualResult: actualResult.trim(), evidence, revision: selected.revision });
      await execution.refetch(); onChanged?.();
      if (moveNext) { const index = updated.cases.findIndex((item) => item.id === selected.id); const next = updated.cases[index + 1]; if (next) setSelectedId(next.id); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存执行结果失败'); }
    finally { setSaving(false); }
  };
  const addEvidence = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setError('单个证据文件不能超过 10 MB'); return false; }
    const reader = new FileReader(); reader.onload = () => setEvidence((items) => [...items, { name: file.name, contentType: file.type || 'text/plain', size: file.size, dataUrl: String(reader.result) }]); reader.readAsDataURL(file); return false;
  };
  const linkDefect = async () => {
    if (!selected || !defectId) return;
    setSaving(true); setError('');
    try { await productRepository.linkTestResultDefect(selected.id, defectId, selected.revision); setDefectId(''); await execution.refetch(); onChanged?.(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '关联缺陷失败'); }
    finally { setSaving(false); }
  };
  const endRound = async () => {
    if (!execution.data) return;
    setSaving(true); setError('');
    try { await productRepository.endTestExecution(executionId, execution.data.revision); await execution.refetch(); onChanged?.(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '结束执行轮次失败'); }
    finally { setSaving(false); }
  };

  if (execution.isLoading) return <div className="test-task-loading">正在加载执行轮次...</div>;
  if (execution.isError || !execution.data) return <Alert type="error" showIcon title="执行轮次加载失败" action={<Button onClick={() => execution.refetch()}>重试</Button>} />;

  return <div className="test-execution-workspace">
    {error && <Alert className="test-execution-error" closable onClose={() => setError('')} type="error" showIcon title="操作失败" description={error} />}
    <header className="test-execution-header"><div><h3>{execution.data.name}</h3><span>第 {execution.data.roundNo} 轮 · {execution.data.environment || '未填写环境'} · {execution.data.buildVersion || '未填写构建版本'}</span></div><div><Tag color={readOnly ? 'default' : 'processing'}>{readOnly ? '已结束' : '执行中'}</Tag><Button disabled={readOnly || execution.data.notExecuted > 0} loading={saving} onClick={() => void endRound()}>结束本轮</Button></div></header>
    <div className="test-execution-grid">
      <nav className="test-execution-case-list" aria-label="执行用例"><div className="test-execution-counts"><b>{execution.data.passed}</b><span>通过</span><b>{execution.data.failed}</b><span>失败</span><b>{execution.data.notExecuted}</b><span>未执行</span></div>{execution.data.cases.map((item) => <button type="button" key={item.id} className={selected?.id === item.id ? 'active' : ''} onClick={() => setSelectedId(item.id)}><span className="test-case-code">{item.code}</span><strong title={item.title}>{item.title}</strong><Tag color={item.result === 'PASSED' ? 'success' : item.result === 'FAILED' ? 'error' : 'default'}>{item.result === 'PASSED' ? '通过' : item.result === 'FAILED' ? '失败' : '未执行'}</Tag></button>)}</nav>
      <main className="test-execution-form">
        {selected && <><div className="test-execution-title"><span className="test-case-code">{selected.code}</span><h4>{selected.title}</h4><Tag>{selected.priority}</Tag></div>{selected.precondition && <div className="test-execution-precondition"><span>前置条件</span><p>{selected.precondition}</p></div>}<ol className="test-execution-steps">{selected.steps.map((step) => <li key={`${step.sort}-${step.action}`}><b>{String(step.sort).padStart(2, '0')}</b><div><span>{step.action}</span><small>{step.expectedResult}</small></div></li>)}</ol><div className="test-execution-result-form"><Radio.Group disabled={readOnly} value={result} onChange={(event) => setResult(event.target.value)} optionType="button" buttonStyle="solid" options={[{ label: '通过', value: 'PASSED' }, { label: '失败', value: 'FAILED' }]} /><Input.TextArea disabled={readOnly} rows={4} value={actualResult} onChange={(event) => setActualResult(event.target.value)} status={result === 'FAILED' && !actualResult.trim() ? 'error' : undefined} placeholder={result === 'FAILED' ? '填写实际结果和失败现象（必填）' : '补充实际结果（选填）'} /><div className="test-execution-form-actions"><Upload disabled={readOnly} showUploadList={false} beforeUpload={addEvidence}><Button icon={<UploadOutlined />} disabled={readOnly}>添加证据</Button></Upload><span /><Button disabled={readOnly || !result} loading={saving} onClick={() => void save(false)}>保存</Button><Button type="primary" disabled={readOnly || !result} loading={saving} onClick={() => void save(true)}>保存并下一条</Button></div></div></>}
      </main>
      <aside className="test-execution-context"><div className="test-case-panel-heading"><span>证据与缺陷</span></div><section><h4>证据</h4>{evidence.length ? evidence.map((item, index) => <div className="test-evidence-row" key={`${item.name}-${index}`}><span title={item.name}>{item.name}</span><small>{Math.ceil(item.size / 1024)} KB</small></div>) : <p>暂无证据</p>}</section><section><h4>关联缺陷</h4>{selected?.defects.length ? selected.defects.map((defect) => <div className="test-defect-row" key={defect.id}><span>{defect.code}</span><strong title={defect.title}>{defect.title}</strong><Tag>{defect.priority}</Tag></div>) : <p>暂无关联缺陷</p>}{selected?.result === 'FAILED' && !readOnly && <div className="test-defect-link"><Select showSearch optionFilterProp="label" value={defectId || undefined} onChange={setDefectId} placeholder="选择同需求缺陷" options={(defects.data?.page.items || []).map((item) => ({ label: `${item.code} · ${item.title}`, value: item.id }))} /><Button aria-label="关联缺陷" icon={<LinkOutlined />} disabled={!defectId} loading={saving} onClick={() => void linkDefect()} /></div>}</section></aside>
    </div>
  </div>;
};

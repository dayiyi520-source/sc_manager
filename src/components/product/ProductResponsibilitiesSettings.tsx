import React, { useState } from 'react';
import { Alert, Button, Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { teamRepository } from '../../services/teamRepository';
import { employeeSelectOptions } from '../common/PersonIdentity';
import type { ProductLine } from '../../types';

const roles = [
  ['产品责任人', 'requirementOwnerUserId', 'requirementOwnerSecondaryUserId', '负责产品定位、需求规划与需求生命周期管理。'],
  ['研发责任人', 'techOwnerUserId', 'techOwnerSecondaryUserId', '负责技术架构、研发实施与交付。'],
  ['测试责任人', 'testOwnerUserId', 'testOwnerSecondaryUserId', '负责版本验收、自动化测试回归与缺陷管理。']
] as const;

export const validateResponsibilities = (values: Partial<ProductLine>) => {
  for (const [label, primary, secondary] of roles) {
    if (!values[primary]) return `请选择${label}的主责任人`;
    if (values[primary] === values[secondary]) return `${label}的主责任人与次责任人不能相同`;
  }
  return '';
};

export const ProductResponsibilitiesSettings: React.FC<{ productLine: ProductLine }> = ({ productLine }) => {
  const { updateProductLine } = useApp();
  const query = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, retry: false });
  const initial = () => Object.fromEntries(roles.flatMap(([, primary, secondary]) => [[primary, productLine[primary] || ''], [secondary, productLine[secondary] || '']])) as Partial<ProductLine>;
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const invalid = validateResponsibilities(values);
    if (invalid) { setError(invalid); return; }
    setSaving(true); setError('');
    try { await updateProductLine(productLine.id, values); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，请重试'); }
    finally { setSaving(false); }
  };
  return <div className="mx-auto max-w-2xl space-y-4">
    <h3 className="text-sm font-bold">责任人配置</h3>
    <p className="text-xs text-[var(--text-muted)]">为当前产品配置产品、研发和测试职责的主责任人与次责任人。</p>
    {query.isError && <Alert type="error" message="成员加载失败" action={<Button onClick={() => void query.refetch()}>重试</Button>} />}
    {error && <Alert type="error" message={error} showIcon />}
    {roles.map(([label, primary, secondary, description]) => <section key={primary} className="space-y-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4">
      <h4 className="text-xs font-bold">{label}</h4>
      <div className="grid gap-4 sm:grid-cols-2">{([primary, secondary] as const).map((key, index) => <label key={key} className="space-y-2 text-xs"><span>{index === 0 ? '主责任人 *' : '次责任人'}</span><Select aria-label={`${label}${index === 0 ? '主责任人' : '次责任人'}`} className="w-full" showSearch allowClear loading={query.isPending} disabled={saving || query.isError} options={employeeSelectOptions(query.data || [])} optionFilterProp="label" placeholder={index === 0 ? '请选择主责任人' : '请选择次责任人（选填）'} value={values[key] || undefined} onChange={(value) => setValues((current) => ({ ...current, [key]: value || '' }))} /></label>)}</div>
      <p className="text-xs text-[var(--text-muted)]">{description}</p>
    </section>)}
    <div className="flex justify-end gap-2"><Button disabled={saving} onClick={() => { setValues(initial()); setError(''); }}>取消</Button><Button type="primary" loading={saving} disabled={query.isPending || query.isError} onClick={() => void save()}>保存</Button></div>
  </div>;
};

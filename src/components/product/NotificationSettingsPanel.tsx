import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Spin } from 'antd';
import { productRepository, type NotificationEvent, type NotificationSettings } from '../../services/productRepository';
import { useApp } from '../../context/AppContext';

const EVENTS: Array<{ key: NotificationEvent; label: string; recipients: Array<{ key: string; label: string }> }> = [
  { key: 'ASSIGNED', label: '需求被指派', recipients: [['CREATOR', '创建人'], ['OWNER', '负责人'], ['PARTICIPANT', '参与人'], ['CC', '抄送人']].map(([key, label]) => ({ key, label })) },
  { key: 'STATUS_CHANGED', label: '状态更新', recipients: [['CREATOR', '创建人'], ['OWNER', '负责人'], ['PARTICIPANT', '参与人'], ['CC', '抄送人']].map(([key, label]) => ({ key, label })) },
  { key: 'COMMENTED', label: '提交评论', recipients: [['CREATOR', '创建人'], ['OWNER', '负责人'], ['PARTICIPANT', '参与人'], ['CC', '抄送人']].map(([key, label]) => ({ key, label })) },
  { key: 'DELETED', label: '删除', recipients: [['CREATOR', '创建人'], ['OWNER', '负责人'], ['PARTICIPANT', '参与人'], ['CC', '抄送人']].map(([key, label]) => ({ key, label })) },
  { key: 'REPLIED', label: '评论回复', recipients: [{ key: 'REPLIED_USER', label: '被回复人' }] },
  { key: 'MENTIONED', label: '评论@某人', recipients: [{ key: 'MENTIONED_USER', label: '被@人' }] },
  { key: 'CC_ADDED', label: '添加抄送', recipients: [['CREATOR', '创建人'], ['OWNER', '负责人'], ['ADDED_USER', '被添加成员']].map(([key, label]) => ({ key, label })) },
  { key: 'PARTICIPANT_ADDED', label: '添加参与人', recipients: [['CREATOR', '创建人'], ['OWNER', '负责人'], ['ADDED_USER', '被添加成员']].map(([key, label]) => ({ key, label })) }
];

export const NotificationSettingsPanel: React.FC<{ scope: 'template' | 'product'; productLineId?: string }> = ({ scope, productLineId }) => {
  const { addToast } = useApp();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setSettings(null); setDirty(false);
    const request = scope === 'template' ? productRepository.notificationTemplate() : productRepository.productNotificationSettings(productLineId!);
    request.then((result) => { if (active) setSettings(result); }).catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : '通知配置读取失败'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scope, productLineId, retry]);
  const change = (event: NotificationEvent, field: 'recipients' | 'channels', value: string, checked: boolean) => {
    setSettings((current) => current && ({ rules: current.rules.map((rule) => rule.event === event ? { ...rule, [field]: checked ? [...rule[field], value] : rule[field].filter((item) => item !== value) } : rule) } as NotificationSettings));
    setDirty(true);
  };
  const save = async () => {
    if (!settings || saving) return;
    setSaving(true);
    try {
      const saved = scope === 'template' ? await productRepository.saveNotificationTemplate(settings) : await productRepository.saveProductNotificationSettings(productLineId!, settings);
      setSettings(saved); setDirty(false); addToast('success', '通知配置已保存');
    } catch (failure) { addToast('error', '通知配置保存失败', failure instanceof Error ? failure.message : '请稍后重试'); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="flex min-h-40 items-center justify-center"><Spin tip="正在读取通知配置" /></div>;
  if (error) return <div role="alert" className="text-[var(--danger)]">{error}<Button type="link" onClick={() => setRetry((value) => value + 1)}>重试</Button></div>;
  if (!settings) return <div className="text-[var(--text-muted)]">暂无通知配置</div>;
  return <div className="space-y-4 text-xs">
    <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">通知与提醒</h3><p className="mt-1 text-[var(--text-muted)]">保存通知偏好；消息发送功能暂未接入。</p></div><Button type="primary" loading={saving} disabled={!dirty} onClick={() => void save()}>保存配置</Button></div>
    <div className="overflow-x-auto rounded-md border border-[var(--border-main)]"><div className="min-w-[760px]">
      <div className="grid grid-cols-[180px_minmax(420px,1fr)_210px] border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-muted)]"><div className="border-r border-[var(--border-main)] px-4 py-4">事件</div><div className="border-r border-[var(--border-main)] px-4 py-4">通知对象</div><div className="px-4 py-4">站内信&amp;钉钉通知</div></div>
      {EVENTS.map((event) => { const rule = settings.rules.find((item) => item.event === event.key); return <div key={event.key} className="grid min-h-20 grid-cols-[180px_minmax(420px,1fr)_210px] border-b border-[var(--border-main)] last:border-b-0"><div className="flex items-center border-r border-[var(--border-main)] px-4 py-4 text-sm text-[var(--text-body)]">{event.label}</div><div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-r border-[var(--border-main)] px-4 py-4">{event.recipients.map((recipient) => <Checkbox key={recipient.key} checked={rule?.recipients.includes(recipient.key)} onChange={(e) => change(event.key, 'recipients', recipient.key, e.target.checked)}>{recipient.label}</Checkbox>)}</div><div className="flex items-center px-4 py-4"><Checkbox aria-label={`${event.label}站内信与钉钉通知`} checked={rule?.channels.includes('IN_APP') && rule.channels.includes('DINGTALK')} onChange={(e) => { setSettings((current) => current && ({ rules: current.rules.map((item) => item.event === event.key ? { ...item, channels: e.target.checked ? ['IN_APP', 'DINGTALK'] : [] } : item) } as NotificationSettings)); setDirty(true); }} /></div></div>; })}
    </div></div>
  </div>;
};

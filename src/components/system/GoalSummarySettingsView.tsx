import { isOkrAdmin } from '../../services/okrSettingsPolicy';
import { teamRepository } from '../../services/teamRepository';
import { useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { okrRepository, type OkrSettings } from '../../services/okrRepository';
import { OkrProvider } from '../workbench/okr/OkrProvider';
import { OkrSettingsView } from '../workbench/okr/OkrSettingsView';
import '../workbench/okr/originalOkr.css';

function SettingsContent() {
  const client = useQueryClient();
  const { addToast, currentUser } = useApp();
  const [busy, setBusy] = useState(false);
  const query = useQuery({ queryKey: ['okr', 'settings'], queryFn: okrRepository.settings, retry: false });
  const people = useQuery({queryKey:['okr','people'],queryFn:okrRepository.people,retry:false});
  const members = useQuery({queryKey:['team-member-options'],queryFn:teamRepository.options,retry:false});
  const directoryPeople = (people.data || []).map(person => { const member = members.data?.find(item => item.id === person.id); return { ...person, name: member?.name || person.name, department: member?.department ?? person.department, jobTitle: member?.jobTitle || member?.roleTitle || person.jobTitle }; });
  const departments = useQuery({ queryKey: ['team-member-departments'], queryFn: teamRepository.departments, retry: false });
  const save = async (settings: OkrSettings) => {
    if (busy) return false;
    if (!isOkrAdmin(currentUser.id,query.data,people.data || [])) { addToast('error','仅 OKR 管理员可保存设置'); return false; }
    setBusy(true);
    try {
      const saved = await okrRepository.saveSettings(settings,currentUser.id);
      client.setQueryData(['okr', 'settings'], saved);
      await client.invalidateQueries({ queryKey: ['okr'], predicate: query => query.queryKey.includes('people') });
      addToast('success', '目标总结配置已保存');
      return true;
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : '配置保存失败，请重试');
      return false;
    } finally { setBusy(false); }
  };
  return <div className="original-okr">{query.data && people.data && !isOkrAdmin(currentUser.id,query.data,people.data) && <Alert type="info" title="仅 OKR 管理员可保存配置"/>}{departments.isError && <Alert type="error" showIcon title="部门列表加载失败" action={<Button onClick={() => void departments.refetch()}>重试</Button>}/>} {(query.isPending || people.isPending || members.isPending || departments.isPending) ? <div role="status"><Spin size="small"/> 正在加载目标总结设置…</div> : members.isError ? <Alert type="error" showIcon title="团队成员加载失败" action={<Button onClick={() => void members.refetch()}>重试</Button>}/> : people.isError ? <Alert type="error" showIcon title="人员列表加载失败" action={<Button onClick={() => void people.refetch()}>重试</Button>}/> : query.isError ? <Alert type="error" showIcon title="目标总结设置加载失败" action={<Button onClick={() => void query.refetch()}>重试</Button>}/> : query.data ? <OkrSettingsView key={currentUser.id} settings={query.data} readOnly={!isOkrAdmin(currentUser.id,query.data,people.data || [])} people={directoryPeople} departments={departments.data || []} busy={busy} onSave={save}/> : <Alert type="warning" title="暂无目标总结配置"/>}</div>;
}

export function GoalSummarySettingsView() {
  return <OkrProvider><SettingsContent/></OkrProvider>;
}

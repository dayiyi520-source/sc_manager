import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  Lock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  Server,
  Database,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';

export const SystemSettingsView: React.FC = () => {
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'basic' | 'rbac' | 'audit'>('basic');

  const [platformName, setPlatformName] = useState('师创全流程数字化中枢管理平台');
  const [cryptoMode, setCryptoMode] = useState('国密 SM2/SM3/SM4 混合加密');
  const [sessionTimeout, setSessionTimeout] = useState('30 分钟无操作自动锁定');
  const [dbDialect, setDbDialect] = useState('达梦数据库 DM8 高可用集群 (主备)');
  const [isEquipAuditEnabled, setIsEquipAuditEnabled] = useState(true);

  const [roles, setRoles] = useState([
    { id: 'role-1', name: '系统超级管理员 (Super Admin)', usersCount: 2, permissions: ['全模块读写', '系统级运维配置', '财务审批终审', '安全审计溯源'] },
    { id: 'role-2', name: '商务销售与大区总监', usersCount: 8, permissions: ['客户与商机全流程', '招投标立项与评审', '合同签署与应收查看'] },
    { id: 'role-3', name: '产品与研发技术主管', usersCount: 14, permissions: ['产品路线与版本规划', '敏捷需求拆解与排期', '缺陷Bug流转与关闭', '产研复盘报告'] },
    { id: 'role-4', name: '工程交付项目经理 (PM)', usersCount: 6, permissions: ['交付项目全周期', '里程碑推进与确认', '交付物签章与归档', '变更单与风险台账'] },
    { id: 'role-5', name: '财务经理与会计', usersCount: 3, permissions: ['应收/应付账款台账', '进销项全电发票开具', '项目成本损益核算'] }
  ]);

  const [auditLogs, setAuditLogs] = useState([
    { id: 'log-1', time: '2026-08-31 16:45:12', user: '陈志远 (商务总监)', ip: '192.168.10.45', action: '更新商机阶段', detail: '将【国家电网华东分部智能调度中枢】推进至【合同签约】', status: '成功' },
    { id: 'log-2', time: '2026-08-31 15:20:08', user: '王雪琴 (交付副总监)', ip: '192.168.10.88', action: '签署交付物', detail: '完成【国家电网UAT系统初验确认单】电子公章签署', status: '成功' },
    { id: 'log-3', time: '2026-08-31 14:10:33', user: '李天成 (首席架构师)', ip: '192.168.10.12', action: '封版提测', detail: '发布版本【V4.2.0-RC3】至信创达梦适配测试集群', status: '成功' },
    { id: 'log-4', time: '2026-08-31 11:05:41', user: '系统安全审计守护进程', ip: '127.0.0.1', action: '夜间等保三级基线巡检', detail: '自动核验 48 项信创网络与数据库安全规则，无异常', status: '成功' }
  ]);

  const handleSaveBasicSettings = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('success', '系统基础配置已生效', '所有信创国密安全与等保参数已持久化');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="系统安全基线评级" value="三级等保" subText="公安部国家信息安全等级" icon={<Shield className="w-5 h-5" />} />
        <StatCard title="RBAC 角色权限体系" value={roles.length} unit="个角色" change="权限细粒度隔离" isPositive={true} subText="覆盖 33 项核心操作" icon={<UserCheck className="w-5 h-5" />} iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50" />
        <StatCard title="信创数据底座" value="达梦 DM8" subText="双机热备高可用读写分离" icon={<Database className="w-5 h-5" />} iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50" />
        <StatCard title="今日操作审计日志" value="1,248" unit="条" change="100% 审计合规" isPositive={true} subText="日志保留 180 天" icon={<Clock className="w-5 h-5" />} iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50" />
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        <button onClick={() => setActiveTab('basic')} className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'basic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><Settings className="w-4 h-4" /><span>系统基础与信创安全设置</span></button>
        <button onClick={() => setActiveTab('rbac')} className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'rbac' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><UserCheck className="w-4 h-4" /><span>RBAC 角色权限矩阵</span></button>
        <button onClick={() => setActiveTab('audit')} className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'audit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}><Lock className="w-4 h-4" /><span>操作安全审计日志</span></button>
      </div>

      {activeTab === 'basic' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6 text-xs">
          <form onSubmit={handleSaveBasicSettings} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">平台系统名称 *</label><input type="text" value={platformName} onChange={(e) => setPlatformName(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold" /></div>
              <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">底层信创数据库方言 *</label><select value={dbDialect} onChange={(e) => setDbDialect(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"><option value="达梦数据库 DM8 高可用集群 (主备)">达梦数据库 DM8 高可用集群 (主备)</option><option value="人大金仓 KingbaseES V8">人大金仓 KingbaseES V8</option><option value="南大通用 GBase 8s">南大通用 GBase 8s</option><option value="华为 openGauss 分布式">华为 openGauss 分布式</option></select></div>
              <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">传输与落盘加密算法 *</label><select value={cryptoMode} onChange={(e) => setCryptoMode(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"><option value="国密 SM2/SM3/SM4 混合加密">国密 SM2/SM3/SM4 混合加密 (等保三级推荐)</option><option value="AES-256 + RSA-4096 国际标准">AES-256 + RSA-4096 国际标准</option></select></div>
              <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">会话超时自动注销策略</label><select value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"><option value="30 分钟无操作自动锁定">30 分钟无操作自动锁定</option><option value="15 分钟无操作自动锁定 (高安全级别)">15 分钟无操作自动锁定 (高安全级别)</option><option value="60 分钟无操作自动锁定">60 分钟无操作自动锁定</option></select></div>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div><span className="font-bold text-slate-900 dark:text-white block">启用等保三级全量操作行为不可篡改审计追踪</span><span className="text-slate-400 block text-[11px] mt-0.5">所有涉及商机金额变更、交付物签章、合同审核以及敏感数据下载的操作，自动生成数字指纹留痕</span></div>
              <input type="checkbox" checked={isEquipAuditEnabled} onChange={(e) => setIsEquipAuditEnabled(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
            </div>
            <div className="flex justify-end"><button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"><Save className="w-3.5 h-3.5" />保存系统配置</button></div>
          </form>
        </div>
      )}

      {activeTab === 'rbac' && (
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5"><UserCheck className="w-4 h-4 text-blue-600 shrink-0" /><span className="font-bold text-sm text-slate-900 dark:text-white">{role.name}</span></div>
                <span className="text-slate-400">当前归属人员：{role.usersCount} 人</span>
              </div>
              <div><span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">已授予业务权限：</span><div className="flex flex-wrap gap-2">{role.permissions.map((p) => (<span key={p} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded font-medium text-[11px] border border-blue-200/60 dark:border-blue-800/40">✓ {p}</span>))}</div></div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead><tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold"><th className="py-3 px-4">操作时间</th><th className="py-3 px-4">操作人</th><th className="py-3 px-4">终端 IP</th><th className="py-3 px-4">事件类型</th><th className="py-3 px-4">行为详情</th><th className="py-3 px-4">结果</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500">{log.time}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">{log.user}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{log.ip}</td>
                  <td className="py-3.5 px-4 font-semibold text-blue-600">{log.action}</td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{log.detail}</td>
                  <td className="py-3.5 px-4"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 font-medium text-[11px]">{log.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

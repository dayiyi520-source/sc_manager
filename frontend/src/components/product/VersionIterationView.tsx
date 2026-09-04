import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Rocket,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode2,
  GitBranch,
  Calendar,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { VersionIteration } from '../../types';

export const VersionIterationView: React.FC = () => {
  const { versions, addVersion, updateVersion, openPageTab, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formReleaseDate, setFormReleaseDate] = useState('2026-09-08');
  const [formChangelog, setFormChangelog] = useState('');

  const filteredVersions = versions.filter((v) => {
    const matchQ =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchQ && matchStatus;
  });

  const handleSaveVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      addToast('warning', '请填写版本名称与版本号');
      return;
    }

    addVersion({
      name: formName,
      code: formCode,
      status: '规划中',
      releaseDate: formReleaseDate,
      reqCount: 0,
      bugCount: 0,
      changelog: formChangelog || '1. 新增业务功能；2. 修复已知安全漏洞。'
    });
    setIsModalOpen(false);
  };

  const handlePublishVersion = (version: VersionIteration) => {
    updateVersion(version.id, { status: '已发布' });
    addToast('success', `版本 ${version.code} 发布成功`, '全量镜像与升级包已推送到客户生产环境分发节点');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="版本迭代总数"
          value={versions.length}
          unit="个"
          subText="标准化SemVer发版"
          icon={<Layers className="w-5 h-5" />}
        />
        <StatCard
          title="进行中主干版本"
          value="V4.2.0"
          change="测试验收中"
          isPositive={true}
          subText="预计 9月8日 封版发版"
          icon={<Rocket className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
        <StatCard
          title="已上线生产版本"
          value={versions.filter((v) => v.status === '已发布').length}
          unit="个"
          change="稳定运行"
          isPositive={true}
          subText="服务超50+大中型企业"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="规划中下代架构"
          value="V5.0.0"
          subText="微服务云原生重构"
          icon={<GitBranch className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索版本名称 / 语义化版本号..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有版本状态</option>
            <option value="研发中">研发中</option>
            <option value="测试中">测试中</option>
            <option value="已发布">已发布</option>
            <option value="规划中">规划中</option>
          </select>
        </div>

        <button
          id="btn-add-version"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          创建新迭代版本
        </button>
      </div>

      {/* Version Iteration Cards */}
      <div className="space-y-4">
        {filteredVersions.map((ver) => (
          <div
            key={ver.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {ver.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                      {ver.code}
                    </span>
                    <StatusTag status={ver.status} />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    预计发版日期：<strong>{ver.releaseDate}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">交付需求数</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {ver.reqCount} 项
                  </span>
                </div>
                <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-4">
                  <span className="text-slate-400 block text-[11px]">修复缺陷 Bug</span>
                  <span className="font-bold text-emerald-600 text-sm">{ver.bugCount} 个</span>
                </div>
                {ver.status !== '已发布' ? (
                  <button
                    onClick={() => handlePublishVersion(ver)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition-colors ml-2"
                  >
                    🚀 审核并发布上线
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg font-semibold ml-2">
                    已全量推送到生产
                  </span>
                )}
              </div>
            </div>

            {/* Changelog */}
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">版本变更日志 (Changelog)：</span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                {ver.changelog}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Version Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新建版本迭代计划"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveVersion}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存版本规划
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveVersion} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              版本名称 *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：信创全栈优化与智能检索专版"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                语义化版本号 (SemVer) *
              </label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="如：V4.3.0"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                计划发版日期
              </label>
              <input
                type="date"
                value={formReleaseDate}
                onChange={(e) => setFormReleaseDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              版本发版日志与核心特性 (Changelog)
            </label>
            <textarea
              rows={4}
              value={formChangelog}
              onChange={(e) => setFormChangelog(e.target.value)}
              placeholder="1. 核心特性：支持达梦数据库读写分离与高可用集群；2. 优化：全局秒级搜索与快捷指令；3. 安全：通过公安部三级等保测试。"
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

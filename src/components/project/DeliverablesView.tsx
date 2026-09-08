import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Plus,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  FileText,
  Stamp,
  ShieldCheck
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { Deliverable } from '../../types';

export const DeliverablesView: React.FC = () => {
  const { deliverables, addDeliverable, updateDeliverable, projects, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formProjectName, setFormProjectName] = useState(projects[0]?.name || '');
  const [formSubmitter, setFormSubmitter] = useState('李工 (技术总监)');
  const [formFileSize, setFormFileSize] = useState('14.2 MB');

  const filteredDeliverables = deliverables.filter((d) => {
    const matchQ =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.submitter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchQ && matchStatus;
  });

  const handleSaveDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('warning', '请填写交付物名称');
      return;
    }

    addDeliverable({
      projectId: `prj-${Date.now()}`,
      projectName: formProjectName,
      name: formName,
      version: 'V1.0',
      status: '审核中',
      fileSize: formFileSize,
      submitter: formSubmitter,
      uploadDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(false);
  };

  const handleSignDeliverable = (d: Deliverable) => {
    updateDeliverable(d.id, { status: '已签章' });
    addToast('success', `交付物【${d.name}】已完成双方法律签章`, '已生成带防伪水印的合规归档电子存证');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="交付物文档总数"
          value={deliverables.length}
          unit="份"
          subText="电子印章与存证"
          icon={<FileCheck className="w-5 h-5" />}
        />
        <StatCard
          title="已双方正式盖章"
          value={deliverables.filter((d) => d.status === '已签章').length}
          unit="份"
          change="法律合规生效"
          isPositive={true}
          subText="达梦认证 & UAT签字"
          icon={<Stamp className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="客户审核中文件"
          value={deliverables.filter((d) => d.status === '审核中').length}
          unit="份"
          change="等待专家审批"
          isPositive={false}
          subText="架构方案 & 割接预案"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
        <StatCard
          title="信创适配专项报告"
          value="4"
          unit="份"
          subText="达梦/麒麟/统信认证"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索交付物名称 / 项目全称..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有状态</option>
            <option value="已签章">已签章归档</option>
            <option value="审核中">审核中</option>
            <option value="待提交">待提交</option>
          </select>
        </div>

        <button
          id="btn-upload-deliverable"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          归档交付物文档
        </button>
      </div>

      {/* Deliverables Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <th className="py-3 px-4">交付物文档名称</th>
              <th className="py-3 px-4">关联项目</th>
              <th className="py-3 px-4">版本号</th>
              <th className="py-3 px-4">文件大小</th>
              <th className="py-3 px-4">提交人</th>
              <th className="py-3 px-4">归档日期</th>
              <th className="py-3 px-4">签章状态</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredDeliverables.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{d.name}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{d.projectName}</td>
                <td className="py-3.5 px-4 font-mono text-blue-600">{d.version}</td>
                <td className="py-3.5 px-4 text-slate-500">{d.fileSize}</td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{d.submitter}</td>
                <td className="py-3.5 px-4 text-slate-500 font-mono">{d.uploadDate}</td>
                <td className="py-3.5 px-4">
                  <StatusTag status={d.status} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {d.status !== '已签章' && (
                      <button
                        onClick={() => handleSignDeliverable(d)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded font-medium text-xs flex items-center gap-1"
                      >
                        <Stamp className="w-3 h-3" />
                        双方法人签章
                      </button>
                    )}
                    <button
                      onClick={() => addToast('info', '文档下载中', `已下载 ${d.name}`)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-xs flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      下载
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="上传归档项目交付物"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveDeliverable}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              确认上传归档
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveDeliverable} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              交付物文档名称 *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：国家电网UAT系统初验确认单 (加盖公章扫描件)"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                所属交付项目 *
              </label>
              <select
                value={formProjectName}
                onChange={(e) => setFormProjectName(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                提交人 *
              </label>
              <input
                type="text"
                value={formSubmitter}
                onChange={(e) => setFormSubmitter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

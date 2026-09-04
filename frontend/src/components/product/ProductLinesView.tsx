import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Layers,
  User,
  CheckCircle2,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Building,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ProductLine } from '../../types';

export const ProductLinesView: React.FC = () => {
  const { productLines, addProductLine, openPageTab, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formOwner, setFormOwner] = useState('李工');
  const [formDescription, setFormDescription] = useState('');

  const filteredLines = productLines.filter(
    (pl) =>
      pl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pl.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pl.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      addToast('warning', '请填写产品线名称与编码');
      return;
    }

    addProductLine({
      name: formName,
      code: formCode,
      owner: formOwner,
      description: formDescription || '企业级关键业务支撑产品线',
      versionCount: 1,
      customerCount: 12,
      health: '健康'
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="核心产品矩阵"
          value={productLines.length}
          unit="条"
          subText="全栈国产化与协同"
          icon={<Boxes className="w-5 h-5" />}
        />
        <StatCard
          title="服务企业客户"
          value="58"
          unit="家"
          change="+12家今年"
          isPositive={true}
          subText="涵盖央国企与500强"
          icon={<Building className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="累计发布版本"
          value="18"
          unit="个"
          subText="标准化CI/CD交付"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
        <StatCard
          title="架构健康度"
          value="98.6"
          unit="%"
          change="稳定可信"
          isPositive={true}
          subText="SLA 99.99% 承诺"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索产品线名称 / 编码 / 负责人..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-72"
          />
        </div>

        <button
          id="btn-add-product-line"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          规划新产品线
        </button>
      </div>

      {/* Product Lines Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLines.map((pl) => (
          <div
            key={pl.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 text-xs hover:border-blue-500 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-mono font-bold">
                  {pl.code}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{pl.name}</h4>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    负责人：<span className="text-slate-700 dark:text-slate-300 font-medium">{pl.owner}</span>
                  </div>
                </div>
              </div>
              <StatusTag status={pl.health} />
            </div>

            <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
              {pl.description}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">累计迭代版本</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {pl.versionCount} 个版本
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">落地企业客户</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {pl.customerCount} 家
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => openPageTab('prod_req_tasks')}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
              >
                <span>查看研发需求排期</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="规划新产品线架构"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveLine}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存产品线
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveLine} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              产品线规范名称 *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：AI智能助手与大模型知识中台"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                产品线编码 (Code) *
              </label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="如：PL-AI"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                负责人 *
              </label>
              <input
                type="text"
                required
                value={formOwner}
                onChange={(e) => setFormOwner(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              定位与技术规划描述
            </label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="明确该产品线的业务边界、核心组件与战略演进方向..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

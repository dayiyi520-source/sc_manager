import React, { useState } from 'react';
import {
  Handshake,
  Filter,
  Plus,
  Building,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Award,
  ChevronRight,
  Edit,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { Partner } from '../../types';
import { DataTable } from '../common/DataTable';
import { ListToolbar } from '../common/ListToolbar';
import { useAppCrm } from '../../hooks/useAppCrm';

export const CRMPartnersView: React.FC = () => {
  const { partners, addPartner, updatePartner, opportunities, openPageTab, addToast } = useAppCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('方案系统集成商 (SI)');
  const [formLevel, setFormLevel] = useState<Partner['level']>('战略核心伙伴');
  const [formRegion, setFormRegion] = useState('华东大区');
  const [formContactName, setFormContactName] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formContactEmail, setFormContactEmail] = useState('');
  const [formRebateRate, setFormRebateRate] = useState('15% - 20%');
  const [formSignedDate, setFormSignedDate] = useState('2026-01-15');

  const openAddModal = () => {
    setEditingPartner(null);
    setFormName('');
    setFormType('方案系统集成商 (SI)');
    setFormLevel('战略核心伙伴');
    setFormRegion('华东大区');
    setFormContactName('');
    setFormContactPhone('');
    setFormContactEmail('partner@corp.com');
    setFormRebateRate('15% - 20%');
    setFormSignedDate('2026-01-15');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Partner, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPartner(p);
    setFormName(p.name);
    setFormType(p.type);
    setFormLevel(p.level);
    setFormRegion(p.region);
    setFormContactName(p.contactName);
    setFormContactPhone(p.contactPhone);
    setFormContactEmail(p.contactEmail || '');
    setFormRebateRate(p.rebateRate || '15%');
    setFormSignedDate('2026-01-15');
    setIsModalOpen(true);
  };

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formContactName.trim()) {
      addToast('warning', '请填写伙伴机构名称与联系人');
      return;
    }

    if (editingPartner) {
      updatePartner(editingPartner.id, {
        name: formName,
        type: formType,
        level: formLevel,
        region: formRegion,
        contactName: formContactName,
        contactPhone: formContactPhone,
        contactEmail: formContactEmail,
        rebateRate: formRebateRate
      });
      addToast('success', '合作伙伴档案已更新');
    } else {
      addPartner({
        name: formName,
        type: formType,
        level: formLevel,
        region: formRegion,
        contactName: formContactName,
        contactPhone: formContactPhone,
        contactEmail: formContactEmail,
        rebateRate: formRebateRate,
        projectCount: 1,
        status: '合作中'
      });
    }
    setIsModalOpen(false);
  };

  const filteredPartners = partners.filter((p) => {
    const matchQ =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || p.type.includes(typeFilter);
    const matchLevel = levelFilter === 'all' || p.level === levelFilter;
    return matchQ && matchType && matchLevel;
  });

  // 4 Metrics: 伙伴总数、核心战略伙伴、贡献商机、累计贡献金额
  const totalPartners = partners.length;
  const strategicPartners = partners.filter((p) => p.level === '战略核心伙伴').length;
  const contributedOpps = 14;
  const contributedAmount = 1840;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats: 伙伴总数、核心战略伙伴、贡献商机、累计贡献金额 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-partner-total"
          title="伙伴总数"
          value={totalPartners}
          unit="家"
          change="+2家 本季度"
          isPositive={true}
          subText="全渠道生态体系覆盖"
          icon={<Handshake className="w-5 h-5" />}
        />
        <StatCard
          id="stat-partner-strategic"
          title="核心战略伙伴"
          value={strategicPartners}
          unit="家"
          change="战略级分佣"
          isPositive={true}
          subText="东软 / 神州数码 / 中软"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
        />
        <StatCard
          id="stat-partner-opps"
          title="贡献商机数"
          value={contributedOpps}
          unit="个"
          change="+4个 新增"
          isPositive={true}
          subText="渠道转介与联投"
          icon={<Briefcase className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
        <StatCard
          id="stat-partner-amount"
          title="累计贡献金额"
          value={`¥${contributedAmount}`}
          unit="万"
          change="+24% 环比"
          isPositive={true}
          subText="渠道赢单转化率 78%"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
      </div>

      <ListToolbar searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="搜索伙伴机构名称、联系人、区域..." filters={<>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有伙伴等级</option>
            <option value="战略核心伙伴">战略核心伙伴</option>
            <option value="方案集成伙伴">方案集成伙伴</option>
            <option value="区域分销伙伴">区域分销伙伴</option>
            <option value="生态开发伙伴">生态开发伙伴</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有合作类型</option>
            <option value="方案系统集成商 (SI)">方案系统集成商 (SI)</option>
            <option value="软件独立开发商 (ISV)">软件独立开发商 (ISV)</option>
            <option value="区域总代分销商">区域总代分销商</option>
            <option value="战略咨询生态伙伴">战略咨询生态伙伴</option>
          </select>
        </>} actions={<button
          id="btn-add-partner"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新增合作伙伴
        </button>} />

      {/* Partner List Table (列表字段: 伙伴名称、合作等级、合作类型、联系人、电话、贡献商机数、贡献金额、合作状态、操作) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <DataTable>
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="py-3 px-4">伙伴名称</th>
                <th className="py-3 px-4">合作等级</th>
                <th className="py-3 px-4">合作类型</th>
                <th className="py-3 px-4">联系人</th>
                <th className="py-3 px-4">电话</th>
                <th className="py-3 px-4">贡献商机数</th>
                <th className="py-3 px-4">贡献金额</th>
                <th className="py-3 px-4">合作状态</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPartners.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPartner(p)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Handshake className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="hover:text-blue-600">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={p.level} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {p.type}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {p.contactName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {p.contactPhone}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-blue-600">
                    {p.projectCount * 2 + 1} 个
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ¥{p.projectCount * 180 + 200}万
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={p.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedPartner(p)}
                        className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                      >
                        详情 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openEditModal(p, e)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="编辑伙伴"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
        </DataTable>
      </div>

      {/* Partner Detail Drawer (详情页: 伙伴基本信息、贡献商机列表、合作项目情况) */}
      {selectedPartner && (
        <Drawer
          isOpen={!!selectedPartner}
          onClose={() => setSelectedPartner(null)}
          title={selectedPartner.name}
          subtitle={`合作等级: ${selectedPartner.level} · 区域: ${selectedPartner.region}`}
          width="max-w-2xl"
          footer={
            <button
              onClick={() => setSelectedPartner(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              关闭
            </button>
          }
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block">合作等级</span>
                <div className="mt-0.5">
                  <StatusTag status={selectedPartner.level} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">合作业务类型</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedPartner.type}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">核心联系人 / 电话</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedPartner.contactName} · {selectedPartner.contactPhone}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">电子邮箱</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedPartner.contactEmail || 'partner@corp.com'}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">业务覆盖区域</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedPartner.region}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">分佣与激励比例</span>
                <div className="font-semibold text-purple-600 dark:text-purple-400 mt-0.5 font-mono">
                  {selectedPartner.rebateRate || '15% - 20%'}
                </div>
              </div>
            </div>

            {/* 贡献商机列表 */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-500" />
                该伙伴转介与联合攻坚商机
              </h4>
              <div className="space-y-2">
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-white">
                    <span>国家电网华东分部数智协同扩容项目</span>
                    <StatusTag status="签约赢单" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>金额: ¥480万元</span>
                    <span>签约时间: 2026-06-28</span>
                  </div>
                </div>
                <div className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-white">
                    <span>上海电气信创高可用改造工程</span>
                    <StatusTag status="方案设计" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>金额: ¥320万元</span>
                    <span>预计结单: 2026-10-31</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPartner ? '编辑合作伙伴档案' : '录入新生态合作伙伴'}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSavePartner}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存伙伴
            </button>
          </>
        }
      >
        <form onSubmit={handleSavePartner} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                合作伙伴机构全称 *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：上海神州数码集成有限公司"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                合作等级 *
              </label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="战略核心伙伴">战略核心伙伴</option>
                <option value="方案集成伙伴">方案集成伙伴</option>
                <option value="区域分销伙伴">区域分销伙伴</option>
                <option value="生态开发伙伴">生态开发伙伴</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                合作业务类型
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="方案系统集成商 (SI)">方案系统集成商 (SI)</option>
                <option value="软件独立开发商 (ISV)">软件独立开发商 (ISV)</option>
                <option value="区域总代分销商">区域总代分销商</option>
                <option value="战略咨询生态伙伴">战略咨询生态伙伴</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                联系人姓名 *
              </label>
              <input
                type="text"
                value={formContactName}
                onChange={(e) => setFormContactName(e.target.value)}
                placeholder="例如：陈总"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                联系电话
              </label>
              <input
                type="text"
                value={formContactPhone}
                onChange={(e) => setFormContactPhone(e.target.value)}
                placeholder="例如：13900139000"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                覆盖区域
              </label>
              <input
                type="text"
                value={formRegion}
                onChange={(e) => setFormRegion(e.target.value)}
                placeholder="例如：华东大区 (江浙沪)"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                合作分佣比例
              </label>
              <input
                type="text"
                value={formRebateRate}
                onChange={(e) => setFormRebateRate(e.target.value)}
                placeholder="例如：15% - 20%"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

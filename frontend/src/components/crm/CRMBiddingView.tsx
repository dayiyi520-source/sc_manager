import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Plus,
  Building,
  DollarSign,
  Calendar,
  User,
  ExternalLink,
  Award,
  ChevronRight,
  AlertCircle,
  FileText,
  Paperclip,
  RotateCcw,
  CheckCircle2,
  Clock,
  Edit,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { TenderBidding } from '../../types';

export const CRMBiddingView: React.FC = () => {
  const { biddingProjects, addBiddingProject, updateBiddingProject, customers, opportunities, openPageTab, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');

  const [selectedBidding, setSelectedBidding] = useState<TenderBidding | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBidding, setEditingBidding] = useState<TenderBidding | null>(null);

  // Form Fields: 投标编号、项目名称、客户、商机名称、投标金额、商务负责人、技术负责人、开标日期、当前状态、投标结果
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCustomer, setFormCustomer] = useState(customers[0]?.name || '国家电网华东分部数智调度中心');
  const [formOppName, setFormOppName] = useState('国家电网数智调度协同平台定制采购');
  const [formAmount, setFormAmount] = useState(4800000);
  const [formCommercialLeader, setFormCommercialLeader] = useState('周销售');
  const [formTechLeader, setFormTechLeader] = useState('李工 (架构师)');
  const [formOpenDate, setFormOpenDate] = useState('2026-09-18');
  const [formStatus, setFormStatus] = useState<TenderBidding['status']>('标书制作中');
  const [formResult, setFormResult] = useState<TenderBidding['result']>('待开标');

  const openAddModal = () => {
    setEditingBidding(null);
    setFormCode(`BID-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormName('');
    setFormCustomer(customers[0]?.name || '国家电网华东分部数智调度中心');
    setFormOppName('国家电网数智调度协同平台定制采购');
    setFormAmount(4800000);
    setFormCommercialLeader('周销售');
    setFormTechLeader('李工 (架构师)');
    setFormOpenDate('2026-09-18');
    setFormStatus('标书制作中');
    setFormResult('待开标');
    setIsModalOpen(true);
  };

  const openEditModal = (b: TenderBidding, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBidding(b);
    setFormCode(b.code || `BID-2026-${b.id}`);
    setFormName(b.projectName);
    setFormCustomer(b.customerName);
    setFormOppName(b.oppName || b.projectName);
    setFormAmount(b.bidAmount || b.budget || 4800000);
    setFormCommercialLeader(b.commercialLeader);
    setFormTechLeader(b.techLeader);
    setFormOpenDate(b.deadline);
    setFormStatus(b.status);
    setFormResult(b.result || '待开标');
    setIsModalOpen(true);
  };

  const handleSaveBidding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('warning', '请填写招投标项目名称');
      return;
    }

    if (editingBidding) {
      updateBiddingProject(editingBidding.id, {
        code: formCode,
        projectName: formName,
        customerName: formCustomer,
        oppName: formOppName,
        bidAmount: Number(formAmount),
        budget: Number(formAmount),
        commercialLeader: formCommercialLeader,
        techLeader: formTechLeader,
        deadline: formOpenDate,
        status: formStatus,
        result: formResult
      });
      addToast('success', '投标项目信息已更新');
    } else {
      addBiddingProject({
        code: formCode,
        projectName: formName,
        customerName: formCustomer,
        oppName: formOppName,
        budget: Number(formAmount),
        bidAmount: Number(formAmount),
        deadline: formOpenDate,
        status: formStatus,
        result: formResult,
        commercialLeader: formCommercialLeader,
        techLeader: formTechLeader,
        publishDate: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(false);
  };

  const handleLaunchReview = (b: TenderBidding, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addToast('info', '已发起招投标复盘', `【${b.projectName}】复盘流程已初始化并指派给商务与技术团队`);
    openPageTab('crm_bid_review');
  };

  const filteredBiddings = biddingProjects.filter((b) => {
    const matchQ =
      b.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.code && b.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchResult = resultFilter === 'all' || b.result === resultFilter;
    return matchQ && matchStatus && matchResult;
  });

  // 4 Stats: 招投标总数、投标中、已中标、已弃标
  const totalBids = biddingProjects.length;
  const inProgressBids = biddingProjects.filter((b) => b.result === '待开标' || b.status === '标书制作中' || b.status === '已投标待开标').length;
  const wonBids = biddingProjects.filter((b) => b.result === '已中标').length;
  const abandonedBids = biddingProjects.filter((b) => b.result === '已落标' || b.status === '已放弃').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats: 招投标总数、投标中、已中标、已弃标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-bid-total"
          title="招投标项目总数"
          value={totalBids}
          unit="个"
          change="+3个 Q3"
          isPositive={true}
          subText="重点标讯全量追踪"
          icon={<FileCheck className="w-5 h-5" />}
        />
        <StatCard
          id="stat-bid-progress"
          title="投标进行中"
          value={inProgressBids}
          unit="个"
          change="标书制作/封标中"
          isPositive={true}
          subText="金额 ¥1,240万"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
        <StatCard
          id="stat-bid-won"
          title="已中标赢单"
          value={wonBids}
          unit="个"
          change="中标率 75%"
          isPositive={true}
          subText="累计中标 ¥1,180万"
          icon={<Award className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <StatCard
          id="stat-bid-abandoned"
          title="已弃标 / 未中标"
          value={abandonedBids}
          unit="个"
          change="已完成归因复盘"
          isPositive={false}
          subText="控标偏离复盘归档"
          icon={<AlertCircle className="w-5 h-5" />}
          iconBgColor="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
        />
      </div>

      {/* Filter and Action Bar (筛选项: 编号/项目名称/客户、项目类型、状态、时间) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索编号、项目名称、客户..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有状态</option>
            <option value="标书制作中">标书制作中</option>
            <option value="已投标待开标">已投标待开标</option>
            <option value="已开标">已开标</option>
            <option value="已放弃">已放弃</option>
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有结果</option>
            <option value="已中标">已中标</option>
            <option value="待开标">待开标</option>
            <option value="已落标">已落标</option>
          </select>
        </div>

        <button
          id="btn-add-bidding"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新增招投标项目
        </button>
      </div>

      {/* Bidding List Table (列表字段: 项目名称、编号、客户、金额、开标日期、商务负责人、技术负责人、状态、结果、操作) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="py-3 px-4">项目名称</th>
                <th className="py-3 px-4">投标编号</th>
                <th className="py-3 px-4">客户</th>
                <th className="py-3 px-4">投标金额</th>
                <th className="py-3 px-4">开标日期</th>
                <th className="py-3 px-4">商务负责人</th>
                <th className="py-3 px-4">技术负责人</th>
                <th className="py-3 px-4">当前状态</th>
                <th className="py-3 px-4">投标结果</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBiddings.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelectedBidding(b)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{b.projectName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {b.code || `BID-2026-${b.id}`}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    {b.customerName}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ¥{((b.bidAmount || b.budget || 4800000) / 10000).toFixed(0)}万
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {b.deadline}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    {b.commercialLeader}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    {b.techLeader}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={b.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`font-bold ${
                      b.result === '已中标' ? 'text-emerald-600' : b.result === '已落标' ? 'text-rose-600' : 'text-blue-600'
                    }`}>
                      {b.result || '待开标'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedBidding(b)}
                        className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                      >
                        详情 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openEditModal(b, e)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="编辑投标"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleLaunchReview(b, e)}
                        className="px-2 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-600 dark:text-purple-400 rounded font-medium flex items-center gap-1"
                        title="发起复盘"
                      >
                        <RotateCcw className="w-3 h-3" />
                        复盘
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bidding Detail Drawer (详情页: 项目信息、投标团队、资质要求、投标报价分析、关键控标点) */}
      {selectedBidding && (
        <Drawer
          isOpen={!!selectedBidding}
          onClose={() => setSelectedBidding(null)}
          title={selectedBidding.projectName}
          subtitle={`投标编号: ${selectedBidding.code || 'BID-2026-001'} · 客户: ${selectedBidding.customerName}`}
          width="max-w-2xl"
          footer={
            <>
              <button
                onClick={(e) => handleLaunchReview(selectedBidding, e)}
                className="px-3 py-2 bg-purple-50 text-purple-600 dark:bg-purple-950/60 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                发起投标复盘
              </button>
              <button
                onClick={() => setSelectedBidding(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
              >
                关闭
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block">项目客户主体</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedBidding.customerName}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">当前状态 / 结果</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusTag status={selectedBidding.status} />
                  <span className="font-bold text-emerald-600">{selectedBidding.result || '待开标'}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">投标金额 (含税)</span>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 font-mono">
                  ¥{((selectedBidding.bidAmount || selectedBidding.budget || 4800000) / 10000).toFixed(0)} 万元
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">开标 / 投标截止日期</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {selectedBidding.deadline}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">商务牵头负责人</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedBidding.commercialLeader}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">技术架构负责人</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedBidding.techLeader}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">关键控标点与核心资质要求</span>
                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                  1. 必须具备信创全栈认证（达梦数据库兼容性认证证书、统信UOS认证）；<br />
                  2. 需提供近三年大中型国企数智调度协同平台同类实施案例；<br />
                  3. 关键技术响应评分标准对百万级并发架构与微服务治理有硬性加分。
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">投标标书与技术方案附件</span>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                    <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                    <span>正本-投标文件(商务+技术).pdf</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-500" />
                    <span>信创资质认证扫描件.zip</span>
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
        title={editingBidding ? '编辑招投标项目' : '录入新招投标项目'}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveBidding}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存项目
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveBidding} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                投标编号 *
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                关联客户 *
              </label>
              <select
                value={formCustomer}
                onChange={(e) => setFormCustomer(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                招投标项目全称 *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：国家电网数智调度协同平台定制采购公开招标"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                投标金额 (元) *
              </label>
              <input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                开标日期 *
              </label>
              <input
                type="date"
                value={formOpenDate}
                onChange={(e) => setFormOpenDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                商务负责人
              </label>
              <input
                type="text"
                value={formCommercialLeader}
                onChange={(e) => setFormCommercialLeader(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                技术负责人
              </label>
              <input
                type="text"
                value={formTechLeader}
                onChange={(e) => setFormTechLeader(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                当前状态
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="标书制作中">标书制作中</option>
                <option value="已投标待开标">已投标待开标</option>
                <option value="已开标">已开标</option>
                <option value="已放弃">已放弃</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                投标结果
              </label>
              <select
                value={formResult}
                onChange={(e) => setFormResult(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="待开标">待开标</option>
                <option value="已中标">已中标</option>
                <option value="已落标">已落标</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

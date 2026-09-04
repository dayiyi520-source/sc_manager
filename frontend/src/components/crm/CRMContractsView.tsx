import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Building,
  DollarSign,
  Calendar,
  User,
  ExternalLink,
  CheckCircle2,
  Clock,
  ChevronRight,
  Edit,
  Paperclip,
  Download,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { Contract } from '../../types';

export const CRMContractsView: React.FC = () => {
  const { contracts, addContract, updateContract, customers, openPageTab, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // Form Fields: 合同编号、合同名称、客户、关联产品、合同类型、合同金额、负责人、签约日期、生效日期、持续时长、结束日期
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCustomer, setFormCustomer] = useState(customers[0]?.name || '国家电网华东分部数智调度中心');
  const [formProduct, setFormProduct] = useState('数字化协同管理中枢 V4.2');
  const [formType, setFormType] = useState<Contract['type']>('定制开发');
  const [formAmount, setFormAmount] = useState(4800000);
  const [formSignDate, setFormSignDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEffectiveDate, setFormEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDuration, setFormDuration] = useState('12个月');
  const [formEndDate, setFormEndDate] = useState('2027-08-31');
  const [formStatus, setFormStatus] = useState<Contract['status']>('履约中');

  const openAddModal = () => {
    setEditingContract(null);
    setFormCode(`SC-CT-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormName('');
    setFormCustomer(customers[0]?.name || '国家电网华东分部数智调度中心');
    setFormProduct('数字化协同管理中枢 V4.2');
    setFormType('定制开发');
    setFormAmount(4800000);
    setFormSignDate(new Date().toISOString().split('T')[0]);
    setFormEffectiveDate(new Date().toISOString().split('T')[0]);
    setFormDuration('12个月');
    setFormEndDate('2027-08-31');
    setFormStatus('履约中');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Contract, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingContract(c);
    setFormCode(c.code);
    setFormName(c.name);
    setFormCustomer(c.customerName);
    setFormProduct(c.relatedProduct);
    setFormType(c.type);
    setFormAmount(c.amount);
    setFormSignDate(c.signDate);
    setFormEffectiveDate(c.signDate);
    setFormDuration('12个月');
    setFormEndDate('2027-08-31');
    setFormStatus(c.status);
    setIsModalOpen(true);
  };

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      addToast('warning', '请填写合同编号与合同名称');
      return;
    }

    if (editingContract) {
      updateContract(editingContract.id, {
        code: formCode,
        name: formName,
        customerName: formCustomer,
        relatedProduct: formProduct,
        type: formType,
        amount: Number(formAmount),
        signDate: formSignDate,
        status: formStatus
      });
      addToast('success', '合同档案已更新');
    } else {
      const customer = customers.find((item) => item.name === formCustomer);
      if (!customer) {
        addToast('warning', '请先创建或选择有效客户');
        return;
      }
      addContract({
        code: formCode,
        name: formName,
        customerId: customer.id,
        customerName: formCustomer,
        relatedProduct: formProduct,
        type: formType,
        amount: Number(formAmount),
        signDate: formSignDate,
        status: formStatus,
        paymentStages: [
          { phase: '第一期 (首付款 30%)', percentage: 30, amount: Number(formAmount) * 0.3, status: '已收款', triggerCondition: '合同签订生效后7个工作日内', dueDate: formSignDate },
          { phase: '第二期 (初验款 40%)', percentage: 40, amount: Number(formAmount) * 0.4, status: '待催收', triggerCondition: '系统部署上线并通过初验', dueDate: '2026-11-30' },
          { phase: '第三期 (终验款 20%)', percentage: 20, amount: Number(formAmount) * 0.2, status: '未到期', triggerCondition: '系统稳定运行3个月并通过终验', dueDate: '2027-03-31' },
          { phase: '第四期 (质保金 10%)', percentage: 10, amount: Number(formAmount) * 0.1, status: '未到期', triggerCondition: '1年免费质保期满无重大质量问题', dueDate: '2027-08-31' }
        ]
      });
    }
    setIsModalOpen(false);
  };

  const filteredContracts = contracts.filter((c) => {
    const matchQ =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchQ && matchType && matchStatus;
  });

  // 4 Top Metrics: 合同总数、本月签约、进行中、待回款
  const totalCount = contracts.length;
  const thisMonthSignedCount = 2;
  const inProgressCount = contracts.filter((c) => c.status === '履约中' || c.status === '进行中').length;
  const pendingPaymentAmount = 380;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats: 合同总数、本月签约、进行中、待回款 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-contract-total"
          title="合同总数"
          value={totalCount}
          unit="份"
          change="累计金额 ¥2,460万"
          isPositive={true}
          subText="电子与纸质双归档"
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          id="stat-contract-signed"
          title="本月新签合同"
          value={thisMonthSignedCount}
          unit="份"
          change="新签 ¥800万"
          isPositive={true}
          subText="国网/上海电气项目"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <StatCard
          id="stat-contract-inprogress"
          title="履约进行中合同"
          value={inProgressCount}
          unit="份"
          change="按期交付中"
          isPositive={true}
          subText="项目实施平稳"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
        <StatCard
          id="stat-contract-pending"
          title="待催收回款金额"
          value={`¥${pendingPaymentAmount}`}
          unit="万"
          change="阶段款催收"
          isPositive={false}
          subText="初验款即将到期"
          icon={<CreditCard className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
        />
      </div>

      {/* Filter and Action Bar (筛选项: 合同编号/客户/项目、合同类型、主/子合同、日期筛选) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索合同编号、名称、客户..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有合同类型</option>
            <option value="标准产品销售">标准产品销售</option>
            <option value="定制开发">定制开发</option>
            <option value="信创集成">信创集成</option>
            <option value="维保服务">维保服务</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有合同状态</option>
            <option value="履约中">履约中</option>
            <option value="已完结">已完结</option>
            <option value="待生效">待生效</option>
          </select>
        </div>

        <button
          id="btn-add-contract"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新增合同
        </button>
      </div>

      {/* Contract List Table (列表字段: 合同编号、合同名称、客户、金额、签约日期、负责人、状态、操作) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="py-3 px-4">合同编号</th>
                <th className="py-3 px-4">合同名称</th>
                <th className="py-3 px-4">客户</th>
                <th className="py-3 px-4">合同金额</th>
                <th className="py-3 px-4">签约日期</th>
                <th className="py-3 px-4">负责人</th>
                <th className="py-3 px-4">状态</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredContracts.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedContract(c)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                    {c.code}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="hover:text-blue-600">{c.name}</div>
                    <div className="text-[10px] text-slate-400">{c.relatedProduct} · {c.type}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    {c.customerName}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ¥{(c.amount / 10000).toFixed(0)}万
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {c.signDate}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                    周销售
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={c.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedContract(c)}
                        className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                      >
                        详情 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openEditModal(c, e)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="编辑合同"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Detail Drawer (详情页: 合同基础信息、付款计划执行明细、履约阶段交付、电子用印文件) */}
      {selectedContract && (
        <Drawer
          isOpen={!!selectedContract}
          onClose={() => setSelectedContract(null)}
          title={selectedContract.name}
          subtitle={`合同编号: ${selectedContract.code} · 客户: ${selectedContract.customerName}`}
          width="max-w-2xl"
          footer={
            <button
              onClick={() => setSelectedContract(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              关闭
            </button>
          }
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block">签约客户主体</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedContract.customerName}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">合同状态</span>
                <div className="mt-0.5">
                  <StatusTag status={selectedContract.status} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">合同总金额 (含税)</span>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 font-mono">
                  ¥{(selectedContract.amount / 10000).toFixed(0)} 万元
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">签约与生效日期</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {selectedContract.signDate} (持续12个月)
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">合同业务类型</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedContract.type}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">关联交付产品</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedContract.relatedProduct}
                </div>
              </div>
            </div>

            {/* 付款计划执行明细 (期次、比例、金额、触发条件、到账日期) */}
            <div className="space-y-3">
              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                分期回款计划执行跟踪
              </h4>
              <div className="space-y-2">
                {selectedContract.paymentStages?.map((stage) => (
                  <div
                    key={stage.phase}
                    className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{stage.phase}</span>
                      <StatusTag status={stage.status} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>触发条件: {stage.triggerCondition || '按期交付'}</span>
                      <span className="font-mono font-bold text-emerald-600">
                        ¥{(stage.amount / 10000).toFixed(0)}万 ({stage.percentage}%)
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">计划到账日期: {stage.dueDate}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 电子用印文件 */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">合同附件与电子用印原件</h4>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                  <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                  <span>国家电网数智调度协同平台技术开发合同(用印版).pdf</span>
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
        title={editingContract ? '编辑商务合同' : '新增商务采购/销售合同'}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveContract}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存合同
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveContract} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                合同编号 *
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
                签约客户 *
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
                合同全称 *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：国家电网华东分部数智协同调度平台定制采购合同"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                合同类型
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="标准产品销售">标准产品销售</option>
                <option value="定制开发">定制开发</option>
                <option value="信创集成">信创集成</option>
                <option value="维保服务">维保服务</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                合同金额 (元) *
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
                签约日期
              </label>
              <input
                type="date"
                value={formSignDate}
                onChange={(e) => setFormSignDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                生效日期
              </label>
              <input
                type="date"
                value={formEffectiveDate}
                onChange={(e) => setFormEffectiveDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                关联产品
              </label>
              <input
                type="text"
                value={formProduct}
                onChange={(e) => setFormProduct(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                持续时长
              </label>
              <input
                type="text"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                placeholder="例如：12个月"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

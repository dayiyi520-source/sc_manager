import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Building2,
  Send,
  FileCheck2
} from 'lucide-react';
import { StatCard, StatusTag, Modal, Drawer } from '../common/UIComponents';
import { useApp } from '../../context/AppContext';
import { PaymentPlan, ActualPaymentRecord } from '../../types';

export const PaymentCollectionManagementView: React.FC = () => {
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'plan' | 'received' | 'overdue'>('plan');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Drawers
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedPlanForRecord, setSelectedPlanForRecord] = useState<PaymentPlan | null>(null);

  // Mock Data
  const [plans, setPlans] = useState<PaymentPlan[]>([
    { id: '1', planCode: 'PAY-20260901-01', contractCode: 'SC-CT-2026-089', customerName: '国家电网华东分部数智调度中心', stageName: '一期验收款 (50%)', planAmount: 600000, receivedAmount: 600000, uncollectedAmount: 0, dueDate: '2026-08-30', status: '已回款', manager: '王总监' },
    { id: '2', planCode: 'PAY-20260902-02', contractCode: 'SC-CT-2026-042', customerName: '南京市第一中学', stageName: '项目预付款 (30%)', planAmount: 144000, receivedAmount: 0, uncollectedAmount: 144000, dueDate: '2026-09-15', status: '进行中', manager: '李经理' },
    { id: '3', planCode: 'PAY-20260815-03', contractCode: 'SC-CT-2026-018', customerName: '常州高级中学', stageName: '质保尾款 (10%)', planAmount: 85000, receivedAmount: 0, uncollectedAmount: 85000, dueDate: '2026-08-10', status: '逾期未还', manager: '张主管' },
  ]);

  const [records, setRecords] = useState<ActualPaymentRecord[]>([
    { id: '1', recordCode: 'REC-20260830-01', planCode: 'PAY-20260901-01', customerName: '国家电网华东分部', amount: 600000, payDate: '2026-08-30 15:20', payMethod: '电汇', bankSerialNo: '9920102910291029', operator: '财务处李华' },
  ]);

  // Form states
  const [newPlanForm, setNewPlanForm] = useState({ contractCode: '', customerName: '', stageName: '预付款', planAmount: 200000, dueDate: '', manager: '当前负责人' });
  const [recordAmount, setRecordAmount] = useState(100000);
  const [recordPayMethod, setRecordPayMethod] = useState('电汇');

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const p: PaymentPlan = {
      id: Date.now().toString(),
      planCode: `PAY-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*90+10)}`,
      contractCode: newPlanForm.contractCode || 'SC-CT-2026-999',
      customerName: newPlanForm.customerName || '客户单位名称',
      stageName: newPlanForm.stageName,
      planAmount: Number(newPlanForm.planAmount) || 0,
      receivedAmount: 0,
      uncollectedAmount: Number(newPlanForm.planAmount) || 0,
      dueDate: newPlanForm.dueDate || new Date().toISOString().slice(0,10),
      status: '进行中',
      manager: newPlanForm.manager
    };

    setPlans([p, ...plans]);
    setShowPlanModal(false);
    addToast('success', '回款计划创建成功', `计划编号：${p.planCode}`);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForRecord) return;

    const amount = Number(recordAmount) || 0;
    const newRecord: ActualPaymentRecord = {
      id: Date.now().toString(),
      recordCode: `REC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*90+10)}`,
      planCode: selectedPlanForRecord.planCode,
      customerName: selectedPlanForRecord.customerName,
      amount,
      payDate: new Date().toLocaleString(),
      payMethod: recordPayMethod,
      bankSerialNo: `TX-${Math.floor(Math.random()*89999999 + 10000000)}`,
      operator: '财务经办人'
    };

    setRecords([newRecord, ...records]);

    // Update Plan State
    setPlans(plans.map(p => {
      if (p.id === selectedPlanForRecord.id) {
        const newReceived = p.receivedAmount + amount;
        const newUncollected = Math.max(0, p.planAmount - newReceived);
        return {
          ...p,
          receivedAmount: newReceived,
          uncollectedAmount: newUncollected,
          status: newUncollected === 0 ? '已回款' : '进行中'
        };
      }
      return p;
    }));

    setSelectedPlanForRecord(null);
    setShowRecordModal(false);
    addToast('success', `成功录入回款金额 ¥ ${amount.toLocaleString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="年度应收回款总额"
          value="¥ 2,829,000"
          subText="已回款比例 68.4%"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
          onClick={() => setActiveTab('plan')}
        />
        <StatCard
          title="实际已到账金额"
          value="¥ 1,935,000"
          subText="银行对账单匹配率 100%"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          onClick={() => setActiveTab('received')}
        />
        <StatCard
          title="逾期未回款警告"
          value="¥ 85,000"
          subText="1 笔款项超过约定节点 24 天"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-500/10 text-rose-400 border border-rose-500/20"
          onClick={() => setActiveTab('overdue')}
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-5 shadow-sm space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'plan'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              回款计划台账
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'received'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              实际到账记录
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'overdue'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              逾期与催款预警
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowPlanModal(true)}
              className="px-3.5 py-1.5 bg-[var(--warning)] text-black hover:bg-[var(--accent-gold-hover)] font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新建回款计划
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索计划编号、关联合同号、客户名称或负责人..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
        </div>

        {/* Tab 1: 回款计划 */}
        {activeTab === 'plan' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">计划编号</th>
                  <th className="py-3 px-3">关联合同号</th>
                  <th className="py-3 px-3">客户名称</th>
                  <th className="py-3 px-3">阶段节点</th>
                  <th className="py-3 px-3">应收金额</th>
                  <th className="py-3 px-3">已到账</th>
                  <th className="py-3 px-3">未到账余额</th>
                  <th className="py-3 px-3">约定回款节点</th>
                  <th className="py-3 px-3">状态</th>
                  <th className="py-3 px-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {plans
                  .filter((p) => p.customerName.includes(searchQuery) || p.contractCode.includes(searchQuery))
                  .map((plan) => (
                    <tr key={plan.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{plan.planCode}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-primary)]">{plan.contractCode}</td>
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{plan.customerName}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{plan.stageName}</td>
                      <td className="py-3 px-3 font-bold text-white">¥ {plan.planAmount.toLocaleString()}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">¥ {plan.receivedAmount.toLocaleString()}</td>
                      <td className="py-3 px-3 font-bold text-[var(--warning)]">¥ {plan.uncollectedAmount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{plan.dueDate}</td>
                      <td className="py-3 px-3"><StatusTag status={plan.status} /></td>
                      <td className="py-3 px-3 text-right">
                        {plan.uncollectedAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedPlanForRecord(plan);
                              setRecordAmount(plan.uncollectedAmount);
                              setShowRecordModal(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition"
                          >
                            录入到账
                          </button>
                        )}
                        {plan.uncollectedAmount === 0 && (
                          <span className="text-[10px] text-emerald-400 font-mono">结清</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 实际到账记录 */}
        {activeTab === 'received' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">到账单号</th>
                  <th className="py-3 px-3">关联计划编号</th>
                  <th className="py-3 px-3">客户名称</th>
                  <th className="py-3 px-3">到账金额</th>
                  <th className="py-3 px-3">支付方式</th>
                  <th className="py-3 px-3">银行流水号</th>
                  <th className="py-3 px-3">到账时间</th>
                  <th className="py-3 px-3">录入经办人</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{r.recordCode}</td>
                    <td className="py-3 px-3 font-mono text-[var(--text-body)]">{r.planCode}</td>
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{r.customerName}</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">¥ {r.amount.toLocaleString()}</td>
                    <td className="py-3 px-3"><StatusTag status={r.payMethod} type="info" /></td>
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{r.bankSerialNo}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{r.payDate}</td>
                    <td className="py-3 px-3 text-[var(--text-body)]">{r.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: 逾期与催款预警 */}
        {activeTab === 'overdue' && (
          <div className="space-y-3">
            {plans
              .filter((p) => p.status === '逾期未还')
              .map((ovd) => (
                <div
                  key={ovd.id}
                  className="p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{ovd.customerName}</span>
                        <span className="font-mono text-[var(--text-muted)]">({ovd.contractCode})</span>
                        <StatusTag status="严重逾期" type="danger" />
                      </div>
                      <p className="text-[var(--text-muted)] mt-1">
                        阶段: {ovd.stageName} | 约定日期: {ovd.dueDate} | 欠款: <span className="font-bold text-rose-400">¥ {ovd.uncollectedAmount.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => addToast('info', `已生成催款函PDF并推送至负责人 [${ovd.manager}]`)}
                    className="px-3.5 py-1.5 bg-rose-600 text-white font-semibold rounded-md hover:bg-rose-700 transition"
                  >
                    生成催款函与警示通知
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal: 新建回款计划 */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title="新建合同回款计划"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">关联合同编号</label>
            <input
              type="text"
              required
              placeholder="如：SC-CT-2026-089"
              onChange={(e) => setNewPlanForm({ ...newPlanForm, contractCode: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">付款客户全称</label>
            <input
              type="text"
              required
              placeholder="如：国家电网"
              onChange={(e) => setNewPlanForm({ ...newPlanForm, customerName: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">回款阶段说明</label>
              <input
                type="text"
                placeholder="例：初验款(30%)"
                onChange={(e) => setNewPlanForm({ ...newPlanForm, stageName: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">应收计划金额 (元)</label>
              <input
                type="number"
                required
                placeholder="100000"
                onChange={(e) => setNewPlanForm({ ...newPlanForm, planAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">约定截止回款日期</label>
            <input
              type="date"
              required
              onChange={(e) => setNewPlanForm({ ...newPlanForm, dueDate: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowPlanModal(false)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
            <button type="submit" className="px-3.5 py-1.5 bg-[var(--warning)] text-black font-semibold rounded-md hover:bg-[var(--accent-gold-hover)]">创建回款计划</button>
          </div>
        </form>
      </Modal>

      {/* Modal: 快捷录入到账 */}
      <Modal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        title="快捷录入到账明细"
        maxWidth="md"
      >
        {selectedPlanForRecord && (
          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
            <div className="p-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg space-y-1">
              <p><span className="text-[var(--text-muted)]">客户名称:</span> <span className="font-semibold text-white">{selectedPlanForRecord.customerName}</span></p>
              <p><span className="text-[var(--text-muted)]">回款节点:</span> {selectedPlanForRecord.stageName}</p>
              <p><span className="text-[var(--text-muted)]">待回款未清余额:</span> <span className="font-bold text-[var(--warning)]">¥ {selectedPlanForRecord.uncollectedAmount.toLocaleString()}</span></p>
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">本次到账金额 (元)</label>
              <input
                type="number"
                required
                value={recordAmount}
                onChange={(e) => setRecordAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">支付/到账方式</label>
              <select
                value={recordPayMethod}
                onChange={(e) => setRecordPayMethod(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              >
                <option value="电汇">银行电汇</option>
                <option value="承兑汇票">商业/银行承兑汇票</option>
                <option value="网银转账">网银即时转账</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowRecordModal(false)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
              <button type="submit" className="px-3.5 py-1.5 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700">确认销账并录入</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

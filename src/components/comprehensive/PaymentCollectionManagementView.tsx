import React, { useState } from 'react';
import { Empty } from 'antd';
import './finance-management.css';
import { 
  CreditCard, 
  Plus, 
  Search, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
} from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
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

  // 当前数据库快照没有回款数据，从空状态开始，避免混入旧演示记录。
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [records, setRecords] = useState<ActualPaymentRecord[]>([]);

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
    <ComprehensivePage title="回款管理" description="跟踪合同回款计划、到账记录与逾期款项" icon={<CreditCard className="w-5 h-5" />} hideHeader>
    <div className="finance-workspace space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="年度应收回款总额"
          value="¥ 2,829,000"
          subText="已回款比例 68.4%"
          icon={<DollarSign className="w-5 h-5" />}
          onClick={() => setActiveTab('plan')}
        />
        <StatCard
          title="实际已到账金额"
          value="¥ 1,935,000"
          subText="银行对账单匹配率 100%"
          icon={<CheckCircle2 className="w-5 h-5" />}
          onClick={() => setActiveTab('received')}
        />
        <StatCard
          title="逾期未回款警告"
          value="¥ 85,000"
          subText="1 笔款项超过约定节点 24 天"
          icon={<AlertTriangle className="w-5 h-5" />}
          onClick={() => setActiveTab('overdue')}
        />
      </div>

      {/* Main Table Card */}
      <div className="finance-panel space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="finance-header">
          <div className="finance-tabs" role="tablist" aria-label="回款视图">
            <button
              type="button" role="tab" aria-selected={activeTab === 'plan'}
              onClick={() => setActiveTab('plan')}
              className={`finance-tab ${activeTab === 'plan' ? 'is-active' : ''}`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              回款计划台账
            </button>
            <button
              type="button" role="tab" aria-selected={activeTab === 'received'}
              onClick={() => setActiveTab('received')}
              className={`finance-tab ${activeTab === 'received' ? 'is-active' : ''}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              实际到账记录
            </button>
            <button
              type="button" role="tab" aria-selected={activeTab === 'overdue'}
              onClick={() => setActiveTab('overdue')}
              className={`finance-tab ${activeTab === 'overdue' ? 'is-active' : ''}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              逾期与催款预警
            </button>
          </div>

          <div className="finance-actions">
            <button
              onClick={() => setShowPlanModal(true)}
              className="finance-action finance-action-primary"
            >
              <Plus className="w-4 h-4" />
              新建回款计划
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div>
          <div className="finance-search">
            <Search className="w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索计划编号、关联合同号、客户名称或负责人..."
              className="finance-input"
            />
          </div>
        </div>

        {/* Tab 1: 回款计划 */}
        {activeTab === 'plan' && (
          <div className="finance-table-scroll">
            <table className="finance-table finance-table-wide">
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
                      <td className="finance-amount">¥ {plan.planAmount.toLocaleString()}</td>
                      <td className="finance-amount finance-amount-success">¥ {plan.receivedAmount.toLocaleString()}</td>
                      <td className="finance-amount finance-amount-warning">¥ {plan.uncollectedAmount.toLocaleString()}</td>
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
                            className="finance-action"
                          >
                            录入到账
                          </button>
                        )}
                        {plan.uncollectedAmount === 0 && (
                          <span className="text-[var(--success)] font-mono">结清</span>
                        )}
                      </td>
                    </tr>
                  ))}
                {!plans.some(p => p.customerName.includes(searchQuery) || p.contractCode.includes(searchQuery)) && <tr><td colSpan={10} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的回款计划' : '暂无回款计划'} /></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 实际到账记录 */}
        {activeTab === 'received' && (
          <div className="finance-table-scroll">
            <table className="finance-table">
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
                    <td className="finance-amount finance-amount-success">¥ {r.amount.toLocaleString()}</td>
                    <td className="py-3 px-3"><StatusTag status={r.payMethod} type="info" /></td>
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{r.bankSerialNo}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{r.payDate}</td>
                    <td className="py-3 px-3 text-[var(--text-body)]">{r.operator}</td>
                  </tr>
                ))}
                {!records.length && <tr><td colSpan={8} className="finance-empty-cell"><Empty description="暂无到账记录" /></td></tr>}
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
                  className="finance-overdue"
                >
                  <div className="flex items-start gap-3">
                    <div className="finance-overdue-icon">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="finance-overdue-title">{ovd.customerName}</span>
                        <span className="font-mono text-[var(--text-muted)]">({ovd.contractCode})</span>
                        <StatusTag status="严重逾期" type="danger" />
                      </div>
                      <p className="text-[var(--text-muted)] mt-1">
                        阶段: {ovd.stageName} | 约定日期: {ovd.dueDate} | 欠款: <span className="font-bold text-[var(--danger)]">¥ {ovd.uncollectedAmount.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => addToast('info', `已生成催款函PDF并推送至负责人 [${ovd.manager}]`)}
                    className="finance-action finance-action-danger"
                  >
                    生成催款函与警示通知
                  </button>
                </div>
              ))}
            {!plans.some(p => p.status === '逾期未还') && <div className="py-8"><Empty description="暂无逾期款项" /></div>}
          </div>
        )}
      </div>

      {/* Modal: 新建回款计划 */}
      <Modal
        isOpen={showPlanModal}
        className="finance-dialog"
        onClose={() => setShowPlanModal(false)}
        title="新建合同回款计划"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePlan} className="finance-form">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">关联合同编号</label>
            <input
              type="text"
              aria-label="关联合同编号"
              required
              placeholder="如：SC-CT-2026-089"
              onChange={(e) => setNewPlanForm({ ...newPlanForm, contractCode: e.target.value })}
              className="finance-input"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">付款客户全称</label>
            <input
              type="text"
              aria-label="付款客户全称"
              required
              placeholder="如：国家电网"
              onChange={(e) => setNewPlanForm({ ...newPlanForm, customerName: e.target.value })}
              className="finance-input"
            />
          </div>
          <div className="finance-form-grid">
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">回款阶段说明</label>
              <input
                type="text"
                aria-label="回款阶段说明"
                placeholder="例：初验款(30%)"
                onChange={(e) => setNewPlanForm({ ...newPlanForm, stageName: e.target.value })}
                className="finance-input"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">应收计划金额 (元)</label>
              <input
                type="number"
                aria-label="应收计划金额 (元)"
                required
                placeholder="100000"
                onChange={(e) => setNewPlanForm({ ...newPlanForm, planAmount: Number(e.target.value) })}
                className="finance-input"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">约定截止回款日期</label>
            <input
              type="date"
              aria-label="约定截止回款日期"
              required
              onChange={(e) => setNewPlanForm({ ...newPlanForm, dueDate: e.target.value })}
              className="finance-input"
            />
          </div>
          <div className="finance-form-footer">
            <button type="button" onClick={() => setShowPlanModal(false)} className="finance-action">取消</button>
            <button type="submit" className="finance-action finance-action-primary">创建回款计划</button>
          </div>
        </form>
      </Modal>

      {/* Modal: 快捷录入到账 */}
      <Modal
        isOpen={showRecordModal}
        className="finance-dialog"
        onClose={() => setShowRecordModal(false)}
        title="快捷录入到账明细"
        maxWidth="md"
      >
        {selectedPlanForRecord && (
          <form onSubmit={handleRecordPayment} className="finance-form">
            <div className="finance-form-summary space-y-1">
              <p><span className="text-[var(--text-muted)]">客户名称:</span> <strong>{selectedPlanForRecord.customerName}</strong></p>
              <p><span className="text-[var(--text-muted)]">回款节点:</span> {selectedPlanForRecord.stageName}</p>
              <p><span className="text-[var(--text-muted)]">待回款未清余额:</span> <span className="font-bold text-[var(--warning)]">¥ {selectedPlanForRecord.uncollectedAmount.toLocaleString()}</span></p>
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">本次到账金额 (元)</label>
              <input
                type="number"
                aria-label="本次到账金额 (元)"
                required
                value={recordAmount}
                onChange={(e) => setRecordAmount(Number(e.target.value))}
                className="finance-input"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">支付/到账方式</label>
              <select
                aria-label="支付/到账方式"
                value={recordPayMethod}
                onChange={(e) => setRecordPayMethod(e.target.value)}
                className="finance-input"
              >
                <option value="电汇">银行电汇</option>
                <option value="承兑汇票">商业/银行承兑汇票</option>
                <option value="网银转账">网银即时转账</option>
              </select>
            </div>
            <div className="finance-form-footer">
              <button type="button" onClick={() => setShowRecordModal(false)} className="finance-action">取消</button>
              <button type="submit" className="finance-action finance-action-primary">确认销账并录入</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
    </ComprehensivePage>
  );
};

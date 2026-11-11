import React, { useState } from 'react';
import { Empty } from 'antd';
import './finance-management.css';
import { 
  Receipt, 
  Plus, 
  Search, 
  FileText, 
  Building2, 
  DollarSign, 
  Building
} from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
import { useApp } from '../../context/AppContext';
import { InvoiceRecord, TaxProfile } from '../../types';

export const InvoiceManagementView: React.FC = () => {
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'sales' | 'purchase' | 'tax_profile'>('sales');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 当前数据库快照没有发票与税务档案，从空状态开始。
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);

  // Form states
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    type: '销项',
    category: '增值税专用发票',
    customerName: '',
    amount: 100000,
    taxRate: '6%',
    relatedContractCode: '',
    applicant: '当前用户'
  });

  const [newProfileForm, setNewProfileForm] = useState({
    companyName: '',
    taxId: '',
    bankName: '',
    bankAccount: '',
    addressPhone: ''
  });

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const inv: InvoiceRecord = {
      id: Date.now().toString(),
      invoiceNo: `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*90+10)}`,
      type: newInvoiceForm.type as any,
      category: newInvoiceForm.category as any,
      customerName: newInvoiceForm.customerName || '客户单位名称',
      amount: Number(newInvoiceForm.amount) || 0,
      taxRate: newInvoiceForm.taxRate,
      taxAmount: Math.round((Number(newInvoiceForm.amount) || 0) * 0.06),
      applyDate: new Date().toISOString().slice(0,10),
      status: '开票中',
      applicant: newInvoiceForm.applicant,
      relatedContractCode: newInvoiceForm.relatedContractCode || 'SC-CT-2026-999'
    };

    setInvoices([inv, ...invoices]);
    setShowInvoiceModal(false);
    addToast('success', '开票申请提交成功', `申请单号：${inv.invoiceNo}`);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const prof: TaxProfile = {
      id: Date.now().toString(),
      companyName: newProfileForm.companyName || '企业公司名称',
      taxId: newProfileForm.taxId || '91320000XXXXXXXXXX',
      bankName: newProfileForm.bankName || '开户银行',
      bankAccount: newProfileForm.bankAccount || '账号',
      addressPhone: newProfileForm.addressPhone || '地址及电话'
    };

    setTaxProfiles([prof, ...taxProfiles]);
    setShowProfileModal(false);
    addToast('success', '企业开票抬头录入成功', prof.companyName);
  };

  return (
    <ComprehensivePage title="发票管理" description="处理销项开票、进项登记与企业开票资质" icon={<Receipt className="w-5 h-5" />} hideHeader>
    <div className="finance-workspace space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="开票总额 (销项)"
          value="¥ 1,680,000"
          subText="税率 6% 开票状态良好"
          icon={<Receipt className="w-5 h-5" />}
          onClick={() => setActiveTab('sales')}
        />
        <StatCard
          title="已验真进项发票"
          value="¥ 42,500"
          subText="可抵扣税额 ¥ 5,525"
          icon={<DollarSign className="w-5 h-5" />}
          onClick={() => setActiveTab('purchase')}
        />
        <StatCard
          title="合作开票抬头库"
          value={`${taxProfiles.length} 企`}
          subText="资质纳税识别号已核验"
          icon={<Building2 className="w-5 h-5" />}
          onClick={() => setActiveTab('tax_profile')}
        />
      </div>

      {/* Main Table Card */}
      <div className="finance-panel space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="finance-header">
          <div className="finance-tabs" role="tablist" aria-label="发票视图">
            <button
              type="button" role="tab" aria-selected={activeTab === 'sales'}
              onClick={() => setActiveTab('sales')}
              className={`finance-tab ${activeTab === 'sales' ? 'is-active' : ''}`}
            >
              <Receipt className="w-3.5 h-3.5" />
              销项开票申请
            </button>
            <button
              type="button" role="tab" aria-selected={activeTab === 'purchase'}
              onClick={() => setActiveTab('purchase')}
              className={`finance-tab ${activeTab === 'purchase' ? 'is-active' : ''}`}
            >
              <FileText className="w-3.5 h-3.5" />
              进项抵扣登记
            </button>
            <button
              type="button" role="tab" aria-selected={activeTab === 'tax_profile'}
              onClick={() => setActiveTab('tax_profile')}
              className={`finance-tab ${activeTab === 'tax_profile' ? 'is-active' : ''}`}
            >
              <Building className="w-3.5 h-3.5" />
              开票抬头信息库
            </button>
          </div>

          <div className="finance-actions">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="finance-action finance-action-primary"
            >
              <Plus className="w-4 h-4" />
              新建开票申请
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className="finance-action"
            >
              <Plus className="w-4 h-4" />
              录入抬头资料
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
              placeholder="搜索发票单号、抬头名称、关联合同号、申请人..."
              className="finance-input"
            />
          </div>
        </div>

        {/* Tab 1: 销项开票 */}
        {activeTab === 'sales' && (
          <div className="finance-table-scroll">
            <table className="finance-table finance-table-wide">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">发票申请单号</th>
                  <th className="py-3 px-3">开票类型</th>
                  <th className="py-3 px-3">购方抬头/客户名称</th>
                  <th className="py-3 px-3">开票金额</th>
                  <th className="py-3 px-3">税率 / 税额</th>
                  <th className="py-3 px-3">关联合同</th>
                  <th className="py-3 px-3">申请人</th>
                  <th className="py-3 px-3">申请日期</th>
                  <th className="py-3 px-3">开票状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {invoices
                  .filter((i) => i.type === '销项' && (i.customerName.includes(searchQuery) || i.invoiceNo.includes(searchQuery)))
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.invoiceNo}</td>
                      <td className="py-3 px-3"><StatusTag status={inv.category} type="info" /></td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{inv.customerName}</td>
                      <td className="finance-amount">¥ {inv.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.taxRate} (¥{inv.taxAmount})</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.relatedContractCode}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.applicant}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{inv.applyDate}</td>
                      <td className="py-3 px-3"><StatusTag status={inv.status} /></td>
                    </tr>
                  ))}
                {!invoices.some(i => i.type === '销项' && (i.customerName.includes(searchQuery) || i.invoiceNo.includes(searchQuery))) && <tr><td colSpan={9} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的销项开票申请' : '暂无销项开票申请'} /></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 进项抵扣登记 */}
        {activeTab === 'purchase' && (
          <div className="finance-table-scroll">
            <table className="finance-table">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">发票代码/单号</th>
                  <th className="py-3 px-3">发票种类</th>
                  <th className="py-3 px-3">销方/供应商名称</th>
                  <th className="py-3 px-3">金额(不含税)</th>
                  <th className="py-3 px-3">可抵扣税额</th>
                  <th className="py-3 px-3">关联采购单</th>
                  <th className="py-3 px-3">录入人</th>
                  <th className="py-3 px-3">校验结果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {invoices
                  .filter((i) => i.type === '进项')
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.invoiceNo}</td>
                      <td className="py-3 px-3"><StatusTag status={inv.category} type="info" /></td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{inv.customerName}</td>
                      <td className="finance-amount">¥ {inv.amount.toLocaleString()}</td>
                      <td className="finance-amount finance-amount-success">¥ {inv.taxAmount.toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.relatedContractCode}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.applicant}</td>
                      <td className="py-3 px-3"><StatusTag status={inv.status} type="success" /></td>
                    </tr>
                  ))}
                {!invoices.some(i => i.type === '进项') && <tr><td colSpan={8} className="finance-empty-cell"><Empty description="暂无进项抵扣登记" /></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: 开票抬头信息库 */}
        {activeTab === 'tax_profile' && (
          <div className="finance-profile-grid">
            {taxProfiles.map((prof) => (
              <article
                key={prof.id}
                className="finance-profile"
              >
                <div className="finance-profile-header">
                  <h4>{prof.companyName}</h4>
                  <StatusTag status="已验真" type="success" />
                </div>
                <dl>
                  <dt>纳税人识别号</dt><dd className="finance-tax-id font-mono">{prof.taxId}</dd>
                  <dt>开户银行</dt><dd>{prof.bankName || '—'}</dd>
                  <dt>银行账号</dt><dd className="font-mono">{prof.bankAccount || '—'}</dd>
                  <dt>地址及电话</dt><dd>{prof.addressPhone || '—'}</dd>
                </dl>
              </article>
            ))}
            {!taxProfiles.length && <div className="col-span-full py-8"><Empty description="暂无开票抬头资料" /></div>}
          </div>
        )}
      </div>

      {/* Modal: 新建开票申请 */}
      <Modal
        isOpen={showInvoiceModal}
        className="finance-dialog"
        onClose={() => setShowInvoiceModal(false)}
        title="发起开票申请"
        maxWidth="md"
      >
        <form onSubmit={handleCreateInvoice} className="finance-form">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">开票类别</label>
            <select
              aria-label="开票类别"
              value={newInvoiceForm.category}
              onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, category: e.target.value })}
              className="finance-input"
            >
              <option value="增值税专用发票">增值税专用发票 (13% / 6%)</option>
              <option value="增值税普通发票">增值税普通发票</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">购方开票抬头 / 客户全称</label>
            <input
              type="text"
              aria-label="购方开票抬头 / 客户全称"
              required
              placeholder="如：国家电网华东分部"
              onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, customerName: e.target.value })}
              className="finance-input"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">开票含税总金额 (元)</label>
            <input
              type="number"
              aria-label="开票含税总金额 (元)"
              required
              placeholder="例如：500000"
              onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, amount: Number(e.target.value) })}
              className="finance-input"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">关联合同编号</label>
            <input
              type="text"
              aria-label="关联合同编号"
              placeholder="如：SC-CT-2026-089"
              onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, relatedContractCode: e.target.value })}
              className="finance-input"
            />
          </div>
          <div className="finance-form-footer">
            <button type="button" onClick={() => setShowInvoiceModal(false)} className="finance-action">取消</button>
            <button type="submit" className="finance-action finance-action-primary">提交财务开票</button>
          </div>
        </form>
      </Modal>

      {/* Modal: 录入开票抬头信息 */}
      <Modal
        isOpen={showProfileModal}
        className="finance-dialog"
        onClose={() => setShowProfileModal(false)}
        title="录入企业开票抬头资质"
        maxWidth="md"
      >
        <form onSubmit={handleCreateProfile} className="finance-form">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">企业全称</label>
            <input
              type="text"
              aria-label="企业全称"
              required
              placeholder="如：南京师创智联科技有限公司"
              onChange={(e) => setNewProfileForm({ ...newProfileForm, companyName: e.target.value })}
              className="finance-input"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">统一社会信用代码 / 税号</label>
            <input
              type="text"
              aria-label="统一社会信用代码 / 税号"
              required
              placeholder="18位纳税人识别号"
              onChange={(e) => setNewProfileForm({ ...newProfileForm, taxId: e.target.value })}
              className="finance-input"
            />
          </div>
          <div className="finance-form-grid">
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">开户银行</label>
              <input
                type="text"
                aria-label="开户银行"
                placeholder="如：招商银行南京分行"
                onChange={(e) => setNewProfileForm({ ...newProfileForm, bankName: e.target.value })}
                className="finance-input"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">银行卡账号</label>
              <input
                type="text"
                aria-label="银行卡账号"
                placeholder="例如：6222 0210 1022..."
                onChange={(e) => setNewProfileForm({ ...newProfileForm, bankAccount: e.target.value })}
                className="finance-input"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">公司注册地址及电话</label>
            <input
              type="text"
              aria-label="公司注册地址及电话"
              placeholder="南京市江宁区紫金研创中心 A座 (025-88886666)"
              onChange={(e) => setNewProfileForm({ ...newProfileForm, addressPhone: e.target.value })}
              className="finance-input"
            />
          </div>
          <div className="finance-form-footer">
            <button type="button" onClick={() => setShowProfileModal(false)} className="finance-action">取消</button>
            <button type="submit" className="finance-action finance-action-primary">保存资质档案</button>
          </div>
        </form>
      </Modal>
    </div>
    </ComprehensivePage>
  );
};

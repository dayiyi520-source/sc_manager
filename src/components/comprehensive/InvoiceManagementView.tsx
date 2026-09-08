import React, { useState } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  FileText, 
  Building2, 
  DollarSign, 
  CreditCard,
  Building
} from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Modal, Drawer } from '../common/UIComponents';
import { useApp } from '../../context/AppContext';
import { InvoiceRecord, TaxProfile } from '../../types';

export const InvoiceManagementView: React.FC = () => {
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'sales' | 'purchase' | 'tax_profile'>('sales');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Mock Invoices
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([
    { id: '1', invoiceNo: 'INV-20260901-01', type: '销项', category: '增值税专用发票', customerName: '国家电网华东分部数智调度中心', amount: 1200000, taxRate: '6%', taxAmount: 7200, applyDate: '2026-09-01', status: '开票中', applicant: '张伟', relatedContractCode: 'SC-CT-2026-089' },
    { id: '2', invoiceNo: 'INV-20260825-02', type: '销项', category: '增值税普通发票', customerName: '南京市第一中学', amount: 480000, taxRate: '6%', taxAmount: 28800, applyDate: '2026-08-25', status: '已开具', applicant: '李娜', relatedContractCode: 'SC-CT-2026-042' },
    { id: '3', invoiceNo: 'INV-20260820-03', type: '进项', category: '增值税专用发票', customerName: '戴尔(中国)有限公司', amount: 42500, taxRate: '13%', taxAmount: 5525, applyDate: '2026-08-20', status: '已校验归档', applicant: '陈杰', relatedContractCode: 'PO-20260901-01' },
  ]);

  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([
    { id: '1', companyName: '国家电网有限公司华东分部', taxId: '91320100MA1X2Y3Z98', bankName: '中国工商银行南京市新街口支行', bankAccount: '4301 0200 1920 0182 391', addressPhone: '南京市玄武区中山东路100号 (025-88889999)' },
    { id: '2', companyName: '南京市第一中学', taxId: '12320100425892109X', bankName: '中国建设银行南京市湖南路支行', bankAccount: '3200 1880 0010 5289 101', addressPhone: '南京市秦淮区中山南路301号 (025-83210000)' },
  ]);

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
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="开票总额 (销项)"
          value="¥ 1,680,000"
          subText="税率 6% 开票状态良好"
          icon={<Receipt className="w-5 h-5" />}
          iconBgColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
          onClick={() => setActiveTab('sales')}
        />
        <StatCard
          title="已验真进项发票"
          value="¥ 42,500"
          subText="可抵扣税额 ¥ 5,525"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          onClick={() => setActiveTab('purchase')}
        />
        <StatCard
          title="合作开票抬头库"
          value={`${taxProfiles.length} 企`}
          subText="资质纳税识别号已核验"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-purple-500/10 text-purple-400 border border-purple-500/20"
          onClick={() => setActiveTab('tax_profile')}
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-5 shadow-sm space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'sales'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              销项开票申请
            </button>
            <button
              onClick={() => setActiveTab('purchase')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'purchase'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              进项抵扣登记
            </button>
            <button
              onClick={() => setActiveTab('tax_profile')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'tax_profile'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              开票抬头信息库
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="px-3.5 py-1.5 bg-[var(--warning)] text-black hover:bg-[var(--accent-gold-hover)] font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新建开票申请
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className="px-3.5 py-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-main)] font-medium rounded-md text-xs flex items-center gap-1.5 transition-colors border border-[var(--border-main)] shadow-sm"
            >
              <Plus className="w-4 h-4" />
              录入抬头资料
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
              placeholder="搜索发票单号、抬头名称、关联合同号、申请人..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
        </div>

        {/* Tab 1: 销项开票 */}
        {activeTab === 'sales' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                      <td className="py-3 px-3 font-bold text-white">¥ {inv.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.taxRate} (¥{inv.taxAmount})</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.relatedContractCode}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.applicant}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{inv.applyDate}</td>
                      <td className="py-3 px-3"><StatusTag status={inv.status} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 进项抵扣登记 */}
        {activeTab === 'purchase' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                      <td className="py-3 px-3 font-bold text-white">¥ {inv.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">¥ {inv.taxAmount.toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.relatedContractCode}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.applicant}</td>
                      <td className="py-3 px-3"><StatusTag status={inv.status} type="success" /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: 开票抬头信息库 */}
        {activeTab === 'tax_profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taxProfiles.map((prof) => (
              <div
                key={prof.id}
                className="p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg space-y-2 text-xs"
              >
                <div className="flex justify-between items-center pb-2 border-b border-[var(--border-main)]">
                  <h4 className="font-semibold text-white text-sm">{prof.companyName}</h4>
                  <StatusTag status="已验真" type="success" />
                </div>
                <p><span className="text-[var(--text-muted)]">纳税人识别号:</span> <span className="font-mono text-[var(--warning)] font-bold">{prof.taxId}</span></p>
                <p><span className="text-[var(--text-muted)]">开户银行:</span> {prof.bankName}</p>
                <p><span className="text-[var(--text-muted)]">银行账号:</span> <span className="font-mono text-[var(--text-primary)]">{prof.bankAccount}</span></p>
                <p><span className="text-[var(--text-muted)]">地址及电话:</span> {prof.addressPhone}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: 新建开票申请 */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        title="发起开票申请"
        maxWidth="md"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">开票类别</label>
            <select
              value={newInvoiceForm.category}
              onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, category: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="增值税专用发票">增值税专用发票 (13% / 6%)</option>
              <option value="增值税普通发票">增值税普通发票</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">购方开票抬头 / 客户全称</label>
            <input
              type="text"
              required
              placeholder="如：国家电网华东分部"
              onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, customerName: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">开票含税总金额 (元)</label>
            <input
              type="number"
              required
              placeholder="例如：500000"
              onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">关联合同编号</label>
            <input
              type="text"
              placeholder="如：SC-CT-2026-089"
              onChange={(e) => setNewInvoiceForm({ ...newInvoiceForm, relatedContractCode: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowInvoiceModal(false)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
            <button type="submit" className="px-3.5 py-1.5 bg-[var(--warning)] text-black font-semibold rounded-md hover:bg-[var(--accent-gold-hover)]">提交财务开票</button>
          </div>
        </form>
      </Modal>

      {/* Modal: 录入开票抬头信息 */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="录入企业开票抬头资质"
        maxWidth="md"
      >
        <form onSubmit={handleCreateProfile} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">企业全称</label>
            <input
              type="text"
              required
              placeholder="如：南京师创智联科技有限公司"
              onChange={(e) => setNewProfileForm({ ...newProfileForm, companyName: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">统一社会信用代码 / 税号</label>
            <input
              type="text"
              required
              placeholder="18位纳税人识别号"
              onChange={(e) => setNewProfileForm({ ...newProfileForm, taxId: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">开户银行</label>
              <input
                type="text"
                placeholder="如：招商银行南京分行"
                onChange={(e) => setNewProfileForm({ ...newProfileForm, bankName: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">银行卡账号</label>
              <input
                type="text"
                placeholder="例如：6222 0210 1022..."
                onChange={(e) => setNewProfileForm({ ...newProfileForm, bankAccount: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">公司注册地址及电话</label>
            <input
              type="text"
              placeholder="南京市江宁区紫金研创中心 A座 (025-88886666)"
              onChange={(e) => setNewProfileForm({ ...newProfileForm, addressPhone: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowProfileModal(false)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
            <button type="submit" className="px-3.5 py-1.5 bg-[var(--warning)] text-black font-semibold rounded-md hover:bg-[var(--accent-gold-hover)]">保存资质档案</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

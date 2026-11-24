import React, { useState } from 'react';
import { 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  Plus, 
  Search, 
  Building2, 
  ArrowRightLeft,
} from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
import { useApp } from '../../context/AppContext';
import { ProcurementItem } from '../../types';
import { loadProcurementItems, saveProcurementItems } from '../../services/procurementRepository';
import './finance-management.css';

export const ProcurementManagementView: React.FC = () => {
  const { addToast, projects } = useApp();

  const [activeTab, setActiveTab] = useState<'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showItemModal, setShowItemModal] = useState(false);

  // 当前数据库快照没有采购相关表，演示初始状态保持为空。
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>(() => loadProcurementItems());
  const projectProcurementItems = procurementItems.filter((item) => projects.some((project) =>
    item.projectId ? project.id === item.projectId : project.name === (item.projectName || item.relatedProject)
  ));
  const procurementAmount = projectProcurementItems.reduce((sum, item) => sum + item.amount, 0);
  const pendingApplyCount = projectProcurementItems.filter((item) => item.status === '待审批').length;

  // Form states
  const [newItemForm, setNewItemForm] = useState({ type: '硬件设备', supplier: '', description: '', amount: 10000, projectId: '', relatedCustomer: '', relatedProject: '' });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    const project = projects.find((item) => item.id === newItemForm.projectId);
    if (!project) { addToast('error', '无法创建项目采购', '请选择关联项目'); return; }
    const item: ProcurementItem = {
      id: Date.now().toString(),
      code: `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*90+10)}`,
      type: newItemForm.type as any,
      supplier: newItemForm.supplier || '未指定供应商',
      description: newItemForm.description || '采购物品说明',
      amount: Number(newItemForm.amount) || 0,
      status: '待审批',
      projectId: project.id,
      projectName: project.name,
      customerId: project.customerId,
      customerName: project.customerName,
      relatedCustomer: project.customerName,
      relatedProject: project.name,
      orderTime: new Date().toISOString().slice(0,10)
    };
    const nextItems = [item, ...procurementItems];
    setProcurementItems(nextItems);
    saveProcurementItems(nextItems);
    setShowItemModal(false);
    addToast('success', '采购单建档成功', `单号：${item.code}`);
  };

  return (
    <ComprehensivePage title="项目采购" description="管理项目采购、采购审批入口及入库登记" icon={<ShoppingBag className="w-5 h-5" />} hideHeader>
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="本月采购单数"
          value={projectProcurementItems.length + ' 单'}
          subText="项目采购单数"
          icon={<ShoppingBag className="w-5 h-5" />}
          iconBgColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
          onClick={() => setActiveTab('list')}
        />
        <StatCard
          title="采购总金额"
          value={`¥ ${procurementAmount.toLocaleString()}`}
          subText="采购金额合计"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          onClick={() => setActiveTab('list')}
        />
        <StatCard
          title="待审批采购单"
          value={`${pendingApplyCount} 件`}
          subText="待审批申请"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-500/10 text-amber-400 border border-amber-500/20"
          onClick={() => setActiveTab('list')}
        />
        <StatCard
          title="关联项目数"
          value={new Set(projectProcurementItems.map((item) => projects.find((project) => item.projectId ? project.id === item.projectId : project.name === (item.projectName || item.relatedProject))?.id).filter(Boolean)).size}
          unit="个"
          subText="有项目归属的采购"
          icon={<Building2 className="w-5 h-5" />}
          iconBgColor="bg-sky-500/10 text-sky-400 border border-sky-500/20"
          onClick={() => setActiveTab('list')}
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-5 shadow-sm space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              项目采购
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowItemModal(true)}
              className="px-3.5 py-1.5 bg-[var(--warning)] text-black hover:bg-[var(--accent-gold-hover)] font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新建采购单
            </button>
            <button
              type="button"
              onClick={() => addToast('info', '第三方采购审批入口', '第三方审批接口尚未接入，当前仅保留入口。')}
              className="px-3.5 py-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-main)] font-medium rounded-md text-xs flex items-center gap-1.5 transition-colors border border-[var(--border-main)] shadow-sm"
            >
              <ArrowRightLeft className="w-4 h-4" />
              发起采购审批
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
              placeholder="搜索编号、供应商、商品描述或关联客户..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
        </div>

        {/* Tab 1: 采购列表 */}
        {activeTab === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">采购单号</th>
                  <th className="py-3 px-3">类型</th>
                  <th className="py-3 px-3">供应商</th>
                  <th className="py-3 px-3">物品说明</th>
                  <th className="py-3 px-3">金额</th>
                  <th className="py-3 px-3">关联客户</th>
                  <th className="py-3 px-3">关联项目</th>
                  <th className="py-3 px-3">下单时间</th>
                  <th className="py-3 px-3">状态</th>
                  <th className="py-3 px-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {projectProcurementItems
                  .filter((p) => [p.code, p.supplier, p.description, p.customerName, p.relatedCustomer, p.projectName, p.relatedProject].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{item.code}</td>
                      <td className="py-3 px-3"><StatusTag status={item.type} type="info" /></td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{item.supplier}</td>
                      <td className="py-3 px-3 text-[var(--text-body)] max-w-xs truncate">{item.description}</td>
                      <td className="py-3 px-3 font-bold text-white">¥ {item.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{item.relatedCustomer}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{item.relatedProject}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{item.orderTime}</td>
                      <td className="py-3 px-3"><StatusTag status={item.status} /></td>
                      <td className="py-3 px-3 text-right text-[var(--text-muted)]">—</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: 新建采购单 */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        className="finance-dialog"
        title="新建项目采购单"
        maxWidth="md"
      >
        <form onSubmit={handleCreateItem} className="finance-form">
          <div>
            <label>采购分类类型</label>
            <select
              value={newItemForm.type}
              onChange={(e) => setNewItemForm({ ...newItemForm, type: e.target.value })}
              className="finance-input"
            >
              <option value="硬件设备">硬件设备</option>
              <option value="软件授权">软件授权</option>
              <option value="办公用品">办公用品</option>
              <option value="耗材">耗材</option>
            </select>
          </div>
          <div>
            <label>供应商名称</label>
            <input
              type="text"
              required
              placeholder="如：戴尔(中国)有限公司"
              onChange={(e) => setNewItemForm({ ...newItemForm, supplier: e.target.value })}
              className="finance-input"
            />
          </div>
          <div>
            <label>物品说明及规格</label>
            <input
              type="text"
              required
              placeholder="如：服务器工作站 / 显示器"
              onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
              className="finance-input"
            />
          </div>
          <div>
            <label>采购金额 (元)</label>
            <input
              type="number"
              required
              placeholder="例如：25000"
              onChange={(e) => setNewItemForm({ ...newItemForm, amount: Number(e.target.value) })}
              className="finance-input"
            />
          </div>
          <div>
            <label>关联项目 *</label>
            <select
              aria-label="关联项目"
              required
              value={newItemForm.projectId}
              onChange={(e) => { const project = projects.find((item) => item.id === e.target.value); setNewItemForm({ ...newItemForm, projectId: e.target.value, relatedProject: project?.name || '', relatedCustomer: project?.customerName || '' }); }}
              className="finance-input"
            >
              <option value="">请选择项目</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div>
            <label>关联客户</label>
            <input aria-label="关联客户" readOnly value={newItemForm.relatedCustomer} className="finance-input" placeholder="选择项目后自动带出" />
          </div>
          <div className="finance-form-footer">
            <button type="button" onClick={() => setShowItemModal(false)} className="finance-action">取消</button>
            <button type="submit" className="finance-action finance-action-primary">生成采购单</button>
          </div>
        </form>
      </Modal>
    </div>
    </ComprehensivePage>
  );
};

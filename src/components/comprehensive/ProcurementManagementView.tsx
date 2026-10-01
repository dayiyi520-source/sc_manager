import React, { useState } from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  PackageCheck, 
  CheckCircle2, 
  X, 
  Building2, 
  ArrowRightLeft,
  FileSpreadsheet,
  Box,
  FileText
} from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Modal, Drawer } from '../common/UIComponents';
import { useApp } from '../../context/AppContext';
import { ProcurementItem, ProcurementApply, InboundRecord } from '../../types';

export const ProcurementManagementView: React.FC = () => {
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'list' | 'apply' | 'inbound'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedItemForInbound, setSelectedItemForInbound] = useState<ProcurementItem | null>(null);

  // 当前数据库快照没有采购相关表，演示初始状态保持为空。
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);
  const [procurementApplies, setProcurementApplies] = useState<ProcurementApply[]>([]);
  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>([]);
  const procurementAmount = procurementItems.reduce((sum, item) => sum + item.amount, 0);
  const pendingApplyCount = procurementApplies.filter((item) => item.status === '待审批').length;

  // Form states
  const [newItemForm, setNewItemForm] = useState({ type: '硬件设备', supplier: '', description: '', amount: 10000, relatedCustomer: '', relatedProject: '' });
  const [newApplyForm, setNewApplyForm] = useState({ title: '', type: '硬件设备', applicant: '当前用户', amount: 5000, relatedCustomer: '', relatedProject: '' });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: ProcurementItem = {
      id: Date.now().toString(),
      code: `PO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*90+10)}`,
      type: newItemForm.type as any,
      supplier: newItemForm.supplier || '未指定供应商',
      description: newItemForm.description || '采购物品说明',
      amount: Number(newItemForm.amount) || 0,
      status: '待审批',
      relatedCustomer: newItemForm.relatedCustomer || '常规采购',
      relatedProject: newItemForm.relatedProject || '通用项目',
      orderTime: new Date().toISOString().slice(0,10)
    };
    setProcurementItems([item, ...procurementItems]);
    setShowItemModal(false);
    addToast('success', '采购单建档成功', `单号：${item.code}`);
  };

  const handleCreateApply = (e: React.FormEvent) => {
    e.preventDefault();
    const apply: ProcurementApply = {
      id: Date.now().toString(),
      code: `PA-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*90+10)}`,
      title: newApplyForm.title || '采购申请',
      type: newApplyForm.type,
      applicant: newApplyForm.applicant,
      amount: Number(newApplyForm.amount) || 0,
      relatedCustomer: newApplyForm.relatedCustomer || '校企合作',
      relatedProject: newApplyForm.relatedProject || '自研开发',
      status: '待审批'
    };
    setProcurementApplies([apply, ...procurementApplies]);
    setShowApplyModal(false);
    addToast('success', '采购申请已提交', `申请编号：${apply.code}`);
  };

  // Perform Inbound & Auto Transfer to Asset Management
  const handleInboundAction = (item: ProcurementItem) => {
    const inboundCode = `IN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*90+10)}`;
    const newInbound: InboundRecord = {
      id: Date.now().toString(),
      inboundCode,
      purchaseCode: item.code,
      itemName: item.description,
      quantity: 1,
      inboundTime: new Date().toLocaleString(),
      registrar: '管理员',
      transferredToAsset: true
    };

    setInboundRecords([newInbound, ...inboundRecords]);
    setProcurementItems(procurementItems.map(p => p.id === item.id ? { ...p, status: '已入库' } : p));
    setSelectedItemForInbound(null);

    // Dynamic Linking Toast
    addToast('success', `采购单 [${item.code}] 已完成入库，已自动导入【资产管理】!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="本月采购单数"
          value={`${procurementItems.length} 单`}
          subText="当前快照采购单"
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
          onClick={() => setActiveTab('apply')}
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
              采购列表
            </button>
            <button
              onClick={() => setActiveTab('apply')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'apply'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              采购申请
            </button>
            <button
              onClick={() => setActiveTab('inbound')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'inbound'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              入库登记与资产联动
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
              onClick={() => setShowApplyModal(true)}
              className="px-3.5 py-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-main)] font-medium rounded-md text-xs flex items-center gap-1.5 transition-colors border border-[var(--border-main)] shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新建采购申请
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
                {procurementItems
                  .filter((p) => p.code.includes(searchQuery) || p.supplier.includes(searchQuery) || p.description.includes(searchQuery))
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
                      <td className="py-3 px-3 text-right">
                        {item.status === '已到货' && (
                          <button 
                            onClick={() => setSelectedItemForInbound(item)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition inline-flex items-center gap-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5" /> 入库登记
                          </button>
                        )}
                        {item.status === '已入库' && (
                          <span className="text-[10px] text-emerald-400 font-mono">已转资产台账</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 采购申请 */}
        {activeTab === 'apply' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">申请单号</th>
                  <th className="py-3 px-3">申请标题</th>
                  <th className="py-3 px-3">分类类型</th>
                  <th className="py-3 px-3">申请人</th>
                  <th className="py-3 px-3">预算金额</th>
                  <th className="py-3 px-3">关联客户</th>
                  <th className="py-3 px-3">关联项目</th>
                  <th className="py-3 px-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {procurementApplies.map((apply) => (
                  <tr key={apply.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{apply.code}</td>
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{apply.title}</td>
                    <td className="py-3 px-3"><StatusTag status={apply.type} type="info" /></td>
                    <td className="py-3 px-3 text-[var(--text-body)]">{apply.applicant}</td>
                    <td className="py-3 px-3 font-bold text-[var(--warning)]">¥ {apply.amount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{apply.relatedCustomer}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{apply.relatedProject}</td>
                    <td className="py-3 px-3"><StatusTag status={apply.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: 入库列表 */}
        {activeTab === 'inbound' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">入库单号</th>
                  <th className="py-3 px-3">关联采购单</th>
                  <th className="py-3 px-3">入库物品</th>
                  <th className="py-3 px-3">数量</th>
                  <th className="py-3 px-3">入库时间</th>
                  <th className="py-3 px-3">登记人</th>
                  <th className="py-3 px-3">资产同步</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {inboundRecords.map((inb) => (
                  <tr key={inb.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inb.inboundCode}</td>
                    <td className="py-3 px-3 font-mono text-[var(--text-body)]">{inb.purchaseCode}</td>
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{inb.itemName}</td>
                    <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{inb.quantity} 件</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{inb.inboundTime}</td>
                    <td className="py-3 px-3 text-[var(--text-body)]">{inb.registrar}</td>
                    <td className="py-3 px-3">
                      <StatusTag status="已导入资产台账" type="success" />
                    </td>
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
        title="新建采购单"
        maxWidth="md"
      >
        <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">采购分类类型</label>
            <select
              value={newItemForm.type}
              onChange={(e) => setNewItemForm({ ...newItemForm, type: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="硬件设备">硬件设备</option>
              <option value="软件授权">软件授权</option>
              <option value="办公用品">办公用品</option>
              <option value="耗材">耗材</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">供应商名称</label>
            <input
              type="text"
              required
              placeholder="如：戴尔(中国)有限公司"
              onChange={(e) => setNewItemForm({ ...newItemForm, supplier: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">物品说明及规格</label>
            <input
              type="text"
              required
              placeholder="如：服务器工作站 / 显示器"
              onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">采购金额 (元)</label>
            <input
              type="number"
              required
              placeholder="例如：25000"
              onChange={(e) => setNewItemForm({ ...newItemForm, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">关联目标客户 (选填)</label>
            <input
              type="text"
              placeholder="如：南京市第一中学"
              onChange={(e) => setNewItemForm({ ...newItemForm, relatedCustomer: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowItemModal(false)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
            <button type="submit" className="px-3.5 py-1.5 bg-[var(--warning)] text-black font-semibold rounded-md hover:bg-[var(--accent-gold-hover)]">生成采购单</button>
          </div>
        </form>
      </Modal>

      {/* Modal: 新建采购申请 */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="新建采购申请"
        maxWidth="md"
      >
        <form onSubmit={handleCreateApply} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">申请标题</label>
            <input
              type="text"
              required
              placeholder="例如：研发设备扩容申请"
              onChange={(e) => setNewApplyForm({ ...newApplyForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">物品分类</label>
            <select
              value={newApplyForm.type}
              onChange={(e) => setNewApplyForm({ ...newApplyForm, type: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="硬件设备">硬件设备</option>
              <option value="软件授权">软件授权</option>
              <option value="办公用品">办公用品</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">预计金额 (元)</label>
            <input
              type="number"
              required
              placeholder="例：12000"
              onChange={(e) => setNewApplyForm({ ...newApplyForm, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowApplyModal(false)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
            <button type="submit" className="px-3.5 py-1.5 bg-[var(--warning)] text-black font-semibold rounded-md hover:bg-[var(--accent-gold-hover)]">提交审批</button>
          </div>
        </form>
      </Modal>

      {/* Drawer: 执行入库登记 & 自动转入资产 */}
      <Drawer
        isOpen={!!selectedItemForInbound}
        onClose={() => setSelectedItemForInbound(null)}
        title="入库登记与资产联动确认"
        subtitle={selectedItemForInbound ? selectedItemForInbound.code : ''}
        width="max-w-md"
      >
        {selectedItemForInbound && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg space-y-2">
              <p><span className="text-[var(--text-muted)]">采购单号:</span> <span className="font-mono text-[var(--text-primary)] font-medium">{selectedItemForInbound.code}</span></p>
              <p><span className="text-[var(--text-muted)]">物品名称:</span> <span className="font-semibold text-white">{selectedItemForInbound.description}</span></p>
              <p><span className="text-[var(--text-muted)]">供应商:</span> {selectedItemForInbound.supplier}</p>
              <p><span className="text-[var(--text-muted)]">采购总额:</span> <span className="font-bold text-[var(--warning)]">¥ {selectedItemForInbound.amount.toLocaleString()}</span></p>
            </div>
            <div className="p-3 bg-[color-mix(in_srgb,var(--primary)_10%,var(--bg-surface))] border border-[color-mix(in_srgb,var(--primary)_30%,var(--border-main))] rounded-lg text-xs text-[var(--active-text)] flex items-start gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>确认入库后，系统将自动把该物品转入<b>【资产管理-资产台账】</b>，并初始化资产卡片。</span>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setSelectedItemForInbound(null)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
              <button onClick={() => handleInboundAction(selectedItemForInbound)} className="px-3.5 py-1.5 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700">确认入库并导入资产台账</button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

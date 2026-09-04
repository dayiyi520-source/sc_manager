import React, { useState } from 'react';
import { 
  Box, 
  Layers, 
  RotateCcw, 
  Wrench, 
  Plus, 
  Search, 
  Filter, 
  QrCode, 
  Building2, 
  UserCheck, 
  FileCheck2, 
  ArrowRightLeft,
  Calendar,
  DollarSign
} from 'lucide-react';
import { StatCard, StatusTag, Modal, Drawer } from '../common/UIComponents';
import { useApp } from '../../context/AppContext';
import { AssetRecord, AssetBorrowLog, AssetMaintenanceRecord } from '../../types';

export const AssetManagementView: React.FC = () => {
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'ledger' | 'borrow' | 'maintenance'>('ledger');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [selectedAssetForMaintenance, setSelectedAssetForMaintenance] = useState<AssetRecord | null>(null);

  // Mock Assets
  const [assets, setAssets] = useState<AssetRecord[]>([
    { id: '1', assetCode: 'AST-2026001', name: 'MacBook Pro 16吋 (M3 Max)', category: '电子设备', brand: 'Apple', model: 'A2992', status: '领用中', holder: '王强', department: '软件研发部', location: '南京总部 A座401', buyDate: '2026-01-10', price: 24999 },
    { id: '2', assetCode: 'AST-2026002', name: '戴尔 4K 27寸专业显示器', category: '电子设备', brand: 'DELL', model: 'U2723QE', status: '空闲', holder: '-', department: '综合管理部', location: '南京总部 B座101库房', buyDate: '2026-02-15', price: 3800 },
    { id: '3', assetCode: 'AST-2026003', name: '华为核心交换机 S5735', category: '网络设备', brand: 'HUAWEI', model: 'S5735-S48T4X', status: '领用中', holder: '张伟', department: '运维保障部', location: '南京总部 核心机房', buyDate: '2026-03-20', price: 18500 },
    { id: '4', assetCode: 'AST-2026004', name: '爱普生彩色激光打印机', category: '办公设备', brand: 'EPSON', model: 'L8058', status: '维修中', holder: '行政部', department: '综合管理部', location: '南京总部 A座前台', buyDate: '2025-11-05', price: 5200 },
  ]);

  const [borrowLogs, setBorrowLogs] = useState<AssetBorrowLog[]>([
    { id: '1', assetCode: 'AST-2026001', assetName: 'MacBook Pro 16吋', borrower: '王强', department: '软件研发部', borrowDate: '2026-01-12', returnDate: '-', status: '使用中', remark: '研发主用电脑' },
    { id: '2', assetCode: 'AST-2026002', assetName: '戴尔 4K 27寸专业显示器', borrower: '吴磊', department: '产品设计部', borrowDate: '2026-02-18', returnDate: '2026-08-30', status: '已归还', remark: 'UAT测试临时借用' },
  ]);

  const [maintenanceRecords, setMaintenanceRecords] = useState<AssetMaintenanceRecord[]>([
    { id: '1', assetCode: 'AST-2026004', assetName: '爱普生彩色激光打印机', issueDescription: '打印出纸夹纸且红墨喷头堵塞', repairCompany: '爱普生官方授权服务中心', cost: 450, startDate: '2026-09-01', expectedEndDate: '2026-09-05', status: '维修中' },
  ]);

  // Form State
  const [newAssetForm, setNewAssetForm] = useState({ name: '', category: '电子设备', brand: '', model: '', price: 5000, holder: '未领用', department: '综合管理部', location: '主库房' });

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const newAsset: AssetRecord = {
      id: Date.now().toString(),
      assetCode: `AST-2026${Math.floor(100 + Math.random() * 900)}`,
      name: newAssetForm.name || '固定资产物品',
      category: newAssetForm.category,
      brand: newAssetForm.brand || '通用',
      model: newAssetForm.model || '标准型号',
      status: newAssetForm.holder && newAssetForm.holder !== '未领用' ? '领用中' : '空闲',
      holder: newAssetForm.holder || '-',
      department: newAssetForm.department,
      location: newAssetForm.location,
      buyDate: new Date().toISOString().slice(0,10),
      price: Number(newAssetForm.price) || 0
    };

    setAssets([newAsset, ...assets]);
    setShowAddModal(false);
    addToast('success', '固定资产建档成功', `资产编号：${newAsset.assetCode}`);
  };

  const handleReturnAsset = (asset: AssetRecord) => {
    setAssets(assets.map(a => a.id === asset.id ? { ...a, status: '空闲', holder: '-' } : a));
    setSelectedAsset(null);
    addToast('success', `资产 [${asset.name}] 归还成功，已移入库房备用。`);
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="固定资产总数"
          value="142 件"
          subText="原值总计 ¥ 1,840,000"
          icon={<Box className="w-5 h-5" />}
          iconBgColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
          onClick={() => setActiveTab('ledger')}
        />
        <StatCard
          title="领用中资产"
          value="118 件"
          subText="资产使用率 83.1%"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          onClick={() => setActiveTab('ledger')}
        />
        <StatCard
          title="闲置可调配"
          value="20 件"
          subText="存放于主库房 Ready 状态"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-purple-500/10 text-purple-400 border border-purple-500/20"
          onClick={() => setActiveTab('ledger')}
        />
        <StatCard
          title="维修保养中"
          value="4 件"
          subText="维保预算追踪正常"
          icon={<Wrench className="w-5 h-5" />}
          iconBgColor="bg-amber-500/10 text-amber-400 border border-amber-500/20"
          onClick={() => setActiveTab('maintenance')}
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-5 shadow-sm space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              资产台账
            </button>
            <button
              onClick={() => setActiveTab('borrow')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'borrow'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              领用归还记录
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'maintenance'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              维修保养
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-[var(--warning)] text-black hover:bg-[var(--accent-gold-hover)] font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新建资产登记
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
              placeholder="搜索资产编号、资产名称、领用人、品牌型号..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-body)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="ALL">全部状态</option>
              <option value="领用中">领用中</option>
              <option value="空闲">空闲</option>
              <option value="维修中">维修中</option>
            </select>
          </div>
        </div>

        {/* Tab 1: 资产台账 */}
        {activeTab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">资产编号</th>
                  <th className="py-3 px-3">资产名称</th>
                  <th className="py-3 px-3">类别</th>
                  <th className="py-3 px-3">品牌 / 型号</th>
                  <th className="py-3 px-3">原值</th>
                  <th className="py-3 px-3">保管/领用人</th>
                  <th className="py-3 px-3">所属部门</th>
                  <th className="py-3 px-3">存放地点</th>
                  <th className="py-3 px-3">状态</th>
                  <th className="py-3 px-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {assets
                  .filter((a) => (statusFilter === 'ALL' || a.status === statusFilter) && (a.name.includes(searchQuery) || a.assetCode.includes(searchQuery) || a.holder.includes(searchQuery)))
                  .map((ast) => (
                    <tr key={ast.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{ast.assetCode}</td>
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{ast.name}</td>
                      <td className="py-3 px-3"><StatusTag status={ast.category} type="info" /></td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{ast.brand} {ast.model}</td>
                      <td className="py-3 px-3 font-bold text-white">¥ {ast.price.toLocaleString()}</td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{ast.holder}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{ast.department}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{ast.location}</td>
                      <td className="py-3 px-3"><StatusTag status={ast.status} /></td>
                      <td className="py-3 px-3 text-right">
                        <button 
                          onClick={() => setSelectedAsset(ast)}
                          className="px-2.5 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-main)] border border-[var(--border-main)] rounded text-xs transition"
                        >
                          详情卡片
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 领用归还日志 */}
        {activeTab === 'borrow' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">资产编号</th>
                  <th className="py-3 px-3">资产名称</th>
                  <th className="py-3 px-3">领用人</th>
                  <th className="py-3 px-3">部门</th>
                  <th className="py-3 px-3">领用日期</th>
                  <th className="py-3 px-3">归还日期</th>
                  <th className="py-3 px-3">备注说明</th>
                  <th className="py-3 px-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {borrowLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{log.assetCode}</td>
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{log.assetName}</td>
                    <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{log.borrower}</td>
                    <td className="py-3 px-3 text-[var(--text-body)]">{log.department}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{log.borrowDate}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{log.returnDate}</td>
                    <td className="py-3 px-3 text-[var(--text-body)] max-w-xs truncate">{log.remark}</td>
                    <td className="py-3 px-3"><StatusTag status={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: 维修保养 */}
        {activeTab === 'maintenance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">资产编号</th>
                  <th className="py-3 px-3">资产名称</th>
                  <th className="py-3 px-3">故障描述</th>
                  <th className="py-3 px-3">维保服务商</th>
                  <th className="py-3 px-3">预估金额</th>
                  <th className="py-3 px-3">送修日期</th>
                  <th className="py-3 px-3">预计修复时间</th>
                  <th className="py-3 px-3">维修状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {maintenanceRecords.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{m.assetCode}</td>
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{m.assetName}</td>
                    <td className="py-3 px-3 text-[var(--text-body)] max-w-xs truncate">{m.issueDescription}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{m.repairCompany}</td>
                    <td className="py-3 px-3 font-bold text-[var(--warning)]">¥ {m.cost.toLocaleString()}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{m.startDate}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{m.expectedEndDate}</td>
                    <td className="py-3 px-3"><StatusTag status={m.status} type="warning" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: 新建资产登记 */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="固定资产建档登记"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">资产名称</label>
            <input
              type="text"
              required
              placeholder="例：戴尔服务器 / 工位办公桌"
              onChange={(e) => setNewAssetForm({ ...newAssetForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">资产类别</label>
            <select
              value={newAssetForm.category}
              onChange={(e) => setNewAssetForm({ ...newAssetForm, category: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="电子设备">电子设备</option>
              <option value="网络设备">网络设备</option>
              <option value="办公设备">办公设备</option>
              <option value="家具设施">家具设施</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">品牌</label>
              <input
                type="text"
                placeholder="例如：Apple / DELL"
                onChange={(e) => setNewAssetForm({ ...newAssetForm, brand: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">型号</label>
              <input
                type="text"
                placeholder="例如：MacBook Pro 16"
                onChange={(e) => setNewAssetForm({ ...newAssetForm, model: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">资产原值金额 (元)</label>
            <input
              type="number"
              required
              placeholder="12000"
              onChange={(e) => setNewAssetForm({ ...newAssetForm, price: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">使用/保管人</label>
              <input
                type="text"
                placeholder="例如：王强 (若无填写'未领用')"
                onChange={(e) => setNewAssetForm({ ...newAssetForm, holder: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">所属部门</label>
              <input
                type="text"
                placeholder="例如：软件研发部"
                onChange={(e) => setNewAssetForm({ ...newAssetForm, department: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
            <button type="submit" className="px-3.5 py-1.5 bg-[var(--warning)] text-black font-semibold rounded-md hover:bg-[var(--accent-gold-hover)]">新建保存</button>
          </div>
        </form>
      </Modal>

      {/* Drawer: 资产卡片详情 */}
      <Drawer
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        title="资产电子卡片与追溯档案"
        subtitle={selectedAsset ? `${selectedAsset.assetCode} - ${selectedAsset.name}` : ''}
        width="max-w-md"
      >
        {selectedAsset && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-main)]">
                <span className="font-mono text-[var(--text-muted)]">{selectedAsset.assetCode}</span>
                <StatusTag status={selectedAsset.status} />
              </div>
              <p><span className="text-[var(--text-muted)]">资产名称:</span> <span className="font-bold text-white">{selectedAsset.name}</span></p>
              <p><span className="text-[var(--text-muted)]">类别/品牌:</span> {selectedAsset.category} / {selectedAsset.brand}</p>
              <p><span className="text-[var(--text-muted)]">型号规格:</span> {selectedAsset.model}</p>
              <p><span className="text-[var(--text-muted)]">采购原值:</span> <span className="font-bold text-[var(--warning)]">¥ {selectedAsset.price.toLocaleString()}</span></p>
              <p><span className="text-[var(--text-muted)]">领用保管人:</span> <span className="font-semibold text-[var(--text-primary)]">{selectedAsset.holder}</span> ({selectedAsset.department})</p>
              <p><span className="text-[var(--text-muted)]">物理存放位置:</span> {selectedAsset.location}</p>
              <p><span className="text-[var(--text-muted)]">入库建档时间:</span> {selectedAsset.buyDate}</p>
            </div>

            {selectedAsset.status === '领用中' && (
              <button
                onClick={() => handleReturnAsset(selectedAsset)}
                className="w-full py-2 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-md font-semibold hover:bg-amber-600/30 transition text-center"
              >
                退还入库 (办退手续)
              </button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

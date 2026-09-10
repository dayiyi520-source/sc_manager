import React, { useEffect, useState } from 'react';
import {
  Award,
  Search,
  Filter,
  Plus,
  Building,
  DollarSign,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  FileText,
  Paperclip,
  CheckCircle2,
  Clock,
  Edit,
  ArrowRight,
  MessageSquare,
  History,
  FileCheck2,
  Send,
  Layers,
  Sparkles,
  Check,
  TrendingUp,
  Briefcase,
  Share2,
  ListTodo
} from '@/components/common/octicons-compat';
import { useAppCrm } from '../../hooks/useAppCrm';
import { crmRepository } from '../../services/crmRepository';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { WinningEngagement, WinningEngagementCommRecord } from '../../types';

export const CRMWinningEngagementView: React.FC = () => {
  const { openPageTab, addToast, winningEngagements: remoteEngagements } = useAppCrm();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Initial Mock Data: Winning Engagements (Source: 招投标中标赢单自动流转)
  const [engagements, setEngagements] = useState<WinningEngagement[]>([
    {
      id: 'win-801',
      bidCode: 'BID-2026-0801',
      projectName: '清华大学AI人工智能实训平台二期采购项目',
      customerName: '清华大学',
      ownerName: '周市场',
      amount: 4800000,
      status: '需求沟通',
      expectedSignDate: '2026-09-20',
      bidNoticeDoc: '清华大学AI实训二期中标通知书(盖章版).pdf',
      commRecords: [
        {
          id: 'comm-1',
          time: '2026-08-30 14:00',
          operator: '周市场',
          title: '中标后首次进校需求与实施对接会',
          content: '与计算机系主任及信息中心举行了中标答谢与首次现场接洽会。',
          keyRequirements: '对方希望在10月初完成64节点GPU实训环境的初始化部署，并安排2次教师大模型微调教学培训。'
        },
        {
          id: 'comm-2',
          time: '2026-09-01 10:30',
          operator: '张技术',
          title: '信创算力架构细节研讨',
          content: '技术团队针对算力调度软件与系内原有服务器互通进行了深度排查。',
          keyRequirements: '确定需要开通专网双向端口，并提供统一身份认证Single Sign-On接口。'
        }
      ],
      timeline: [
        { id: 'tl-1', time: '2026-08-28 16:00', title: '中标公告发布', desc: '系统检测招投标状态变更为【中标赢单】，自动触发流转创建中标接洽任务', type: 'notice' },
        { id: 'tl-2', time: '2026-08-30 14:00', title: '首次接洽沟通', desc: '商务经理周市场赴清华大学与项目负责人进行需求交底', type: 'meeting' },
        { id: 'tl-3', time: '2026-09-01 10:30', title: '技术架构现场核验', desc: '架构师张技术出具初步网络与端口拓扑图', type: 'scheme' }
      ],
      relatedFiles: [
        { title: '清华大学AI实训二期中标通知书(盖章版).pdf', url: '#', size: '2.4MB' },
        { title: 'AI实训二期实施技术方案(初稿).docx', url: '#', size: '5.1MB' },
        { title: '清华大学政府采购合同草案(商务条款).pdf', url: '#', size: '1.8MB' }
      ],
      createdAt: '2026-08-28'
    },
    {
      id: 'win-802',
      bidCode: 'BID-2026-0802',
      projectName: '北京大学教务处校企合作实训基地建设项目',
      customerName: '北京大学',
      ownerName: '周市场',
      amount: 3200000,
      status: '方案确认',
      expectedSignDate: '2026-09-15',
      bidNoticeDoc: '北京大学校企合作实训基地中标通知书.pdf',
      commRecords: [
        {
          id: 'comm-10',
          time: '2026-08-29 15:00',
          operator: '周市场',
          title: '方案终稿审核与合同条款预审',
          content: '教务处处长已审核通过实施计划书，商务合同条款交由校法务审阅。',
          keyRequirements: '需补充明确3年免费维保承诺及二次开发接口文档。'
        }
      ],
      timeline: [
        { id: 'tl-10', time: '2026-08-25 10:00', title: '中标确认', desc: '招投标系统自动推送【中标赢单】记录', type: 'notice' },
        { id: 'tl-11', time: '2026-08-29 15:00', title: '方案确认会', desc: '校方对产教融合实训平台方案予以审定确认', type: 'scheme' }
      ],
      relatedFiles: [
        { title: '北京大学校企合作实训基地中标通知书.pdf', url: '#', size: '1.9MB' },
        { title: '产教融合实训平台终版实施方案.pdf', url: '#', size: '8.4MB' }
      ],
      createdAt: '2026-08-25'
    },
    {
      id: 'win-803',
      bidCode: 'BID-2026-0803',
      projectName: '浙江大学信息中心智慧校园AI大模型教研实训方案采购',
      customerName: '浙江大学',
      ownerName: '陈销售',
      amount: 6800000,
      status: '待签约',
      expectedSignDate: '2026-09-10',
      bidNoticeDoc: '浙江大学智慧校园中标通知书.pdf',
      commRecords: [
        {
          id: 'comm-20',
          time: '2026-09-02 09:30',
          operator: '陈销售',
          title: '合同签署印章流程走流程',
          content: '对方印章流程已发起，预计本周五前盖章挂网公布。',
          keyRequirements: '定金首付款按4:4:2方式分期支付。'
        }
      ],
      timeline: [
        { id: 'tl-20', time: '2026-08-20 11:00', title: '中标归档', desc: '中标赢单自动流转入接洽列表', type: 'notice' },
        { id: 'tl-21', time: '2026-09-02 09:30', title: '拟定合同挂网', desc: '双方完成合同商务与技术条款双审', type: 'contract' }
      ],
      relatedFiles: [
        { title: '浙江大学智慧校园中标通知书.pdf', url: '#', size: '3.1MB' },
        { title: '采购合同草案(待双签).pdf', url: '#', size: '2.2MB' }
      ],
      createdAt: '2026-08-20'
    },
    {
      id: 'win-804',
      bidCode: 'BID-2026-0705',
      projectName: '复旦大学软件学院新一代工业软件与AI实训环境',
      customerName: '复旦大学',
      ownerName: '陈销售',
      amount: 5500000,
      status: '已签约',
      expectedSignDate: '2026-08-30',
      bidNoticeDoc: '复旦大学工业软件实训中标通知书.pdf',
      isTransferredToDelivery: true,
      isTransferredToReqPool: true,
      commRecords: [
        {
          id: 'comm-30',
          time: '2026-08-30 16:00',
          operator: '陈销售',
          title: '正式合同盖章签约完成',
          content: '合同已正式签订归档，项目自动流转至【项目交付】，并在【需求池】自动生成产品实施任务。',
          keyRequirements: '交付团队已接管现场，9月10日前交付首期软件授权。'
        }
      ],
      timeline: [
        { id: 'tl-30', time: '2026-08-15 09:00', title: '中标发布', desc: '中标赢单记录生成', type: 'notice' },
        { id: 'tl-31', time: '2026-08-30 16:00', title: '正式签约', desc: '已完成合同盖章归档，联动流转项目交付与产品需求池', type: 'system' }
      ],
      relatedFiles: [
        { title: '复旦大学工业软件实训双签合同(最终版).pdf', url: '#', size: '4.5MB' }
      ],
      createdAt: '2026-08-15'
    }
  ]);
  useEffect(() => {
    if (remoteEngagements.length) setEngagements(remoteEngagements);
  }, [remoteEngagements]);

  // Selected Engagement for Drawer View
  const [selectedEng, setSelectedEng] = useState<WinningEngagement | null>(null);

  // Form State: Add Communication Record inside Drawer
  const [isAddCommOpen, setIsAddCommOpen] = useState(false);
  const [commTitle, setCommTitle] = useState('');
  const [commContent, setCommContent] = useState('');
  const [commKeyReq, setCommKeyReq] = useState('');

  // Stats
  const ongoingCount = engagements.filter((e) => e.status !== '已签约').length;
  const schemeConfirmCount = engagements.filter((e) => e.status === '方案确认').length;
  const pendingSignCount = engagements.filter((e) => e.status === '待签约' || e.status === '合同准备').length;
  const signedCount = engagements.filter((e) => e.status === '已签约').length;

  // Filtered List
  const filteredList = engagements.filter((item) => {
    const matchesQuery =
      item.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bidCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ownerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  // Stage Pipeline Steps
  const STAGES: WinningEngagement['status'][] = [
    '待接洽',
    '需求沟通',
    '方案确认',
    '合同准备',
    '已签约'
  ];

  // Advance Stage in Drawer
  const handleAdvanceStage = async (nextStage: WinningEngagement['status']) => {
    if (!selectedEng) return;

    try {
      if (selectedEng.id && !selectedEng.id.startsWith('win-')) {
        await crmRepository.updateEngagement(selectedEng.id, { status: nextStage });
      }
    } catch (error) {
      addToast('error', '��Ǣ�׶θ���ʧ��', error instanceof Error ? error.message : '���Ժ�����');
      return;
    }

    let autoDelivery = selectedEng.isTransferredToDelivery;
    let autoReqPool = selectedEng.isTransferredToReqPool;

    if (nextStage === '已签约') {
      autoDelivery = true;
      autoReqPool = true;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedTimeline = [
      ...selectedEng.timeline,
      {
        id: `tl-${Date.now()}`,
        time: nowStr,
        title: `状态更新为【${nextStage}】`,
        desc: nextStage === '已签约'
          ? '项目正式签约！系统已自动将项目流转至【项目交付】模块，并在【需求池】中新增对应的产品实施任务'
          : `接洽阶段推进至：${nextStage}`,
        type: (nextStage === '已签约' ? 'system' : 'meeting') as any
      }
    ];

    const updated: WinningEngagement = {
      ...selectedEng,
      status: nextStage,
      isTransferredToDelivery: autoDelivery,
      isTransferredToReqPool: autoReqPool,
      timeline: updatedTimeline
    };

    setEngagements((prev) => prev.map((item) => (item.id === selectedEng.id ? updated : item)));
    setSelectedEng(updated);

    if (nextStage === '已签约') {
      addToast(
        'success',
        '签约完成！项目已自动流转至【项目交付】与【需求池】',
        `系统已自动在【项目交付】(proj_list) 建立交付大盘，并在【需求池】(wb_work_order) 增配了指向产品团队的接洽实施任务！`
      );
    } else {
      addToast('success', `接洽阶段已更新为【${nextStage}】`);
    }
  };

  // Add Communication Record
  const handleAddCommRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEng || !commTitle.trim()) {
      addToast('warning', '请填写沟通主题');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newRecord: WinningEngagementCommRecord = {
      id: `comm-${Date.now()}`,
      time: nowStr,
      operator: '当前用户',
      title: commTitle,
      content: commContent || '进行了现场需求沟通。',
      keyRequirements: commKeyReq
    };

    const updatedComm = [newRecord, ...selectedEng.commRecords];
    const updatedTimeline = [
      ...selectedEng.timeline,
      {
        id: `tl-${Date.now()}`,
        time: nowStr,
        title: `需求沟通记录: ${commTitle}`,
        desc: commContent || '已归档沟通明细与客户偏好',
        type: 'meeting' as const
      }
    ];

    const updated: WinningEngagement = {
      ...selectedEng,
      commRecords: updatedComm,
      timeline: updatedTimeline
    };

    setEngagements((prev) => prev.map((item) => (item.id === selectedEng.id ? updated : item)));
    setSelectedEng(updated);

    setCommTitle('');
    setCommContent('');
    setCommKeyReq('');
    setIsAddCommOpen(false);

    addToast('success', '需求沟通记录追加成功！已同步至接洽时间线');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Award className="w-5.5 h-5.5 text-amber-400" />
            中标接洽管理
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            招投标【中标赢单】后自动流转建立接洽清单，深度跟进需求沟通、方案确认与合同准备，签约后联动流转项目交付与产品需求池
          </p>
        </div>

        {/* Source Note Badge */}
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-amber-300 text-xs">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
          <span>数据源：招投标赢单 (`中标赢单`) 自动触发流转创建</span>
        </div>
      </div>

      {/* Indicator Data Stat Cards (指标数据) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="进行中接洽"
          value={ongoingCount}
          subText="从中标到签约跟进"
          icon={<Briefcase className="w-5 h-5 text-sky-400" />}
          iconBgColor="bg-sky-950/40 text-sky-400 border border-sky-800/60"
        />
        <StatCard
          title="方案确认"
          value={schemeConfirmCount}
          subText="已锁定技术与交付参数"
          icon={<FileCheck2 className="w-5 h-5 text-amber-400" />}
          iconBgColor="bg-amber-950/40 text-amber-400 border border-amber-800/60"
        />
        <StatCard
          title="待签约 / 合同准备"
          value={pendingSignCount}
          subText="法务审核与公章走流程"
          icon={<Clock className="w-5 h-5 text-orange-400" />}
          iconBgColor="bg-orange-950/40 text-orange-400 border border-orange-800/60"
        />
        <StatCard
          title="已签约归档"
          value={signedCount}
          subText="已联动流转项目交付与需求池"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          iconBgColor="bg-emerald-950/40 text-emerald-400 border border-emerald-800/60"
        />
      </div>

      {/* List & Filter Panel */}
      <div className="dark-panel rounded-lg p-4 border border-[var(--border-main)] space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-main)]">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索招标编号、项目名称、客户、负责人..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-muted)]">接洽状态:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 text-xs rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
              >
                <option value="all">全部状态</option>
                <option value="待接洽">待接洽</option>
                <option value="需求沟通">需求沟通</option>
                <option value="方案确认">方案确认</option>
                <option value="合同准备">合同准备</option>
                <option value="已签约">已签约</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-[var(--text-muted)] font-mono">
            共 <span className="font-bold text-[var(--text-primary)]">{filteredList.length}</span> 项接洽任务
          </div>
        </div>

        {/* Table List */}
        <div className="border border-[var(--border-main)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)] font-medium border-b border-[var(--border-main)]">
                <tr>
                  <th className="p-3">招标编号</th>
                  <th className="p-3">中标项目名称</th>
                  <th className="p-3">客户名称</th>
                  <th className="p-3">商务负责人</th>
                  <th className="p-3">中标金额</th>
                  <th className="p-3">预计签约日期</th>
                  <th className="p-3">接洽状态</th>
                  <th className="p-3 text-right">详情操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)] text-[var(--text-primary)]">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors group">
                    <td className="p-3 font-mono text-[var(--text-muted)] font-medium">{item.bidCode}</td>
                    <td className="p-3 font-semibold text-sm">
                      <span
                        onClick={() => setSelectedEng(item)}
                        className="cursor-pointer group-hover:text-[var(--primary)] transition-colors"
                      >
                        {item.projectName}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 font-medium text-[var(--primary)]">
                        <Building className="w-3.5 h-3.5 shrink-0" />
                        {item.customerName}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)]">
                        <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {item.ownerName}
                      </span>
                    </td>
                    <td className="p-3 font-bold font-mono text-emerald-400">
                      ¥{(item.amount / 10000).toFixed(0)}万
                    </td>
                    <td className="p-3 font-mono text-[var(--text-muted)]">{item.expectedSignDate || '-'}</td>
                    <td className="p-3">
                      <StatusTag status={item.status} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEng(item)}
                        className="px-3 py-1 rounded text-xs font-semibold bg-[var(--primary)] hover:opacity-90 text-white transition-opacity cursor-pointer shadow-2xs"
                      >
                        详情与跟进
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drawer: Engagement Details */}
      <Drawer
        isOpen={!!selectedEng}
        onClose={() => setSelectedEng(null)}
        title={selectedEng?.projectName || '中标接洽详情'}
        subtitle={`招标编号：${selectedEng?.bidCode} | 客户：${selectedEng?.customerName}`}
        width="max-w-3xl"
      >
        {selectedEng && (
          <div className="space-y-6 text-xs">
            {/* 项目基本信息 Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)]">
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">客户名称</span>
                <span className="font-bold text-sm text-[var(--primary)]">{selectedEng.customerName}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">中标金额</span>
                <span className="font-bold text-sm text-emerald-400 font-mono">¥{(selectedEng.amount / 10000).toFixed(0)}万</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">商务负责人</span>
                <span className="font-bold text-sm text-[var(--text-primary)]">{selectedEng.ownerName}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">预计签约日期</span>
                <span className="font-bold font-mono text-[var(--text-primary)]">{selectedEng.expectedSignDate || '-'}</span>
              </div>
            </div>

            {/* Stage Pipeline Stepper (状态流) */}
            <div className="p-4 rounded-lg border border-[var(--border-main)] space-y-3 bg-[var(--bg-card)]">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
                  接洽阶段推进流程
                </span>
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  当前处于: <StatusTag status={selectedEng.status} />
                </span>
              </h4>

              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {STAGES.map((stg, idx) => {
                  const currentIdx = STAGES.indexOf(selectedEng.status);
                  const isCurrent = stg === selectedEng.status;
                  const isPassed = idx <= currentIdx;

                  return (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => handleAdvanceStage(stg)}
                      className={`p-2 rounded border text-center transition-all cursor-pointer flex flex-col items-center justify-between min-h-[58px] ${
                        isCurrent
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md ring-2 ring-[var(--primary)]/30'
                          : isPassed
                          ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/40'
                          : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-main)] hover:border-[var(--primary)]'
                      }`}
                    >
                      <span className="text-[10px] font-mono opacity-80">Step {idx + 1}</span>
                      <span className="font-bold text-xs mt-0.5">{stg}</span>
                      {isPassed && <Check className="w-3 h-3 text-emerald-400 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cross-Module Flow Status Card (联动流转提醒) */}
            {selectedEng.status === '已签约' && (
              <div className="p-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    已完成签约，跨模块联动生效中
                  </span>
                  <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    自动流转归档已就绪
                  </span>
                </div>

                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  按照【中标接洽端到端规范】：该项目状态为“已签约”后，系统已自动联动流转至<strong>【项目交付】(proj_list)</strong>，同时自动在<strong>【需求池】(wb_work_order)</strong> 中新增了指向产品团队的实施任务。
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEng(null);
                      openPageTab('proj_list', '项目交付');
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    查看【项目交付】看板
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEng(null);
                      openPageTab('wb_work_order', '需求池');
                    }}
                    className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    查看【需求池】指向产品任务
                  </button>
                </div>
              </div>
            )}

            {/* 需求沟通记录 (Communication Logs) */}
            <div className="space-y-3 p-4 rounded-lg border border-[var(--border-main)]">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[var(--primary)]" />
                  需求沟通记录与明细
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddCommOpen(!isAddCommOpen)}
                  className="px-2.5 py-1 rounded bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAddCommOpen ? '收起表单' : '添加沟通记录'}
                </button>
              </div>

              {/* Add Record Form */}
              {isAddCommOpen && (
                <form onSubmit={handleAddCommRecord} className="p-3 rounded-md border border-[var(--primary)]/30 bg-[var(--primary)]/5 space-y-2.5 animate-in fade-in duration-100">
                  <div>
                    <label className="block text-[var(--text-muted)] text-[11px] mb-1">沟通主题 *</label>
                    <input
                      type="text"
                      value={commTitle}
                      onChange={(e) => setCommTitle(e.target.value)}
                      placeholder="如：现场需求技术交底与端口排查"
                      className="w-full p-2 rounded border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-muted)] text-[11px] mb-1">沟通过程与反馈要点</label>
                    <textarea
                      rows={2}
                      value={commContent}
                      onChange={(e) => setCommContent(e.target.value)}
                      placeholder="记录校方领导与技术负责人的意见与要求..."
                      className="w-full p-2 rounded border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-muted)] text-[11px] mb-1">具体需求偏好 / 核心交付指标</label>
                    <input
                      type="text"
                      value={commKeyReq}
                      onChange={(e) => setCommKeyReq(e.target.value)}
                      placeholder="如：要求首期交付64节点GPU算力，支持单点登录接口"
                      className="w-full p-2 rounded border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)] font-medium"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddCommOpen(false)}
                      className="px-3 py-1 rounded border border-[var(--border-main)] text-[var(--text-body)]"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 rounded bg-[var(--primary)] text-white font-semibold"
                    >
                      保存记录并更新时间线
                    </button>
                  </div>
                </form>
              )}

              {/* Comm List */}
              <div className="space-y-2.5 pt-1">
                {selectedEng.commRecords && selectedEng.commRecords.length > 0 ? (
                  selectedEng.commRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--border-main)]/50 pb-1.5">
                        <span className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[var(--primary)]" />
                          {rec.title}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">
                          [{rec.operator}] • {rec.time}
                        </span>
                      </div>
                      <p className="text-[var(--text-body)] leading-relaxed">{rec.content}</p>
                      {rec.keyRequirements && (
                        <div className="mt-1 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                          <strong>偏好指标：</strong>{rec.keyRequirements}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-[var(--text-muted)]">暂无沟通记录，可点击右上角新增</div>
                )}
              </div>
            </div>

            {/* 接洽时间线 (Timeline - 取跟进记录) */}
            <div className="space-y-3 p-4 rounded-lg border border-[var(--border-main)]">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                <History className="w-4 h-4 text-[var(--primary)]" />
                接洽跟进时间线 (取项目跟进轨迹)
              </h4>
              <div className="space-y-3 pl-2 border-l-2 border-[var(--border-main)] ml-2 pt-1">
                {selectedEng.timeline.map((tl) => (
                  <div key={tl.id} className="relative pl-4 space-y-0.5">
                    <div className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--primary)] border-2 border-[var(--bg-card)]" />
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[var(--text-primary)]">{tl.title}</span>
                      <span className="font-mono text-[var(--text-muted)]">{tl.time}</span>
                    </div>
                    <p className="text-[var(--text-muted)] leading-normal">{tl.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 相关文件 (Related Documents) */}
            <div className="space-y-3 p-4 rounded-lg border border-[var(--border-main)]">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-[var(--primary)]" />
                中标与商务相关文件
              </h4>
              <div className="space-y-2">
                {selectedEng.relatedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-main)] hover:border-[var(--primary)] transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
                      <span className="font-medium text-[var(--text-primary)] truncate">{file.title}</span>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0 ml-2">{file.size}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

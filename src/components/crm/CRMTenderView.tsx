import React, { useState } from 'react';
import {
  Radio,
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
  CheckCircle2,
  Clock,
  Edit,
  ArrowRight,
  Send,
  Sliders,
  Bell,
  Tag,
  Check,
  Zap,
  Flame,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2
} from '@/components/common/octicons-compat';
import { useAppCrm } from '../../hooks/useAppCrm';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { TenderInfo, TenderRule } from '../../types';

export const CRMTenderView: React.FC = () => {
  const { openPageTab, addToast, customers, opportunities, addBiddingProject } = useAppCrm();

  // Active Tab: 'stream' (标讯流) | 'rules' (匹配规则)
  const [activeTab, setActiveTab] = useState<'stream' | 'rules'>('stream');

  // Search & Filters for Tender Stream
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderFilter, setReminderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  // Mock Tender Stream Data
  const [tenders, setTenders] = useState<TenderInfo[]>([
    {
      id: 'tender-101',
      code: 'BX-2026-0901',
      title: '清华大学计算机系AI人工智能实训平台二期公开招标公告',
      source: '中国政府采购网',
      potentialCustomer: '清华大学',
      region: '北京',
      budget: 4500000,
      deadline: '2026-09-03 17:00',
      deadlineReminder: '今日截止',
      matchRate: 98,
      matchLevel: '极高匹配',
      productLine: 'AI大模型实训平台',
      matchReasons: [
        '公告正文包含核心关键词“大模型分布式训练”、“GPU算力中枢”、“实训教研”',
        '预算 ¥450万 符合华北地区双一流高校重点项目区间',
        '潜在客户已归档在【客户档案】重点维护名录中'
      ],
      content: `一、采购项目名称：清华大学计算机系AI人工智能实训平台二期采购项目
二、采购需求：建设包含64节点GPU高性能智算集群、AI大模型实训管理中枢、大模型微调教学软件套件及200套学生端实训终端。
三、投标人资格要求：具有独立法人资格，具备信息系统集成一级资质，近三年具备高校大模型实训室成功案例（合同额>300万）。
四、开标时间与递交文件截止时间：2026年9月3日 17:00。`,
      attachments: [
        { title: '清华大学AI实训平台二期招标文件(公开版).pdf', url: '#', size: '4.2MB' },
        { title: '技术参数与评分细则表.xlsx', url: '#', size: '1.1MB' }
      ],
      trackingRecords: [
        { time: '2026-09-01 08:30', operator: '智能抓取引擎', action: '抓取到新标讯', note: '命中规则：高校AI大模型实训室招标抓取规则 (权重98分)' },
        { time: '2026-09-01 09:00', operator: '系统自动通知', action: '企微推送商务经理', note: '已自动推送给北京大区商务经理 周市场' }
      ],
      status: '未跟踪',
      createdAt: '2026-09-01'
    },
    {
      id: 'tender-102',
      code: 'BX-2026-0902',
      title: '浙江大学信息中心智慧校园AI教研实训一体化硬件采购项目',
      source: '浙江省政府采购网',
      potentialCustomer: '浙江大学',
      region: '浙江',
      budget: 6800000,
      deadline: '2026-09-05 15:00',
      deadlineReminder: '三天内截止',
      matchRate: 92,
      matchLevel: '极高匹配',
      productLine: '信创算力中枢',
      matchReasons: [
        '命中规则关键词“智慧校园”、“教研实训一体化”、“国产信创”',
        '预算 ¥680万 符合重点大盘项目',
        '浙江大学属于公司华东区域战略合作院校'
      ],
      content: `浙江大学信息中心受学校委托，就“智慧校园AI教研实训一体化硬件采购项目”进行公开招标。
项目包含：国产化算力服务器、AI教学管理中枢软件、全校共享算力调度系统。投标文件递交截止时间为2026年9月5日15:00。`,
      attachments: [
        { title: '浙大AI教研招标文件.pdf', url: '#', size: '5.8MB' }
      ],
      trackingRecords: [
        { time: '2026-09-01 10:15', operator: '智能抓取引擎', action: '抓取到新标讯', note: '自动匹配度 92%' },
        { time: '2026-09-01 11:00', operator: '陈销售', action: '标记为已跟踪', note: '已与浙大信息中心副主任沟通初步参数' }
      ],
      status: '已跟踪',
      priority: '高',
      assignedTo: '陈销售',
      relatedOpportunity: '浙江大学智慧校园二期商机',
      createdAt: '2026-09-01'
    },
    {
      id: 'tender-103',
      code: 'BX-2026-0903',
      title: '北京大学教务处校企合作实训基地建设软件平台招标',
      source: '北京大学招标采购网',
      potentialCustomer: '北京大学',
      region: '北京',
      budget: 3200000,
      deadline: '2026-09-07 18:00',
      deadlineReminder: '本周截止',
      matchRate: 88,
      matchLevel: '高匹配',
      productLine: '产教融合实训平台',
      matchReasons: [
        '命中“校企合作实训基地”、“教务处软件平台”',
        '预算 ¥320万 处于优质中小项目区间'
      ],
      content: `北京大学教务处面向社会公开招标“校企合作实训基地建设软件平台”，包含教学评估、项目实训、产教融合接口组件等模块。`,
      status: '未跟踪',
      createdAt: '2026-09-02'
    },
    {
      id: 'tender-104',
      code: 'BX-2026-0904',
      title: '复旦大学软件学院新一代工业软件与AI实训环境采购',
      source: '上海市政府采购网',
      potentialCustomer: '复旦大学',
      region: '上海',
      budget: 5500000,
      deadline: '2026-09-25 12:00',
      deadlineReminder: '本月截止',
      matchRate: 85,
      matchLevel: '高匹配',
      productLine: '工业软件实训',
      matchReasons: [
        '包含“工业软件”、“AI实训环境”',
        '上海地区双一流建设高校'
      ],
      content: `复旦大学软件学院采购新一代工业软件与AI实训环境，旨在打造产教融合示范基座。招标包含软件授权、安装调优及3年运维服务。`,
      status: '未跟踪',
      createdAt: '2026-09-02'
    }
  ]);

  // Mock Tender Rules Data
  const [rules, setRules] = useState<TenderRule[]>([
    {
      id: 'rule-1',
      name: '高校AI大模型实训室招标抓取规则',
      keywords: ['AI实训', '大模型教学', '算力中枢', 'GPU集群', '人工智能学院'],
      industry: '高等教育',
      productLine: 'AI大模型实训平台',
      weight: 95,
      status: '启用',
      minBudget: 2000000,
      autoMarkRecommend: true,
      pushToWechat: true,
      updatedAt: '2026-08-28'
    },
    {
      id: 'rule-2',
      name: '信创算力与智慧校园教研抓取规则',
      keywords: ['信创算力', '智慧校园', '教研一体化', '国产化服务器'],
      industry: '职业教育 / 高等教育',
      productLine: '信创算力中枢',
      weight: 88,
      status: '启用',
      minBudget: 3000000,
      autoMarkRecommend: true,
      pushToWechat: true,
      updatedAt: '2026-08-30'
    },
    {
      id: 'rule-3',
      name: '产教融合与实训基地建设项目抓取规则',
      keywords: ['产教融合', '实训基地', '校企合作', '实训软件'],
      industry: '职业教育',
      productLine: '产教融合实训平台',
      weight: 80,
      status: '启用',
      minBudget: 1000000,
      autoMarkRecommend: false,
      pushToWechat: true,
      updatedAt: '2026-08-25'
    }
  ]);

  // Selected Tender for Detail Drawer
  const [selectedTender, setSelectedTender] = useState<TenderInfo | null>(null);

  // Modal State: Track Tender Form
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackingTender, setTrackingTender] = useState<TenderInfo | null>(null);
  const [formPriority, setFormPriority] = useState<'高' | '中' | '低'>('高');
  const [formAssignedTo, setFormAssignedTo] = useState('周市场');
  const [formOpportunity, setFormOpportunity] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Modal State: New/Edit Rule Form
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TenderRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleKeywords, setRuleKeywords] = useState('AI实训, 大模型教学, 算力中枢');
  const [ruleIndustry, setRuleIndustry] = useState('高等教育');
  const [ruleProductLine, setRuleProductLine] = useState('AI大模型实训平台');
  const [ruleWeight, setRuleWeight] = useState(85);
  const [ruleMinBudget, setRuleMinBudget] = useState(2000000);
  const [ruleAutoRecommend, setRuleAutoRecommend] = useState(true);
  const [rulePushWechat, setRulePushWechat] = useState(true);

  // Stats calculation
  const totalThisMonth = tenders.length;
  const highMatchCount = tenders.filter((t) => t.matchRate >= 85).length;
  const trackedCount = tenders.filter((t) => t.status === '已跟踪' || t.status === '已立项').length;
  const urgentThisWeekCount = tenders.filter(
    (t) => t.deadlineReminder === '今日截止' || t.deadlineReminder === '三天内截止' || t.deadlineReminder === '本周截止'
  ).length;

  // Filtered Tenders
  const filteredTenders = tenders.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.potentialCustomer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesReminder =
      reminderFilter === 'all' || item.deadlineReminder === reminderFilter;

    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter;

    const matchesRegion =
      regionFilter === 'all' || item.region === regionFilter;

    return matchesSearch && matchesReminder && matchesStatus && matchesRegion;
  });

  // Open Track Modal
  const openTrackModal = (tender: TenderInfo) => {
    setTrackingTender(tender);
    setFormPriority(tender.priority || '高');
    setFormAssignedTo(tender.assignedTo || '周市场');
    setFormOpportunity(tender.relatedOpportunity || `${tender.potentialCustomer}AI项目商机`);
    setFormRemarks(tender.remarks || '已确认客户采购编制计划，符合我司产品线，准备跟进。');
    setIsTrackModalOpen(true);
  };

  // Submit Track Form (企微自动推送)
  const handleSaveTracking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingTender) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updated: TenderInfo = {
      ...trackingTender,
      status: '已跟踪',
      priority: formPriority,
      assignedTo: formAssignedTo,
      relatedOpportunity: formOpportunity,
      remarks: formRemarks,
      trackingRecords: [
        ...(trackingTender.trackingRecords || []),
        {
          time: nowStr,
          operator: '当前用户',
          action: '手动标记跟踪并派单',
          note: `优先级：${formPriority} | 指派负责人：${formAssignedTo} | 企微推送通知已触发`
        }
      ]
    };

    setTenders((prev) => prev.map((t) => (t.id === trackingTender.id ? updated : t)));
    if (selectedTender?.id === trackingTender.id) {
      setSelectedTender(updated);
    }

    setIsTrackModalOpen(false);
    addToast(
      'success',
      '标讯跟踪成功！已自动触发企微通知',
      `系统已将该标讯以高优先级卡片形式企微推送给 [${formAssignedTo}] 商务经理`
    );
  };

  // Initiate Project (立即立项 -> 流转转为招投标列表)
  const handleInitiateProject = async (tender: TenderInfo) => {
    // 1. Add project to Bidding (crm_bidding)
    const newBidData = {
      id: `bid-${Date.now()}`,
      code: `BID-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: tender.title,
      projectName: tender.title,
      customerName: tender.potentialCustomer,
      budgetAmount: tender.budget,
      bidAmount: tender.budget,
      deadline: tender.deadline.split(' ')[0],
      ownerName: tender.assignedTo || '周市场',
      techLeader: '张技术',
      commercialLeader: tender.assignedTo || '周市场',
      status: '报名中' as const,
      result: '投标中' as const,
      remarks: `由标讯 [${tender.code}] 快捷一键立项转化。来源: ${tender.source}`
    };

    addBiddingProject(newBidData);

    // 2. Update tender status
    const updated: TenderInfo = {
      ...tender,
      status: '已立项',
      trackingRecords: [
        ...(tender.trackingRecords || []),
        {
          time: new Date().toISOString().replace('T', ' ').substring(0, 16),
          operator: '当前用户',
          action: '立即立项',
          note: `已成功流转为【招投标列表】新投标项目 (${newBidData.code})`
        }
      ]
    };

    setTenders((prev) => prev.map((t) => (t.id === tender.id ? updated : t)));
    if (selectedTender?.id === tender.id) {
      setSelectedTender(updated);
    }

    addToast(
      'success',
      '已成功立项并流转至招投标管理！',
      `项目编号 ${newBidData.code} 已生成并归档入【招投标管理】。点击可直接前往查看`
    );
  };

  // Rule Toggle
  const handleToggleRuleStatus = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === ruleId
          ? { ...r, status: r.status === '启用' ? '禁用' : '启用' }
          : r
      )
    );
    addToast('info', '匹配规则状态已更新');
  };

  // Open New / Edit Rule Modal
  const openRuleModal = (rule?: TenderRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleName(rule.name);
      setRuleKeywords(rule.keywords.join(', '));
      setRuleIndustry(rule.industry);
      setRuleProductLine(rule.productLine);
      setRuleWeight(rule.weight);
      setRuleMinBudget(rule.minBudget || 1000000);
      setRuleAutoRecommend(rule.autoMarkRecommend);
      setRulePushWechat(rule.pushToWechat);
    } else {
      setEditingRule(null);
      setRuleName('');
      setRuleKeywords('AI实训, 大模型, 算力中枢');
      setRuleIndustry('高等教育');
      setRuleProductLine('AI大模型实训平台');
      setRuleWeight(85);
      setRuleMinBudget(2000000);
      setRuleAutoRecommend(true);
      setRulePushWechat(true);
    }
    setIsRuleModalOpen(true);
  };

  // Save Rule
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      addToast('warning', '请填写规则名称');
      return;
    }

    const kwArray = ruleKeywords
      .split(/[,，;；\s]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (editingRule) {
      const updated: TenderRule = {
        ...editingRule,
        name: ruleName,
        keywords: kwArray,
        industry: ruleIndustry,
        productLine: ruleProductLine,
        weight: ruleWeight,
        minBudget: ruleMinBudget,
        autoMarkRecommend: ruleAutoRecommend,
        pushToWechat: rulePushWechat,
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setRules((prev) => prev.map((r) => (r.id === editingRule.id ? updated : r)));
      addToast('success', '匹配规则更新成功！');
    } else {
      const newRule: TenderRule = {
        id: `rule-${Date.now()}`,
        name: ruleName,
        keywords: kwArray,
        industry: ruleIndustry,
        productLine: ruleProductLine,
        weight: ruleWeight,
        status: '启用',
        minBudget: ruleMinBudget,
        autoMarkRecommend: ruleAutoRecommend,
        pushToWechat: rulePushWechat,
        updatedAt: new Date().toISOString().split('T')[0]
      };
      setRules((prev) => [newRule, ...prev]);
      addToast('success', '新建匹配规则成功！自动开启全网招投标抓取推送');
    }

    setIsRuleModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio className="w-5.5 h-5.5 text-rose-500 animate-pulse" />
            标讯中心与全网情报
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            智能抓取全国高校与教育机构招投标公告，AI高匹配推演、企微消息推送与一键快捷立项
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border-main)]">
          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'stream'
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Zap className="w-4 h-4" />
            标讯流 (卡片视图)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            匹配规则配置
          </button>
        </div>
      </div>

      {/* Indicator Data Stat Cards (指标数据) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="本月新标讯"
          value={totalThisMonth}
          subText="全网雷达抓取"
          icon={<Radio className="w-5 h-5 text-sky-400" />}
          iconBgColor="bg-sky-950/40 text-sky-400 border border-sky-800/60"
        />
        <StatCard
          title="高匹配标讯"
          value={highMatchCount}
          subText="匹配度 ≥ 85%"
          icon={<Flame className="w-5 h-5 text-rose-400" />}
          iconBgColor="bg-rose-950/40 text-rose-400 border border-rose-800/60"
        />
        <StatCard
          title="已跟踪 / 已立项"
          value={trackedCount}
          subText="商务经理介入中"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          iconBgColor="bg-emerald-950/40 text-emerald-400 border border-emerald-800/60"
        />
        <StatCard
          title="本周截止提醒"
          value={urgentThisWeekCount}
          subText="需紧急处理履约"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          iconBgColor="bg-amber-950/40 text-amber-400 border border-amber-800/60"
        />
      </div>

      {/* Main Content Body */}
      {activeTab === 'stream' ? (
        <div className="space-y-4">
          {/* Stream Filter Toolbar */}
          <div className="dark-panel rounded-lg p-4 border border-[var(--border-main)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索标讯标题、学校、来源、编号..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2.5" />
              </div>

              {/* Deadline Reminder Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)] shrink-0">截止提醒:</span>
                <select
                  value={reminderFilter}
                  onChange={(e) => setReminderFilter(e.target.value)}
                  className="p-1.5 text-xs rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
                >
                  <option value="all">全部提醒</option>
                  <option value="今日截止">今日截止 🔥</option>
                  <option value="三天内截止">三天内截止 ⚠️</option>
                  <option value="本周截止">本周截止</option>
                  <option value="本月截止">本月截止</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)] shrink-0">跟踪状态:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-1.5 text-xs rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
                >
                  <option value="all">全部状态</option>
                  <option value="未跟踪">未跟踪</option>
                  <option value="已跟踪">已跟踪</option>
                  <option value="已立项">已立项</option>
                </select>
              </div>

              {/* Region Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)] shrink-0">地区:</span>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="p-1.5 text-xs rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
                >
                  <option value="all">全部地区</option>
                  <option value="北京">北京</option>
                  <option value="浙江">浙江</option>
                  <option value="上海">上海</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)] font-mono">
              找到 <span className="font-bold text-[var(--text-primary)]">{filteredTenders.length}</span> 条情报
            </div>
          </div>

          {/* Tender Cards Stream Grid */}
          <div className="space-y-3.5">
            {filteredTenders.length > 0 ? (
              filteredTenders.map((tender) => {
                // Determine Deadline Badge style
                let reminderBg = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                if (tender.deadlineReminder === '今日截止') {
                  reminderBg = 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse font-bold';
                } else if (tender.deadlineReminder === '三天内截止') {
                  reminderBg = 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold';
                } else if (tender.deadlineReminder === '本周截止') {
                  reminderBg = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
                }

                // Match rate badge color
                let matchBadge = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                if (tender.matchRate < 90) {
                  matchBadge = 'bg-sky-500/15 text-sky-400 border-sky-500/30';
                }

                return (
                  <div
                    key={tender.id}
                    className="dark-panel rounded-lg p-4 border border-[var(--border-main)] hover:border-[var(--primary)] transition-all space-y-3 shadow-2xs group"
                  >
                    {/* 第一行：标题、截止提醒 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-main)]/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-main)]">
                          {tender.code}
                        </span>
                        <h3
                          onClick={() => setSelectedTender(tender)}
                          className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--primary)] cursor-pointer transition-colors leading-snug"
                        >
                          {tender.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* 截止提醒标签 */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border ${reminderBg}`}>
                          <Clock className="w-3 h-3" />
                          {tender.deadlineReminder}
                        </span>
                        <StatusTag status={tender.status} />
                      </div>
                    </div>

                    {/* 第二行：标讯来源、潜在客户、地区、预算、截止时间 */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs text-[var(--text-body)]">
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">标讯来源</span>
                        <span className="font-medium text-[var(--text-primary)] truncate block">{tender.source}</span>
                      </div>

                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">潜在客户</span>
                        <span className="font-semibold text-[var(--primary)] flex items-center gap-1 truncate">
                          <Building className="w-3 h-3 shrink-0" />
                          {tender.potentialCustomer}
                        </span>
                      </div>

                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">地区 / 城市</span>
                        <span className="font-medium flex items-center gap-1 text-[var(--text-primary)]">
                          <MapPin className="w-3 h-3 text-[var(--text-muted)]" />
                          {tender.region}
                        </span>
                      </div>

                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">项目预算</span>
                        <span className="font-bold font-mono text-emerald-400">
                          ¥{(tender.budget / 10000).toFixed(0)}万
                        </span>
                      </div>

                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">截止投递时间</span>
                        <span className="font-mono text-[var(--text-primary)]">{tender.deadline}</span>
                      </div>
                    </div>

                    {/* 第三行：匹配度、产品线与操作按键 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border-main)]/40 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 匹配度 */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${matchBadge}`}>
                          <Sparkles className="w-3 h-3" />
                          匹配度 {tender.matchRate}% ({tender.matchLevel})
                        </span>

                        {/* 产品线 */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-main)] text-[var(--text-muted)] text-[11px]">
                          <Layers className="w-3 h-3" />
                          产品线: {tender.productLine}
                        </span>

                        {tender.assignedTo && (
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                            <User className="w-3 h-3" />
                            负责人: <strong className="text-[var(--text-primary)]">{tender.assignedTo}</strong>
                          </span>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTender(tender)}
                          className="px-2.5 py-1 rounded text-xs border border-[var(--border-main)] text-[var(--text-body)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                        >
                          详情正文
                        </button>

                        <button
                          type="button"
                          onClick={() => openTrackModal(tender)}
                          className="px-3 py-1 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Send className="w-3 h-3" />
                          标讯跟踪
                        </button>

                        <button
                          type="button"
                          onClick={() => handleInitiateProject(tender)}
                          className="px-3 py-1 rounded text-xs font-semibold bg-[var(--primary)] hover:opacity-90 text-white flex items-center gap-1 transition-opacity cursor-pointer shadow-2xs"
                        >
                          <Award className="w-3 h-3" />
                          立即立项
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-[var(--text-muted)] dark-panel rounded-lg border border-[var(--border-main)]">
                未查找到符合筛选条件的标讯数据
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Matching Rules Tab (匹配规则) */
        <div className="space-y-4">
          <div className="dark-panel rounded-lg p-4 border border-[var(--border-main)] flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">标讯全网爬虫与AI匹配规则设定</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                设定关键词权重与行业规则，系统将自动对各招投标网公告进行语义分词推演，高匹配项将自动触发企微提醒。
              </p>
            </div>
            <button
              type="button"
              onClick={() => openRuleModal()}
              className="px-3.5 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              新建匹配规则
            </button>
          </div>

          {/* Rules Table */}
          <div className="dark-panel rounded-lg border border-[var(--border-main)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)] font-medium border-b border-[var(--border-main)]">
                  <tr>
                    <th className="p-3">规则名称</th>
                    <th className="p-3">核心匹配关键词</th>
                    <th className="p-3">行业范围</th>
                    <th className="p-3">对应产品线</th>
                    <th className="p-3">基础规则权重</th>
                    <th className="p-3">匹配联动动作</th>
                    <th className="p-3">状态</th>
                    <th className="p-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)] text-[var(--text-primary)]">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                      <td className="p-3 font-semibold text-sm">
                        {rule.name}
                        <div className="text-[11px] text-[var(--text-muted)] font-mono font-normal">
                          更新时间：{rule.updatedAt}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {rule.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] border border-[var(--primary)]/20"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-[var(--text-body)]">{rule.industry}</td>
                      <td className="p-3 font-medium text-emerald-400">{rule.productLine}</td>
                      <td className="p-3 font-mono font-bold text-amber-400">{rule.weight} 分</td>
                      <td className="p-3 text-[11px] text-[var(--text-muted)] space-y-0.5">
                        {rule.autoMarkRecommend && <div className="text-emerald-400">✓ 自动标记推荐</div>}
                        {rule.pushToWechat && <div className="text-sky-400">✓ 企微推送商务经理</div>}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleRuleStatus(rule.id)}
                          className="inline-flex items-center gap-1 cursor-pointer"
                        >
                          {rule.status === '启用' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold">
                              已启用
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] bg-zinc-500/20 text-zinc-400 border border-zinc-500/40">
                              已禁用
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => openRuleModal(rule)}
                          className="p-1 rounded text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer mr-1"
                          title="编辑规则"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Tender Detail View */}
      <Drawer
        isOpen={!!selectedTender}
        onClose={() => setSelectedTender(null)}
        title={selectedTender?.title || '标讯详情'}
        subtitle={`抓取编号：${selectedTender?.code} | 来源：${selectedTender?.source}`}
        width="max-w-2xl"
      >
        {selectedTender && (
          <div className="space-y-5 text-xs">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)]">
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">潜在客户</span>
                <span className="font-bold text-sm text-[var(--primary)]">{selectedTender.potentialCustomer}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">项目预算</span>
                <span className="font-bold text-sm text-emerald-400 font-mono">¥{(selectedTender.budget / 10000).toFixed(0)}万</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">AI匹配度</span>
                <span className="font-bold text-sm text-amber-400 font-mono">{selectedTender.matchRate}% ({selectedTender.matchLevel})</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">截止提醒</span>
                <span className="font-bold text-rose-400">{selectedTender.deadlineReminder}</span>
              </div>
            </div>

            {/* AI Match Reasons */}
            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
              <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                AI 智能语义匹配分析原因
              </h4>
              <ul className="space-y-1 text-[var(--text-body)] list-disc pl-4">
                {selectedTender.matchReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>

            {/* Notice Content */}
            <div className="space-y-2 p-3.5 rounded-lg border border-[var(--border-main)]">
              <h4 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[var(--primary)]" />
                招标公告正文摘要
              </h4>
              <p className="whitespace-pre-line text-[var(--text-body)] leading-relaxed bg-[var(--bg-main)] p-3 rounded border border-[var(--border-main)] font-sans">
                {selectedTender.content}
              </p>
            </div>

            {/* Attachments & Links */}
            {selectedTender.attachments && selectedTender.attachments.length > 0 && (
              <div className="space-y-2 p-3.5 rounded-lg border border-[var(--border-main)]">
                <h4 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-[var(--primary)]" />
                  公告附件与证明文件
                </h4>
                <div className="space-y-1.5">
                  {selectedTender.attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-main)] hover:border-[var(--primary)] transition-colors"
                    >
                      <span className="font-medium text-[var(--text-primary)] truncate">{file.title}</span>
                      <span className="text-[11px] text-[var(--text-muted)] font-mono shrink-0 ml-2">{file.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking Records Timeline */}
            <div className="space-y-2 p-3.5 rounded-lg border border-[var(--border-main)]">
              <h4 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[var(--primary)]" />
                追踪与抓取日志记录
              </h4>
              <div className="space-y-2 pt-1">
                {(selectedTender.trackingRecords || []).map((rec, i) => (
                  <div key={i} className="flex gap-2.5 text-[11px] border-l-2 border-[var(--primary)] pl-2.5 py-0.5">
                    <span className="font-mono text-[var(--text-muted)] shrink-0">{rec.time}</span>
                    <div>
                      <span className="font-bold text-[var(--text-primary)]">[{rec.operator}]</span> {rec.action}
                      {rec.note && <div className="text-[var(--text-muted)] mt-0.5">{rec.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar inside Drawer */}
            <div className="pt-3 border-t border-[var(--border-main)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => openTrackModal(selectedTender)}
                className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                标讯跟踪 (企微推送)
              </button>

              <button
                type="button"
                onClick={() => handleInitiateProject(selectedTender)}
                className="px-4 py-2 rounded-md bg-[var(--primary)] hover:opacity-90 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-opacity cursor-pointer"
              >
                <Award className="w-4 h-4" />
                立即立项
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal: Track Tender (企微推送) */}
      <Modal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        title={`标讯跟踪 & 指派跟进 - ${trackingTender?.potentialCustomer}`}
      >
        <form onSubmit={handleSaveTracking} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-muted)] mb-1">跟踪优先级 *</label>
            <div className="flex gap-2">
              {(['高', '中', '低'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormPriority(p)}
                  className={`flex-1 py-1.5 rounded-md border text-xs font-semibold cursor-pointer ${
                    formPriority === p
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--bg-main)] text-[var(--text-muted)] border-[var(--border-main)]'
                  }`}
                >
                  {p}优先级
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[var(--text-muted)] mb-1">指派跟进负责人 (企微自动消息推送) *</label>
            <select
              value={formAssignedTo}
              onChange={(e) => setFormAssignedTo(e.target.value)}
              className="w-full p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)] font-medium"
            >
              <option value="周市场">周市场 (华北区商务总监)</option>
              <option value="陈销售">陈销售 (华东区高级经理)</option>
              <option value="李高管">李高管 (全国销售副总裁)</option>
              <option value="张技术">张技术 (首席解决方案架构师)</option>
            </select>
          </div>

          <div>
            <label className="block text-[var(--text-muted)] mb-1">关联CRM商机名称</label>
            <input
              type="text"
              value={formOpportunity}
              onChange={(e) => setFormOpportunity(e.target.value)}
              placeholder="如：清华大学AI实训二期商机"
              className="w-full p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-[var(--text-muted)] mb-1">跟进备注与策略建议</label>
            <textarea
              rows={3}
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              className="w-full p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
            />
          </div>

          <div className="p-2.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[11px] flex items-center gap-2">
            <Bell className="w-4 h-4 shrink-0" />
            点击确认后，系统将自动向【{formAssignedTo}】的企微发送包含该标讯链接与参数的推送通知。
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
            <button
              type="button"
              onClick={() => setIsTrackModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md border border-[var(--border-main)] text-[var(--text-body)]"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[var(--primary)] text-white font-semibold shadow-sm"
            >
              确认标记跟踪并发送企微通知
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New / Edit Matching Rule */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRule ? '编辑标讯匹配规则' : '新建标讯抓取与匹配规则'}
      >
        <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-muted)] mb-1">规则名称 *</label>
            <input
              type="text"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="如：高校AI大模型实训室招标抓取规则"
              className="w-full p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)] font-medium"
            />
          </div>

          <div>
            <label className="block text-[var(--text-muted)] mb-1">核心匹配关键词 (英文逗号分隔) *</label>
            <textarea
              rows={2}
              value={ruleKeywords}
              onChange={(e) => setRuleKeywords(e.target.value)}
              placeholder="AI实训, 大模型教学, 算力中枢, 计算机系采购"
              className="w-full p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-muted)] mb-1">目标行业范围</label>
              <select
                value={ruleIndustry}
                onChange={(e) => setRuleIndustry(e.target.value)}
                className="w-full p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
              >
                <option value="高等教育">高等教育</option>
                <option value="职业教育">职业教育</option>
                <option value="科研院所">科研院所</option>
                <option value="通用教育装备">通用教育装备</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-muted)] mb-1">关联公司产品线</label>
              <select
                value={ruleProductLine}
                onChange={(e) => setRuleProductLine(e.target.value)}
                className="w-full p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)]"
              >
                <option value="AI大模型实训平台">AI大模型实训平台</option>
                <option value="信创算力中枢">信创算力中枢</option>
                <option value="产教融合实训平台">产教融合实训平台</option>
                <option value="工业软件实训">工业软件实训</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-muted)] mb-1">规则权重 (0-100分)</label>
              <input
                type="number"
                value={ruleWeight}
                onChange={(e) => setRuleWeight(Number(e.target.value))}
                className="w-full p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)] font-mono"
              />
            </div>

            <div>
              <label className="block text-[var(--text-muted)] mb-1">最低匹配预算门槛 (元)</label>
              <input
                type="number"
                value={ruleMinBudget}
                onChange={(e) => setRuleMinBudget(Number(e.target.value))}
                className="w-full p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-primary)] font-mono"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--border-main)]">
            <label className="block text-[var(--text-muted)] font-medium">匹配动作控制</label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={ruleAutoRecommend}
                  onChange={(e) => setRuleAutoRecommend(e.target.checked)}
                  className="rounded border-[var(--border-main)] text-[var(--primary)]"
                />
                自动标记高匹配度推荐标签
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={rulePushWechat}
                  onChange={(e) => setRulePushWechat(e.target.checked)}
                  className="rounded border-[var(--border-main)] text-[var(--primary)]"
                />
                匹配命中后立即发起企微自动提醒推送商务经理
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="px-3.5 py-1.5 rounded-md border border-[var(--border-main)] text-[var(--text-body)]"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[var(--primary)] text-white font-semibold"
            >
              保存匹配规则
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

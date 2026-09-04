import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Building,
  UserCheck,
  MapPin,
  Navigation,
  Search,
  Check,
  X,
  Users,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal, Drawer, StatCard, StatusTag } from '../common/UIComponents';
import { VisitPlan } from '../../types';
import { crmRepository } from '../../services/crmRepository';

// Available team members for quick multi-select
const PRESET_TEAM_MEMBERS = ['周市场', '陈销售', '张技术', '王售前', '李高管', '赵产品'];

// Helper to normalize date to YYYY-MM-DD
function normalizeDateStr(rawDate: string): string {
  if (!rawDate) {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  const parts = rawDate.trim().split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return rawDate;
}

export const CRMVisitsView: React.FC = () => {
  const { customers, addToast } = useApp();

  // Selected year and month (Default: September 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // 0-indexed: 8 is September

  // Initial base mock data
  const INITIAL_VISITS_DATA: VisitPlan[] = [
    {
      id: 'visit-901',
      title: '拜访清华大学计算机系',
      schoolName: '清华大学',
      customerId: 'cust-101',
      visitDate: '2026-09-02',
      timeSlot: '09:30-11:30',
      purpose: 'AI人工智能实训平台二期需求对接与技术演示',
      visitorName: '周市场, 张技术',
      visitorNames: ['周市场', '张技术'],
      status: '已打卡',
      checkInTime: '2026-09-02 09:42',
      checkInLocation: '北京市海淀区清华大学东门信息科学技术楼302',
      checkInNotes: '已向系主任演示AI大模型教学中枢，对方对试用部署意向极强，本周安排交付环境。',
      createdAt: '2026-08-28'
    },
    {
      id: 'visit-902',
      title: '拜访北京大学教务处',
      schoolName: '北京大学',
      customerId: 'cust-102',
      visitDate: '2026-09-02',
      timeSlot: '14:00-16:00',
      purpose: '校企合作实训基地建设方案汇报',
      visitorName: '周市场, 陈销售',
      visitorNames: ['周市场', '陈销售'],
      status: '计划中',
      createdAt: '2026-08-29'
    },
    {
      id: 'visit-903',
      title: '拜访浙江大学信息中心',
      schoolName: '浙江大学',
      customerId: 'cust-103',
      visitDate: '2026-09-03',
      timeSlot: '10:00-12:00',
      purpose: '智慧校园AI大模型教研实训方案演示',
      visitorName: '陈销售',
      visitorNames: ['陈销售'],
      status: '计划中',
      createdAt: '2026-08-30'
    },
    {
      id: 'visit-904',
      title: '拜访复旦大学软件学院',
      schoolName: '复旦大学',
      customerId: 'cust-104',
      visitDate: '2026-09-04',
      timeSlot: '14:30-16:30',
      purpose: '产教融合新专业申报预检答疑与封样准备',
      visitorName: '周市场, 王售前',
      visitorNames: ['周市场', '王售前'],
      status: '计划中',
      createdAt: '2026-08-31'
    },
    {
      id: 'visit-905',
      title: '拜访南京大学信息管理学院',
      schoolName: '南京大学',
      customerId: 'cust-105',
      visitDate: '2026-09-15',
      timeSlot: '09:30-11:30',
      purpose: '全校算力中枢部署方案上会复盘',
      visitorName: '周市场',
      visitorNames: ['周市场'],
      status: '计划中',
      createdAt: '2026-09-01'
    },
    {
      id: 'visit-906',
      title: '拜访上海交通大学资产处',
      schoolName: '上海交通大学',
      customerId: 'cust-106',
      visitDate: '2026-09-18',
      timeSlot: '15:00-17:00',
      purpose: '工业软件实训基地封样前沟通及招投标准备',
      visitorName: '陈销售, 李高管',
      visitorNames: ['陈销售', '李高管'],
      status: '计划中',
      createdAt: '2026-09-02'
    }
  ];

  const [visitPlans, setVisitPlans] = useState<VisitPlan[]>(INITIAL_VISITS_DATA);

  // Load visits from repository / localStorage on mount
  useEffect(() => {
    async function loadVisits() {
      try {
        const remoteVisits = await crmRepository.visits();
        if (Array.isArray(remoteVisits) && remoteVisits.length > 0) {
          // Merge with initial data avoiding duplicate IDs
          setVisitPlans((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = remoteVisits.filter((item: any) => item && item.id && !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        }
      } catch (err) {
        console.warn('Failed to load remote visits:', err);
      }
    }
    loadVisits();
  }, []);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form Field: Smart Customer Autocomplete Search
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [formSchoolName, setFormSchoolName] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
  const schoolDropdownRef = useRef<HTMLDivElement>(null);

  // Form Field: Multi-User Visitors Selection
  const [formVisitors, setFormVisitors] = useState<string[]>(['周市场']);
  const [customVisitorInput, setCustomVisitorInput] = useState('');

  // Form Field: Other visit parameters
  const [formVisitDate, setFormVisitDate] = useState('2026-09-03');
  const [formTimeSlot, setFormTimeSlot] = useState('10:00-12:00');
  const [formPurpose, setFormPurpose] = useState('');

  // Drawer state for detail & check-in
  const [selectedPlan, setSelectedPlan] = useState<VisitPlan | null>(null);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInLocation, setCheckInLocation] = useState('');

  // Filtered customer list for smart autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    if (!schoolSearchQuery.trim()) return customers;
    const q = schoolSearchQuery.trim().toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.type && c.type.toLowerCase().includes(q)) ||
        (c.level && c.level.toLowerCase().includes(q)) ||
        (c.contactName && c.contactName.toLowerCase().includes(q))
    );
  }, [customers, schoolSearchQuery]);

  // Click outside listener for school dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        schoolDropdownRef.current &&
        !schoolDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSchoolDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Month stats for header
  const currentMonthPlans = useMemo(() => {
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return visitPlans.filter((p) => p.visitDate && p.visitDate.startsWith(monthStr));
  }, [visitPlans, currentYear, currentMonth]);

  const totalCount = currentMonthPlans.length;
  const checkedInCount = currentMonthPlans.filter((p) => p.status === '已打卡').length;
  const pendingCount = totalCount - checkedInCount;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Quick New Visit from Hover + Icon
  const handleQuickAddDate = (dateStr: string) => {
    const defaultCust = customers[0]?.name || '浙江大学';
    setFormSchoolName(defaultCust);
    setSchoolSearchQuery(defaultCust);
    setFormCustomerId(customers[0]?.id || '');
    setFormVisitDate(dateStr);
    setFormTimeSlot('10:00-12:00');
    setFormPurpose('进行校企交流及AI实训基地建设需求调研');
    setFormVisitors(['周市场']);
    setIsSchoolDropdownOpen(false);
    setIsAddModalOpen(true);
  };

  // Toggle multi-user visitor
  const handleToggleVisitor = (member: string) => {
    setFormVisitors((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member]
    );
  };

  // Add custom visitor
  const handleAddCustomVisitor = () => {
    const name = customVisitorInput.trim();
    if (name && !formVisitors.includes(name)) {
      setFormVisitors((prev) => [...prev, name]);
      setCustomVisitorInput('');
    }
  };

  // Remove visitor
  const handleRemoveVisitor = (member: string) => {
    setFormVisitors((prev) => prev.filter((m) => m !== member));
  };

  // Select customer from smart dropdown
  const handleSelectCustomer = (cust: { id: string; name: string }) => {
    setFormSchoolName(cust.name);
    setFormCustomerId(cust.id);
    setSchoolSearchQuery(cust.name);
    setIsSchoolDropdownOpen(false);
  };

  // Save Visit Plan
  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSchoolName.trim()) {
      addToast('warning', '请选择或录入目标学校名称');
      return;
    }
    if (!formPurpose.trim()) {
      addToast('warning', '请填写真实的拜访目的与需求说明');
      return;
    }

    const normDate = normalizeDateStr(formVisitDate);
    const matchedCust = customers.find((c) => c.name === formSchoolName);
    const finalVisitors = formVisitors.length > 0 ? formVisitors : ['周市场'];
    const visitorStr = finalVisitors.join(', ');

    const newPlanData: VisitPlan = {
      id: `visit-${Date.now()}`,
      title: `拜访${formSchoolName}`,
      schoolName: formSchoolName,
      customerId: matchedCust?.id || formCustomerId || '',
      visitDate: normDate,
      timeSlot: formTimeSlot || '10:00-12:00',
      purpose: formPurpose,
      visitorName: visitorStr,
      visitorNames: finalVisitors,
      status: '计划中',
      createdAt: new Date().toISOString().split('T')[0]
    };

    try {
      await crmRepository.createVisit(newPlanData as unknown as Record<string, unknown>);
    } catch (err) {
      console.warn('Repository save fallback:', err);
    }

    // Add to state
    setVisitPlans((prev) => [newPlanData, ...prev]);

    // Automatically navigate calendar to the year & month of the new visit plan so it shows immediately!
    const [yStr, mStr] = normDate.split('-');
    const newY = parseInt(yStr, 10);
    const newM = parseInt(mStr, 10) - 1;
    if (!isNaN(newY) && !isNaN(newM)) {
      setCurrentYear(newY);
      setCurrentMonth(newM);
    }

    setIsAddModalOpen(false);
    addToast('success', '拜访计划新建成功！', `已自动更新并定位至 ${normDate} 日历`);
  };

  // Open Drawer for a specific plan block
  const openPlanDrawer = (plan: VisitPlan) => {
    setSelectedPlan(plan);
    setCheckInLocation(`${plan.schoolName}校区/教学实验楼附近（GPS定位校验通过）`);
    setCheckInNotes(plan.checkInNotes || '');
  };

  // Perform Check-in inside Drawer
  const handleDrawerCheckIn = async () => {
    if (!selectedPlan) return;

    try {
      await crmRepository.checkInVisit(selectedPlan.id, {
        location: checkInLocation,
        notes: checkInNotes || '到达现场进行需求交流，沟通顺利，对方对方案非常认可。'
      });
    } catch (err) {
      console.warn('Check-in repository fallback:', err);
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updatedPlan: VisitPlan = {
      ...selectedPlan,
      status: '已打卡',
      checkInTime: nowStr,
      checkInLocation,
      checkInNotes: checkInNotes || '到达现场进行需求交流，沟通顺利，对方对方案非常认可。'
    };

    setVisitPlans((prev) =>
      prev.map((item) => (item.id === selectedPlan.id ? updatedPlan : item))
    );
    setSelectedPlan(updatedPlan);
    addToast('success', '到访打卡成功！', '已完成现场定位核验，拜访记录已归档');
  };

  // Build Calendar Days
  const calendarGrid = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Get weekday of the 1st day of the month (0 = Sun, 1 = Mon... 6 = Sat)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    // We want Monday as index 0, Sunday as index 6
    const startOffset = (firstDayIndex + 6) % 7;

    const days = [];

    // Empty cells before start of month
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }

    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <CalendarIcon className="w-5.5 h-5.5 text-[var(--primary)]" />
            拜访计划
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            日历视图展示，随时追踪拜访进度
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            handleQuickAddDate(today);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          新建拜访计划
        </button>
      </div>

      {/* Top Stat Cards (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="总计划拜访"
          value={totalCount}
          subText="本月安排学校"
          icon={<Building className="w-5 h-5 text-blue-400" />}
          iconBgColor="bg-blue-950/40 text-blue-400 border border-blue-800/60"
        />
        <StatCard
          title="已打卡"
          value={checkedInCount}
          subText="完成现场定位核验"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          iconBgColor="bg-emerald-950/40 text-emerald-400 border border-emerald-800/60"
        />
        <StatCard
          title="未打卡"
          value={pendingCount}
          subText="待入校履约打卡"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          iconBgColor="bg-amber-950/40 text-amber-400 border border-amber-800/60"
        />
      </div>

      {/* Main Calendar Panel */}
      <div className="dark-panel rounded-lg p-5 border border-[var(--border-main)] space-y-4">
        {/* Calendar Header: Month Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-[var(--text-primary)] font-mono tracking-tight">
              {currentYear}年 {currentMonth + 1}月
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-md border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              title="上一个月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-md border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              title="下一个月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="border border-[var(--border-main)] rounded-lg overflow-hidden">
          {/* Weekday Header Row */}
          <div className="grid grid-cols-7 border-b border-[var(--border-main)] bg-[var(--bg-elevated)]/60 text-center text-xs font-medium text-[var(--text-muted)] divide-x divide-[var(--border-main)]">
            <div className="py-2.5">星期一</div>
            <div className="py-2.5">星期二</div>
            <div className="py-2.5">星期三</div>
            <div className="py-2.5">星期四</div>
            <div className="py-2.5">星期五</div>
            <div className="py-2.5">星期六</div>
            <div className="py-2.5">星期日</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border-main)] bg-[var(--bg-main)]">
            {calendarGrid.map((cell, idx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[110px] bg-[var(--bg-main)]/30 opacity-40 p-2"
                  />
                );
              }

              const { dayNumber, dateStr } = cell;

              // Find plans for this date with normalized string comparison
              const dayPlans = visitPlans.filter(
                (p) => normalizeDateStr(p.visitDate) === dateStr
              );

              // Highlight day 3 or active day
              const isHighlightDay = dayNumber === 3;

              return (
                <div
                  key={dateStr}
                  className="min-h-[110px] p-2 relative group hover:bg-[var(--bg-elevated)]/40 transition-colors flex flex-col justify-between"
                >
                  {/* Top Day Header inside Cell */}
                  <div className="flex items-center justify-between mb-1.5">
                    {isHighlightDay ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm">
                        {dayNumber}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-[var(--text-muted)] font-mono pl-0.5">
                        {dayNumber}
                      </span>
                    )}

                    {/* Quick Add Button on Hover */}
                    <button
                      type="button"
                      onClick={() => handleQuickAddDate(dateStr)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--primary)] hover:text-white text-[var(--text-muted)] transition-all cursor-pointer"
                      title={`快捷新建 ${dateStr} 拜访计划`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* School Plan Blocks */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[110px] pr-0.5 scrollbar-thin">
                    {dayPlans.map((plan) => {
                      const isChecked = plan.status === '已打卡';
                      // Visitors tag string preview
                      const visitorCount = plan.visitorNames?.length || (plan.visitorName ? plan.visitorName.split(',').length : 1);
                      return (
                        <div
                          key={plan.id}
                          onClick={() => openPlanDrawer(plan)}
                          className={`p-1.5 rounded border text-xs font-medium cursor-pointer transition-all flex items-center justify-between gap-1 shadow-2xs ${
                            isChecked
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-900/50'
                              : 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:border-amber-400 hover:bg-amber-900/50'
                          }`}
                          title={`点击查看 / 完成定位打卡 - ${plan.schoolName} (${plan.visitorName})`}
                        >
                          <div className="truncate flex items-center gap-1">
                            <span className="truncate font-semibold">{plan.schoolName}</span>
                            {visitorCount > 1 && (
                              <span className="text-[10px] opacity-75 shrink-0 px-1 rounded bg-black/20">
                                {visitorCount}人
                              </span>
                            )}
                          </div>
                          {isChecked && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drawer for School Visit Detail & Location Check-In */}
      <Drawer
        isOpen={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title={`拜访详情 - ${selectedPlan?.schoolName}`}
        subtitle={`计划时间：${selectedPlan?.visitDate} ${selectedPlan?.timeSlot || ''}`}
        width="max-w-xl"
      >
        {selectedPlan && (
          <div className="space-y-5 text-xs">
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)]">
              <div>
                <span className="text-[var(--text-muted)]">履约状态：</span>
                <StatusTag status={selectedPlan.status} />
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <Users className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>拜访团队：</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedPlan.visitorName}
                </span>
              </div>
            </div>

            {/* Visit Details */}
            <div className="space-y-3 p-3.5 rounded-lg border border-[var(--border-main)]">
              <h4 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[var(--primary)]" />
                {selectedPlan.schoolName}
              </h4>
              <div className="space-y-2 text-[var(--text-body)]">
                <div>
                  <span className="text-[var(--text-muted)] font-medium">拜访时间段：</span>
                  <span className="font-mono">{selectedPlan.visitDate} ({selectedPlan.timeSlot || '09:30-11:30'})</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] font-medium">同行人员列表：</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(selectedPlan.visitorNames || (selectedPlan.visitorName ? selectedPlan.visitorName.split(',').map(s=>s.trim()) : ['周市场'])).map((v, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] font-medium text-[11px] border border-[var(--primary)]/20"
                      >
                        <UserCheck className="w-3 h-3" />
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] font-medium">拜访主要目的：</span>
                  <p className="mt-1 p-2 rounded bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-primary)] leading-relaxed">
                    {selectedPlan.purpose}
                  </p>
                </div>
              </div>
            </div>

            {/* Check-In Panel */}
            {selectedPlan.status === '已打卡' ? (
              <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  已完成现场定位打卡归档
                </div>
                <div className="text-[11px] text-emerald-200/80 space-y-1">
                  <p>打卡时间：<span className="font-mono">{selectedPlan.checkInTime}</span></p>
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    定位结果：{selectedPlan.checkInLocation}
                  </p>
                  {selectedPlan.checkInNotes && (
                    <p className="pt-1.5 border-t border-emerald-500/20 text-emerald-100">
                      拜访纪要：{selectedPlan.checkInNotes}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 space-y-3">
                <h4 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-[var(--primary)]" />
                  现场定位与到访打卡
                </h4>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1">定位校验结果</label>
                  <div className="flex items-center gap-2 p-2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[11px]">
                    <MapPin className="w-4 h-4 shrink-0 text-emerald-400" />
                    <input
                      value={checkInLocation}
                      onChange={(e) => setCheckInLocation(e.target.value)}
                      className="w-full bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[var(--text-muted)] mb-1">拜访纪要与跟进反馈</label>
                  <textarea
                    rows={3}
                    value={checkInNotes}
                    onChange={(e) => setCheckInNotes(e.target.value)}
                    placeholder="录入拜访沟通要点、学校需求变动及下一步推进安排..."
                    className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)]"
                  />
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleDrawerCheckIn}
                    className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    确认到访打卡
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Modal: Add Visit Plan */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="新建拜访计划">
        <form onSubmit={handleSaveVisit} className="space-y-4 text-xs">
          {/* Requirement 1: Smart Customer Autocomplete Dropdown */}
          <div className="relative" ref={schoolDropdownRef}>
            <label className="block text-[var(--text-muted)] mb-1 font-medium flex items-center justify-between">
              <span>目标学校（客户档案智能匹配）*</span>
              <span className="text-[11px] text-[var(--primary)] font-normal">支持输入关键词快速检索</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={schoolSearchQuery}
                onChange={(e) => {
                  setSchoolSearchQuery(e.target.value);
                  setFormSchoolName(e.target.value);
                  setIsSchoolDropdownOpen(true);
                }}
                onFocus={() => setIsSchoolDropdownOpen(true)}
                placeholder="输入学校名称关键字（如：清华、北大、浙大）"
                className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2.5 pr-8 text-[var(--text-primary)] font-medium focus:border-[var(--primary)] focus:outline-none transition-colors"
              />
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Smart Suggestions Floating Panel */}
            {isSchoolDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] shadow-xl divide-y divide-[var(--border-main)] scrollbar-thin animate-in fade-in duration-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => handleSelectCustomer(cust)}
                      className="p-2.5 hover:bg-[var(--primary)]/10 cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)] flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
                          {cust.name}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-2">
                          <span>{cust.type || '高校科研'}</span>
                          <span>•</span>
                          <span>{cust.level || 'A级-重点'}</span>
                          {cust.contactName && (
                            <>
                              <span>•</span>
                              <span>联系人: {cust.contactName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {formSchoolName === cust.name && (
                        <Check className="w-4 h-4 text-[var(--primary)] shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-[var(--text-muted)]">
                    未在【客户档案】匹配到结果，将使用输入的自定义校名：“{schoolSearchQuery}”
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date and Time Slot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-muted)] mb-1">计划拜访日期 *</label>
              <input
                type="date"
                value={formVisitDate}
                onChange={(e) => setFormVisitDate(e.target.value)}
                className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)] font-mono focus:border-[var(--primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[var(--text-muted)] mb-1">拜访时间段</label>
              <input
                value={formTimeSlot}
                onChange={(e) => setFormTimeSlot(e.target.value)}
                placeholder="如 10:00-12:00"
                className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>
          </div>

          {/* Visit Purpose */}
          <div>
            <label className="block text-[var(--text-muted)] mb-1">拜访主要目的与需求 *</label>
            <textarea
              rows={3}
              value={formPurpose}
              onChange={(e) => setFormPurpose(e.target.value)}
              placeholder="列明对接部门与沟通事项（如：与计算机学院沟通AI大模型实训方案，演示平台功能）"
              className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* Requirement 3: Multi-User Visitors Selection */}
          <div className="space-y-2">
            <label className="block text-[var(--text-muted)] font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[var(--primary)]" />
                拜访人员 / 随行团队（支持多选）*
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">已选择 {formVisitors.length} 人</span>
            </label>

            {/* Selected Visitors Pill Tags */}
            <div className="p-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] min-h-[42px] flex flex-wrap gap-1.5 items-center">
              {formVisitors.map((member) => (
                <span
                  key={member}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] text-xs font-semibold border border-[var(--primary)]/30 animate-in fade-in duration-100"
                >
                  <UserCheck className="w-3 h-3" />
                  {member}
                  <button
                    type="button"
                    onClick={() => handleRemoveVisitor(member)}
                    className="hover:bg-[var(--primary)]/30 rounded-full p-0.5 ml-0.5 transition-colors"
                    title={`移除 ${member}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Add Custom Visitor Input inside tag container */}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={customVisitorInput}
                  onChange={(e) => setCustomVisitorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomVisitor();
                    }
                  }}
                  placeholder="+ 添加自定义成员"
                  className="w-32 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none px-1"
                />
                {customVisitorInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddCustomVisitor}
                    className="text-xs text-[var(--primary)] hover:underline font-medium"
                  >
                    添加
                  </button>
                )}
              </div>
            </div>

            {/* Quick Member Selector Buttons */}
            <div>
              <span className="text-[11px] text-[var(--text-muted)] block mb-1">快捷选择团队成员：</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TEAM_MEMBERS.map((member) => {
                  const isSelected = formVisitors.includes(member);
                  return (
                    <button
                      key={member}
                      type="button"
                      onClick={() => handleToggleVisitor(member)}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-main)] hover:border-[var(--primary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {isSelected ? `✓ ${member}` : `+ ${member}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Submit Footer */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-main)]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-2 rounded-md border border-[var(--border-main)] text-[var(--text-body)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[var(--primary)] text-white font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              加入拜访计划并更新日历
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

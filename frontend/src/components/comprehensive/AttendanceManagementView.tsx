import React, { useState } from 'react';
import { 
  Users, 
  CalendarCheck, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Calendar,
  Check,
  X,
  UserCheck,
  Briefcase,
  Send
} from 'lucide-react';
import { StatCard, StatusTag, Modal, Drawer } from '../common/UIComponents';
import { useApp } from '../../context/AppContext';
import { AttendanceRecord, LeaveApplication, OvertimeRecord, AttendanceException, ShiftSchedule } from '../../types';

export const AttendanceManagementView: React.FC = () => {
  const { addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'record' | 'leave' | 'overtime' | 'exception' | 'schedule'>('record');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal controls
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [selectedException, setSelectedException] = useState<AttendanceException | null>(null);

  // Mock Data
  const [attendanceRecords] = useState<AttendanceRecord[]>([
    { id: '1', empCode: 'MM-001', empName: '张伟', department: '市场运营部', clockInTime: '08:52', clockOutTime: '18:05', workHours: 8.5, status: '正常', date: '2026-09-02' },
    { id: '2', empCode: 'MM-002', empName: '李娜', department: '产品设计部', clockInTime: '09:18', clockOutTime: '18:30', workHours: 8.2, status: '迟到', date: '2026-09-02' },
    { id: '3', empCode: 'MM-003', empName: '王强', department: '软件研发部', clockInTime: '08:45', clockOutTime: '20:15', workHours: 10.5, status: '正常', date: '2026-09-02' },
    { id: '4', empCode: 'MM-004', empName: '刘芳', department: '综合管理部', clockInTime: '-', clockOutTime: '-', workHours: 0, status: '请假', date: '2026-09-02' },
    { id: '5', empCode: 'MM-005', empName: '陈杰', department: '市场运营部', clockInTime: '08:58', clockOutTime: '17:45', workHours: 7.8, status: '早退', date: '2026-09-02' },
    { id: '6', empCode: 'MM-006', empName: '赵敏', department: '软件研发部', clockInTime: '-', clockOutTime: '-', workHours: 0, status: '缺勤', date: '2026-09-02' },
  ]);

  const [leaveApps, setLeaveApps] = useState<LeaveApplication[]>([
    { id: '1', code: 'LV-20260901-01', applicant: '刘芳', type: '年假', startTime: '2026-09-02 09:00', endTime: '2026-09-02 18:00', days: 1, reason: '个人私事处理', approvalStatus: '已通过' },
    { id: '2', code: 'LV-20260902-02', applicant: '周涛', type: '病假', startTime: '2026-09-03 09:00', endTime: '2026-09-04 18:00', days: 2, reason: '身体不适就医', approvalStatus: '待审批' },
    { id: '3', code: 'LV-20260902-03', applicant: '孙婷', type: '事假', startTime: '2026-09-05 09:00', endTime: '2026-09-05 12:00', days: 0.5, reason: '家中有事处理', approvalStatus: '待审批' },
  ]);

  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([
    { id: '1', code: 'OT-20260830-01', empName: '王强', department: '软件研发部', date: '2026-08-30', timeSlot: '18:30 - 21:30', hours: 3, type: '工作日加班', reason: '版本发布封板冲刺', status: '已批准' },
    { id: '2', code: 'OT-20260831-02', empName: '吴磊', department: '产品设计部', date: '2026-08-31', timeSlot: '10:00 - 17:00', hours: 6, type: '双休日加班', reason: '原型高保真交互设计', status: '待审批' },
  ]);

  const [exceptions, setExceptions] = useState<AttendanceException[]>([
    { id: '1', empName: '李娜', date: '2026-09-02', exceptionType: '迟到', reason: '地铁2号线突发故障延误18分钟', status: '申诉中' },
    { id: '2', empName: '赵敏', date: '2026-09-02', exceptionType: '未打卡', reason: '因公外出拜访南京高淳区教育局未及时打卡', status: '待申诉' },
  ]);

  const [shiftSchedules] = useState<ShiftSchedule[]>([
    { id: '1', deptName: '市场运营部', shiftName: '标准日班 A', workTime: '09:00 - 18:00', empCount: 28, hasSchedule: true, status: '生效中' },
    { id: '2', deptName: '软件研发部', shiftName: '弹性日班 B', workTime: '08:30 - 17:30', empCount: 45, hasSchedule: true, status: '生效中' },
    { id: '3', deptName: '客户服务部', shiftName: '早晚轮班 C', workTime: '08:00 - 20:00', empCount: 12, hasSchedule: true, status: '待确认' },
  ]);

  // Handle Leave Create
  const [leaveForm, setLeaveForm] = useState({ applicant: '当前用户', type: '年假', startTime: '', endTime: '', days: 1, reason: '' });
  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const newLeave: LeaveApplication = {
      id: Date.now().toString(),
      code: `LV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*90+10)}`,
      applicant: leaveForm.applicant,
      type: leaveForm.type as any,
      startTime: leaveForm.startTime || '2026-09-03 09:00',
      endTime: leaveForm.endTime || '2026-09-03 18:00',
      days: Number(leaveForm.days) || 1,
      reason: leaveForm.reason || '个人休假',
      approvalStatus: '待审批'
    };
    setLeaveApps([newLeave, ...leaveApps]);
    setShowLeaveModal(false);
    addToast('success', '请假申请已提交', `单号：${newLeave.code}`);
  };

  // Handle Overtime Create
  const [otForm, setOtForm] = useState({ empName: '当前用户', department: '软件研发部', date: '', hours: 2, type: '工作日加班', reason: '' });
  const handleCreateOt = (e: React.FormEvent) => {
    e.preventDefault();
    const newOt: OvertimeRecord = {
      id: Date.now().toString(),
      code: `OT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*90+10)}`,
      empName: otForm.empName,
      department: otForm.department,
      date: otForm.date || '2026-09-03',
      timeSlot: '18:30 - 20:30',
      hours: Number(otForm.hours) || 2,
      type: otForm.type as any,
      reason: otForm.reason || '项目紧急需求处理',
      status: '待审批'
    };
    setOvertimeRecords([newOt, ...overtimeRecords]);
    setShowOvertimeModal(false);
    addToast('success', '加班申请已提交', `单号：${newOt.code}`);
  };

  const handleFixException = (status: '已修正' | '驳回') => {
    if (!selectedException) return;
    setExceptions(exceptions.map(e => e.id === selectedException.id ? { ...e, status } : e));
    setSelectedException(null);
    addToast('info', `考勤异常处理完成 (${status})`);
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="今日应出勤"
          value="128 人"
          subText="覆盖全公司 5 个核心部门"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
          onClick={() => setActiveTab('record')}
        />
        <StatCard
          title="实际出勤 / 出勤率"
          value="124 人"
          subText="出勤率 96.8% (较昨日 +0.5%)"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          onClick={() => setActiveTab('record')}
        />
        <StatCard
          title="迟到 / 早退"
          value="4 人"
          subText="3 人迟到，1 人早退"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-500/10 text-amber-400 border border-amber-500/20"
          onClick={() => setActiveTab('exception')}
        />
        <StatCard
          title="请假 / 缺勤"
          value="4 人"
          subText="3 人请假，1 人缺勤"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-500/10 text-rose-400 border border-rose-500/20"
          onClick={() => setActiveTab('leave')}
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-5 shadow-sm space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('record')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'record'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              考勤明细
            </button>
            <button
              onClick={() => setActiveTab('leave')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'leave'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              请假申请
            </button>
            <button
              onClick={() => setActiveTab('overtime')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'overtime'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              加班记录
            </button>
            <button
              onClick={() => setActiveTab('exception')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'exception'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              异常申诉
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500/20 text-rose-300 text-[10px] rounded-full font-mono font-bold">
                {exceptions.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'schedule'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              排班管理
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3.5 py-1.5 bg-[var(--warning)] text-black hover:bg-[var(--accent-gold-hover)] font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新增请假申请
            </button>
            <button
              onClick={() => setShowOvertimeModal(true)}
              className="px-3.5 py-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-main)] font-medium rounded-md text-xs flex items-center gap-1.5 transition-colors border border-[var(--border-main)] shadow-sm"
            >
              <Plus className="w-4 h-4" />
              申请加班
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
              placeholder="按姓名、工号、部门搜索..."
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
              <option value="正常">正常</option>
              <option value="迟到">迟到</option>
              <option value="早退">早退</option>
              <option value="请假">请假</option>
            </select>
          </div>
        </div>

        {/* Tab 1: 考勤明细 */}
        {activeTab === 'record' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">工号</th>
                  <th className="py-3 px-3">姓名</th>
                  <th className="py-3 px-3">部门</th>
                  <th className="py-3 px-3">日期</th>
                  <th className="py-3 px-3">上班打卡</th>
                  <th className="py-3 px-3">下班打卡</th>
                  <th className="py-3 px-3">实际工时</th>
                  <th className="py-3 px-3">打卡状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {attendanceRecords
                  .filter((r) => r.empName.includes(searchQuery) || r.department.includes(searchQuery))
                  .map((rec) => (
                    <tr key={rec.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{rec.empCode}</td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{rec.empName}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{rec.department}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{rec.date}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-primary)]">{rec.clockInTime}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-primary)]">{rec.clockOutTime}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{rec.workHours > 0 ? `${rec.workHours} 小时` : '-'}</td>
                      <td className="py-3 px-3">
                        <StatusTag status={rec.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 请假申请 */}
        {activeTab === 'leave' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">申请单号</th>
                  <th className="py-3 px-3">申请人</th>
                  <th className="py-3 px-3">类型</th>
                  <th className="py-3 px-3">开始时间</th>
                  <th className="py-3 px-3">结束时间</th>
                  <th className="py-3 px-3">请假天数</th>
                  <th className="py-3 px-3">事由</th>
                  <th className="py-3 px-3">审批状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {leaveApps.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{item.code}</td>
                    <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{item.applicant}</td>
                    <td className="py-3 px-3"><StatusTag status={item.type} type="info" /></td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{item.startTime}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{item.endTime}</td>
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{item.days} 天</td>
                    <td className="py-3 px-3 text-[var(--text-body)] max-w-xs truncate">{item.reason}</td>
                    <td className="py-3 px-3"><StatusTag status={item.approvalStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: 加班记录 */}
        {activeTab === 'overtime' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">加班单号</th>
                  <th className="py-3 px-3">加班员工</th>
                  <th className="py-3 px-3">部门</th>
                  <th className="py-3 px-3">加班日期</th>
                  <th className="py-3 px-3">时间段</th>
                  <th className="py-3 px-3">时长</th>
                  <th className="py-3 px-3">加班类型</th>
                  <th className="py-3 px-3">事由</th>
                  <th className="py-3 px-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {overtimeRecords.map((ot) => (
                  <tr key={ot.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{ot.code}</td>
                    <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{ot.empName}</td>
                    <td className="py-3 px-3 text-[var(--text-body)]">{ot.department}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{ot.date}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{ot.timeSlot}</td>
                    <td className="py-3 px-3 font-bold text-[var(--warning)]">{ot.hours} 小时</td>
                    <td className="py-3 px-3"><StatusTag status={ot.type} type="purple" /></td>
                    <td className="py-3 px-3 text-[var(--text-body)] max-w-xs truncate">{ot.reason}</td>
                    <td className="py-3 px-3"><StatusTag status={ot.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: 异常申诉 */}
        {activeTab === 'exception' && (
          <div className="space-y-3">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg flex items-center justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{ex.empName}</span>
                      <span className="text-xs text-[var(--text-muted)]">({ex.date})</span>
                      <StatusTag status={ex.exceptionType} type="danger" />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">申诉说明: {ex.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusTag status={ex.status} />
                  <button
                    onClick={() => setSelectedException(ex)}
                    className="px-3 py-1.5 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-main)] border border-[var(--border-main)] rounded-md text-xs font-medium transition-colors"
                  >
                    审核申诉
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 5: 排班管理 */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="p-4 bg-[color-mix(in_srgb,var(--primary)_10%,var(--bg-surface))] border border-[color-mix(in_srgb,var(--primary)_30%,var(--border-main))] rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--active-text)]">
                <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
                <span>本周排班计划已生成，待全员确认及班次微调。</span>
              </div>
              <button
                onClick={() => addToast('success', '排班计划已成功发布通知至全员')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition"
              >
                确认发布排班
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {shiftSchedules.map((sch) => (
                <div
                  key={sch.id}
                  className="p-4 border border-[var(--border-main)] rounded-lg bg-[var(--bg-main)] space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-white text-xs">{sch.deptName}</h4>
                    <StatusTag status={sch.status} />
                  </div>
                  <div className="text-xs text-[var(--text-muted)] space-y-1">
                    <p>班次模版: <span className="text-[var(--text-primary)] font-medium">{sch.shiftName}</span></p>
                    <p>上下班时段: <span className="text-[var(--text-primary)] font-mono">{sch.workTime}</span></p>
                    <p>覆盖员工: <span className="text-[var(--text-primary)] font-medium">{sch.empCount} 人</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: 新增请假申请 */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="新建请假申请"
        maxWidth="md"
      >
        <form onSubmit={handleCreateLeave} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">请假类型</label>
            <select 
              value={leaveForm.type} 
              onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="年假">年假</option>
              <option value="事假">事假</option>
              <option value="病假">病假</option>
              <option value="调休">调休</option>
              <option value="婚假">婚假</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">开始时间</label>
              <input 
                type="datetime-local" 
                onChange={(e) => setLeaveForm({ ...leaveForm, startTime: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]" 
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">结束时间</label>
              <input 
                type="datetime-local" 
                onChange={(e) => setLeaveForm({ ...leaveForm, endTime: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]" 
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">请假天数</label>
            <input 
              type="number" step="0.5"
              value={leaveForm.days}
              onChange={(e) => setLeaveForm({ ...leaveForm, days: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]" 
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">事由说明</label>
            <textarea 
              rows={3} 
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]" 
              placeholder="请输入具体请假原因..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowLeaveModal(false)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
            <button type="submit" className="px-3.5 py-1.5 bg-[var(--warning)] text-black font-semibold rounded-md hover:bg-[var(--accent-gold-hover)]">提交审批</button>
          </div>
        </form>
      </Modal>

      {/* Modal: 申请加班 */}
      <Modal
        isOpen={showOvertimeModal}
        onClose={() => setShowOvertimeModal(false)}
        title="申请加班"
        maxWidth="md"
      >
        <form onSubmit={handleCreateOt} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">加班日期</label>
            <input 
              type="date" 
              onChange={(e) => setOtForm({ ...otForm, date: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]" 
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">加班类型</label>
            <select 
              value={otForm.type} 
              onChange={(e) => setOtForm({ ...otForm, type: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="工作日加班">工作日加班</option>
              <option value="双休日加班">双休日加班</option>
              <option value="法定节假日加班">法定节假日加班</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">预估时长 (小时)</label>
            <input 
              type="number" step="0.5" 
              value={otForm.hours}
              onChange={(e) => setOtForm({ ...otForm, hours: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]" 
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">加班事由与工作目标</label>
            <textarea 
              rows={3} 
              value={otForm.reason}
              onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]" 
              placeholder="说明加班任务与必要性..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowOvertimeModal(false)} className="px-3.5 py-1.5 border border-[var(--border-main)] rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]">取消</button>
            <button type="submit" className="px-3.5 py-1.5 bg-[var(--warning)] text-black font-semibold rounded-md hover:bg-[var(--accent-gold-hover)]">提交申请</button>
          </div>
        </form>
      </Modal>

      {/* Drawer: 申诉处理 */}
      <Drawer
        isOpen={!!selectedException}
        onClose={() => setSelectedException(null)}
        title="考勤异常申诉审核"
        subtitle={selectedException ? `${selectedException.empName} - ${selectedException.date}` : ''}
        width="max-w-md"
      >
        {selectedException && (
          <div className="space-y-4 text-xs">
            <div className="bg-[var(--bg-main)] p-4 rounded-lg space-y-2 border border-[var(--border-main)]">
              <p><span className="text-[var(--text-muted)]">申诉员工:</span> <span className="font-semibold text-[var(--text-primary)]">{selectedException.empName}</span></p>
              <p><span className="text-[var(--text-muted)]">异常日期:</span> {selectedException.date}</p>
              <p><span className="text-[var(--text-muted)]">异常类型:</span> <StatusTag status={selectedException.exceptionType} type="danger" /></p>
              <p><span className="text-[var(--text-muted)]">申诉具体说明:</span> {selectedException.reason}</p>
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">审核意见</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
                defaultValue="情况属实，准予消除异常打卡标记。"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => handleFixException('驳回')}
                className="px-3.5 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-md font-medium hover:bg-rose-500/20"
              >
                驳回申诉
              </button>
              <button
                onClick={() => handleFixException('已修正')}
                className="px-3.5 py-1.5 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700"
              >
                同意修正为正常
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

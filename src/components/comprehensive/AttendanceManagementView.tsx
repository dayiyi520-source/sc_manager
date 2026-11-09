import React, { useEffect, useMemo, useState } from 'react';
import { Empty } from 'antd';
import { 
  Users, 
  CalendarCheck, 
  Clock, 
  AlertTriangle, 
  Search, 
  FileText, 
  UserCheck,
  Briefcase,
} from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Drawer } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
import { useApp } from '../../context/AppContext';
import { AttendanceException } from '../../types';
import { confirmLockedAttendanceCorrection, loadAttendanceDemo, saveAttendanceDemo } from '../../services/attendanceDemo';
import { syncAttendanceApprovals } from '../../services/approvalDemo';

export const AttendanceManagementView: React.FC = () => {
  const { addToast, approvals } = useApp();

  const [activeTab, setActiveTab] = useState<'record' | 'leave' | 'overtime' | 'exception' | 'schedule'>('record');
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  const [selectedException, setSelectedException] = useState<AttendanceException | null>(null);
  const [demoState, setDemoState] = useState(loadAttendanceDemo);
  const approvalSignature = approvals.map(item => `${item.code}:${item.status}`).join('|');
  useEffect(() => setDemoState(syncAttendanceApprovals(approvals)), [approvalSignature]);
  const { attendanceRecords, leaveApps, overtimeRecords, exceptions, shiftSchedules } = demoState;
  const linkedApproval = selectedException?.approvalCode ? approvals.find(item => item.code === selectedException.approvalCode) : null;
  const departments = useMemo(() => [...new Set([
    ...attendanceRecords.map(record => record.department),
    ...leaveApps.map(record => record.department),
    ...overtimeRecords.map(record => record.department || ''),
    ...exceptions.map(record => record.department),
    ...shiftSchedules.map(record => record.deptName),
  ].filter(Boolean))], [attendanceRecords, leaveApps, overtimeRecords, exceptions, shiftSchedules]);
  const search = searchQuery.trim().toLocaleLowerCase();
  const matches = (...values: Array<string | undefined>) => !search || values.some(value => value?.toLocaleLowerCase().includes(search));
  const filteredAttendance = attendanceRecords.filter(record =>
    (departmentFilter === 'ALL' || record.department === departmentFilter)
    && (tabFilter === 'ALL' || record.status === tabFilter)
    && matches(record.empName, record.empCode, record.department));
  const filteredLeaveApps = leaveApps.filter(record =>
    (departmentFilter === 'ALL' || record.department === departmentFilter)
    && (tabFilter === 'ALL' || record.type === tabFilter)
    && matches(record.applicant, record.code, record.department, record.type, record.reason));
  const filteredOvertime = overtimeRecords.filter(record =>
    (departmentFilter === 'ALL' || record.department === departmentFilter)
    && (tabFilter === 'ALL' || record.type === tabFilter)
    && matches(record.empName, record.code, record.department, record.type, record.reason));
  const filteredExceptions = exceptions.filter(record =>
    (departmentFilter === 'ALL' || record.department === departmentFilter)
    && (tabFilter === 'ALL' || record.status === tabFilter)
    && matches(record.empName, record.department, record.exceptionType, record.reason, record.approvalCode, record.approvalType));
  const filteredSchedules = shiftSchedules.filter(record =>
    (departmentFilter === 'ALL' || record.deptName === departmentFilter)
    && (tabFilter === 'ALL' || record.status === tabFilter)
    && matches(record.deptName, record.shiftName, record.workTime));
  const tabFilterOptions = activeTab === 'record'
    ? ['正常', '迟到', '早退', '请假', '缺勤']
    : activeTab === 'leave' ? [...new Set(leaveApps.map(record => record.type))]
      : activeTab === 'overtime' ? [...new Set(overtimeRecords.map(record => record.type || '').filter(Boolean))]
        : activeTab === 'exception' ? [...new Set(exceptions.map(record => record.status))]
          : [...new Set(shiftSchedules.map(record => record.status))];
  const searchPlaceholder = activeTab === 'record' ? '搜索姓名或考勤记录'
    : activeTab === 'leave' ? '搜索申请人、单号或事由'
      : activeTab === 'overtime' ? '搜索员工、单号或加班事由'
        : activeTab === 'exception' ? '搜索员工或申诉内容' : '搜索部门或班次';
  const presentCount = attendanceRecords.filter((record) => record.status === '正常').length;
  const lateOrEarlyCount = attendanceRecords.filter((record) => ['迟到', '早退'].includes(record.status)).length;
  const absentOrLeaveCount = attendanceRecords.filter((record) => ['请假', '缺勤'].includes(record.status)).length;

  const handleConfirmCorrection = () => {
    if (!selectedException) return;
    const nextState = confirmLockedAttendanceCorrection(demoState, selectedException.id, 'HR 当前用户');
    if (nextState === demoState) {
      addToast('warning', '关联考核月份仍处于锁定状态，归档考勤未修改');
      return;
    }
    setDemoState(nextState);
    saveAttendanceDemo(nextState);
    setSelectedException(null);
    addToast('success', '考勤更正已应用，原审批记录已保留');
  };

  return (
    <ComprehensivePage title="考勤管理" description="查看考勤记录、请假加班申请与异常处理" icon={<CalendarCheck className="w-5 h-5" />} hideHeader>
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="今日应出勤"
          value={`${attendanceRecords.length} 人`}
          subText="当前快照暂无考勤数据"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-blue-500/10 text-blue-400 border border-blue-500/20"
          onClick={() => setActiveTab('record')}
        />
        <StatCard
          title="实际出勤 / 出勤率"
          value={`${presentCount} 人`}
          subText={attendanceRecords.length ? `出勤率 ${Math.round((presentCount / attendanceRecords.length) * 100)}%` : '暂无统计'}
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          onClick={() => setActiveTab('record')}
        />
        <StatCard
          title="迟到 / 早退"
          value={`${lateOrEarlyCount} 人`}
          subText="迟到或早退"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-500/10 text-amber-400 border border-amber-500/20"
          onClick={() => setActiveTab('exception')}
        />
        <StatCard
          title="请假 / 缺勤"
          value={`${absentOrLeaveCount} 人`}
          subText="请假或缺勤"
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
              onClick={() => { setActiveTab('record'); setTabFilter('ALL'); }}
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
              onClick={() => { setActiveTab('leave'); setTabFilter('ALL'); }}
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
              onClick={() => { setActiveTab('overtime'); setTabFilter('ALL'); }}
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
              onClick={() => { setActiveTab('exception'); setTabFilter('ALL'); }}
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
              onClick={() => { setActiveTab('schedule'); setTabFilter('ALL'); }}
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
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-[250px] sm:flex-none">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="考勤搜索"
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full sm:w-auto">
            <select
              aria-label="部门筛选"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-body)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="ALL">全部部门</option>
              {departments.map(department => <option key={department} value={department}>{department}</option>)}
            </select>
            <select
              aria-label={activeTab === 'leave' || activeTab === 'overtime' ? '类型筛选' : '状态筛选'}
              value={tabFilter}
              onChange={(e) => setTabFilter(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-body)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="ALL">全部{activeTab === 'leave' || activeTab === 'overtime' ? '类型' : '状态'}</option>
              {tabFilterOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>

        {/* Tab 1: 考勤明细 */}
        {activeTab === 'record' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">姓名</th>
                  <th className="py-3 px-3">部门</th>
                  <th className="py-3 px-3">日期</th>
                  <th className="py-3 px-3">上班打卡</th>
                  <th className="py-3 px-3">下班打卡</th>
                  <th className="py-3 px-3">实际工时</th>
                  <th className="py-3 px-3">打卡状态</th>
                  <th className="py-3 px-3">更正来源</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {filteredAttendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{rec.empName}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{rec.department}</td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">{rec.date}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-primary)]">{rec.clockInTime}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-primary)]">{rec.clockOutTime}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{rec.workHours > 0 ? `${rec.workHours} 小时` : '-'}</td>
                      <td className="py-3 px-3">
                        <StatusTag status={rec.status} />
                      </td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">
                        {rec.sourceApprovalCode ? <button className="text-left text-[var(--primary)] hover:underline" onClick={() => setSelectedException(exceptions.find(item => item.linkedAttendanceId === rec.id) || null)}>{rec.sourceApprovalType} · {rec.sourceApprovalCode}</button> : rec.originalStatus ? 'HR 人工修改' : '--'}
                      </td>
                    </tr>
                  ))}
                {filteredAttendance.length === 0 && <tr><td colSpan={8} className="py-8 text-center"><Empty description="暂无匹配的考勤记录" /></td></tr>}
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
                  <th className="py-3 px-3">部门</th>
                  <th className="py-3 px-3">类型</th>
                  <th className="py-3 px-3">开始时间</th>
                  <th className="py-3 px-3">结束时间</th>
                  <th className="py-3 px-3">请假天数</th>
                  <th className="py-3 px-3">事由</th>
                  <th className="py-3 px-3">审批状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {filteredLeaveApps.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{item.code}</td>
                    <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{item.applicant}</td>
                    <td className="py-3 px-3 text-[var(--text-body)]">{item.department}</td>
                    <td className="py-3 px-3"><StatusTag status={item.type} type="info" /></td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{item.startTime}</td>
                    <td className="py-3 px-3 text-[var(--text-muted)]">{item.endTime}</td>
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{item.days} 天</td>
                    <td className="py-3 px-3 text-[var(--text-body)] max-w-xs truncate">{item.reason}</td>
                    <td className="py-3 px-3"><StatusTag status={item.approvalStatus} /></td>
                  </tr>
                ))}
                {filteredLeaveApps.length === 0 && <tr><td colSpan={9} className="py-8 text-center"><Empty description="暂无匹配的请假申请" /></td></tr>}
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
                {filteredOvertime.map((ot) => (
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
                {filteredOvertime.length === 0 && <tr><td colSpan={9} className="py-8 text-center"><Empty description="暂无匹配的加班记录" /></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: 异常申诉 */}
        {activeTab === 'exception' && (
          <div className="space-y-3">
            {filteredExceptions.map((ex) => (
              <div
                key={ex.id}
                className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] p-4 max-sm:grid-cols-[36px_minmax(0,1fr)]"
              >
                <div className="contents">
                  <div className="mt-0.5 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{ex.empName}</span>
                      <span className="text-xs text-[var(--text-muted)]">({ex.date})</span>
                      <StatusTag status={ex.exceptionType} type="danger" />
                      <span className="text-xs text-[var(--text-muted)]">{ex.department}</span>
                    </div>
                    <p className="mt-1 break-words text-xs leading-5 text-[var(--text-body)]">处理说明：{ex.reason}</p>
                    {ex.approvalCode && <p className="mt-1 break-all text-xs text-[var(--text-muted)]">关联{ex.approvalType}：{ex.approvalCode} · {approvals.find(item => item.code === ex.approvalCode)?.status || ex.approvalStatus}</p>}
                    {ex.originalStatus && ex.correctionStatus === '已生效' && <p className="mt-1 text-xs text-[var(--text-muted)]">考勤结果：{ex.originalStatus} → {ex.effectiveStatus}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 max-sm:col-start-2 max-sm:flex-wrap">
                  <StatusTag status={ex.status} />
                  <button
                    onClick={() => setSelectedException(ex)}
                    className="rounded-md border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--border-main)]"
                  >
                    {ex.correctionStatus === '待HR更正' ? '确认更正' : '查看处理详情'}
                  </button>
                </div>
              </div>
            ))}
            {filteredExceptions.length === 0 && <Empty description="暂无匹配的异常申诉" />}
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
              {filteredSchedules.map((sch) => (
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
            {filteredSchedules.length === 0 && <Empty description="暂无匹配的排班记录" />}
          </div>
        )}
      </div>

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
              <p><span className="text-[var(--text-muted)]">所属部门:</span> {selectedException.department}</p>
              <p><span className="text-[var(--text-muted)]">异常类型:</span> <StatusTag status={selectedException.exceptionType} type="danger" /></p>
              <p><span className="text-[var(--text-muted)]">处理说明:</span> {selectedException.reason}</p>
              {selectedException.approvalCode && <>
                <p><span className="text-[var(--text-muted)]">关联审批:</span> {selectedException.approvalType} · {selectedException.approvalCode}</p>
                <p><span className="text-[var(--text-muted)]">审批状态:</span> {linkedApproval?.status || selectedException.approvalStatus}</p>
              </>}
              {selectedException.originalStatus && <p><span className="text-[var(--text-muted)]">考勤变更:</span> {selectedException.originalStatus} → {selectedException.effectiveStatus}（{selectedException.correctionStatus}）</p>}
              {selectedException.processedBy && <p><span className="text-[var(--text-muted)]">处理记录:</span> {selectedException.processedBy} · {selectedException.processedAt}</p>}
            </div>
            {linkedApproval && <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-main)] p-4">
              <h4 className="mb-3 font-semibold text-[var(--text-primary)]">审批流转记录</h4>
              <div className="space-y-3">
                {linkedApproval.nodes.map((node, index) => <div key={`${node.title}-${index}`} className="border-l border-[var(--border-main)] pl-3">
                  <p className="font-medium text-[var(--text-body)]">{node.title} · {node.approver}</p>
                  <p className="mt-1 text-[var(--text-muted)]">{node.status === 'passed' ? '已完成' : node.status === 'rejected' ? '已驳回' : node.status === 'current' ? '处理中' : '待处理'}{node.time ? ` · ${node.time}` : ''}</p>
                  {node.comment && <p className="mt-1 break-words text-[var(--text-muted)]">{node.comment}</p>}
                </div>)}
              </div>
            </div>}
            {!selectedException.approvalCode && selectedException.status === '待处理' && <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">审核意见</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
                defaultValue="情况属实，准予消除异常打卡标记。"
              />
            </div>}
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {selectedException.correctionStatus === '待HR更正' && <button
                onClick={handleConfirmCorrection}
                className="rounded-md bg-blue-600 px-3.5 py-1.5 font-medium text-white transition-colors hover:bg-blue-700"
              >确认考勤更正</button>}
              <button
                onClick={() => setSelectedException(null)}
                className="rounded-md border border-[var(--border-main)] px-3.5 py-1.5 font-medium text-[var(--text-body)] transition-colors hover:bg-[var(--bg-elevated)]"
              >关闭</button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
    </ComprehensivePage>
  );
};

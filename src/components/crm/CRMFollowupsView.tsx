import React, { useState } from 'react';
import {
  MessageSquare,
  Filter,
  Plus,
  Calendar,
  Building,
  User,
  Clock,
  Phone,
  Video,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles
  ,ArrowRight
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { FollowUpRecord } from '../../types';
import { CRMJourneyTimeline } from './CRMJourneyTimeline';
import { DataTable } from '../common/DataTable';
import { ListToolbar } from '../common/ListToolbar';
import { useAppCrm } from '../../hooks/useAppCrm';

export const CRMFollowupsView: React.FC = () => {
  const { followUps: followups, addFollowUp: addFollowup, customers, opportunities, openPageTab, addToast } = useAppCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const [selectedFollowup, setSelectedFollowup] = useState<FollowUpRecord | null>(null);

  // Modal State (新增跟进: 客户、跟进内容、客户联系人、跟进机会/商机、跟进类型、跟进时间)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formCustomerName, setFormCustomerName] = useState(customers[0]?.name || '国家电网华东分部数智调度中心');
  const [formContactName, setFormContactName] = useState('张总 (信息化部部长)');
  const [formRelatedOpp, setFormRelatedOpp] = useState('国家电网数智调度协同平台定制采购');
  const [formMethod, setFormMethod] = useState('现场拜访');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formContent, setFormContent] = useState('');
  const [formFeedback, setFormFeedback] = useState('');
  const [formNextDate, setFormNextDate] = useState('2026-09-12');
  const [formNextGoal, setFormNextGoal] = useState('组织架构师与客户进行技术POC演示');
  const [formAttachments, setFormAttachments] = useState<string[]>([]);

  const handleSaveFollowup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) {
      addToast('warning', '请填写跟进记录详细内容');
      return;
    }

    const matchedCustomer = customers.find((c) => c.name === formCustomerName);

    if (!matchedCustomer) {
      addToast('warning', '请先创建或选择有效客户');
      return;
    }
    const matchedOpportunity = opportunities.find((item) => item.name === formRelatedOpp && item.customerId === matchedCustomer.id);
    addFollowup({
      customerId: matchedCustomer.id,
      customerName: formCustomerName,
      opportunityId: matchedOpportunity?.id,
      contactName: formContactName,
      followType: formMethod,
      followTime: formDate,
      content: formContent,
      feedback: formFeedback || '客户整体反响积极，认可信创全栈支持能力',
      nextPlanDate: formNextDate,
      nextFollowPlan: formNextGoal,
      ownerName: '周销售',
      attachments: formAttachments
    });

    setIsModalOpen(false);
    setFormContent('');
    setFormFeedback('');
    setFormAttachments([]);
    addToast('success', '跟进动态录入成功');
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = (Array.from(event.target.files || []) as File[]).slice(0, 3);
    if (!files.length) return;
    Promise.all(files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }))).then((items) => setFormAttachments((current) => [...current, ...items].slice(0, 3)))
      .catch(() => addToast('error', '附件读取失败', '请重新选择图片或视频文件'));
    event.target.value = '';
  };

  const filteredFollowups = followups.filter((f) => {
    const matchQuery =
      f.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchMethod = methodFilter === 'all' || f.method === methodFilter;
    return matchQuery && matchMethod;
  });

  // 4 Top Metrics: 累计跟进、本月跟进、已逾期跟进、今日需跟进
  const totalCount = followups.length;
  const thisMonthCount = followups.length;
  const overdueCount = 1;
  const todayDueCount = 3;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats: 累计跟进、本月跟进、已逾期跟进、今日需跟进 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-follow-total"
          title="累计跟进记录"
          value={totalCount}
          unit="次"
          change="+12次 本周"
          isPositive={true}
          subText="多渠道拜访交流"
          icon={<MessageSquare className="w-5 h-5" />}
        />
        <StatCard
          id="stat-follow-month"
          title="本月跟进总数"
          value={thisMonthCount}
          unit="次"
          change="85% 现场拜访"
          isPositive={true}
          subText="重点大客户覆盖率 100%"
          icon={<Calendar className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
        <StatCard
          id="stat-follow-overdue"
          title="已逾期未跟进"
          value={overdueCount}
          unit="家"
          change="需立即安排"
          isPositive={false}
          subText="超14天未拜访提醒"
          icon={<AlertCircle className="w-5 h-5" />}
          iconBgColor="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
        />
        <StatCard
          id="stat-follow-today"
          title="今日需跟进客户"
          value={todayDueCount}
          unit="家"
          change="待执行"
          isPositive={true}
          subText="含1场线上方案评审会"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
      </div>

      <ListToolbar searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="搜索客户名称、联系人、跟进内容..." filters={<>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有跟进类型</option>
            <option value="现场拜访">现场拜访</option>
            <option value="腾讯会议">腾讯会议</option>
            <option value="电话沟通">电话沟通</option>
            <option value="方案交流">方案交流</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有时间段</option>
            <option value="today">今天</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
        </>} actions={<button
          id="btn-add-followup"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新增跟进记录
        </button>} />

      {/* Followup List Table (列表字段: 客户名称、联系人、跟进类型、跟进内容、跟进时间、跟进人) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <DataTable>
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="py-3 px-4">客户名称</th>
                <th className="py-3 px-4">联系人</th>
                <th className="py-3 px-4">跟进类型</th>
                <th className="py-3 px-4">跟进内容</th>
                <th className="py-3 px-4">跟进时间</th>
                <th className="py-3 px-4">跟进人</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFollowups.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => setSelectedFollowup(f)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="hover:text-blue-600 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{f.customerName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    {f.contactName}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={f.method || '现场拜访'} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                    {f.content}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {f.date}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {f.creator || '周销售'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFollowup(f);
                      }}
                      className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                    >
                      详情 <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
        </DataTable>
      </div>

      {/* Followup Detail Drawer (详情页: 客户、联系人、跟进时间、跟进方式、下次跟进时间、下次跟进目标、跟进内容、客户反馈、现场照片/附件、关联商机) */}
      {selectedFollowup && (
        <Drawer
          isOpen={!!selectedFollowup}
          onClose={() => setSelectedFollowup(null)}
          title={`客户跟进记录详情 - ${selectedFollowup.customerName}`}
          subtitle={`跟进时间: ${selectedFollowup.date} · 记录人: ${selectedFollowup.creator || '周销售'}`}
          width="max-w-xl"
          footer={
            <button
              onClick={() => setSelectedFollowup(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              关闭
            </button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block">客户企业</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedFollowup.customerName}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">对接联系人</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedFollowup.contactName}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">跟进方式</span>
                <div className="mt-0.5">
                  <StatusTag status={selectedFollowup.method || '现场拜访'} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">跟进日期</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {selectedFollowup.date}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">下次计划跟进时间</span>
                <div className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                  {selectedFollowup.nextPlanDate || '2026-09-12'}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">下次推进目标</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedFollowup.nextGoal || '方案评审与PoC技术验证'}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">关联商机项目</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedFollowup.relatedOpp || '国家电网数智调度协同平台定制采购'}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">详细跟进记录内容</span>
                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                  {selectedFollowup.content}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">客户反馈与态度</span>
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-emerald-800 dark:text-emerald-300 mt-1">
                  {selectedFollowup.feedback || '客户整体反响积极，认可信创全栈支持能力'}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">现场照片与文件附件</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                    <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                    <span>现场技术交流纪要.pdf</span>
                  </div>
                </div>
              </div>
            </div>
            <CRMJourneyTimeline filters={{ customerId: selectedFollowup.customerId }} title="关联客户全量历程" />
          </div>
        </Drawer>
      )}

      {/* Add Followup Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="登记客户日常跟进动态"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveFollowup}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存跟进
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveFollowup} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                拜访客户 *
              </label>
              <select
                value={formCustomerName}
                onChange={(e) => setFormCustomerName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                对接联系人 *
              </label>
              <input
                type="text"
                value={formContactName}
                onChange={(e) => setFormContactName(e.target.value)}
                placeholder="例如：张总 (信息化部长)"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                跟进类型 *
              </label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="现场拜访">现场拜访</option>
                <option value="腾讯会议">腾讯会议</option>
                <option value="电话沟通">电话沟通</option>
                <option value="方案交流">方案交流</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                跟进时间 *
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                关联商机项目
              </label>
              <input
                type="text"
                value={formRelatedOpp}
                onChange={(e) => setFormRelatedOpp(e.target.value)}
                placeholder="关联商机或项目全称"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                跟进内容 *
              </label>
              <textarea
                rows={3}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="详细记录与客户交流要点、提出的痛点诉求与技术讨论情况..."
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                客户反馈与建议
              </label>
              <input
                type="text"
                value={formFeedback}
                onChange={(e) => setFormFeedback(e.target.value)}
                placeholder="例如：客户对私有化部署架构认可，要求下周出具详细网络拓扑图"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">补充附件</label>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleAttachmentChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium dark:file:bg-slate-800"
              />
              {formAttachments.length > 0 && <p className="mt-2 text-[11px] text-slate-500">已选择 {formAttachments.length} 个附件</p>}
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                下次跟进时间
              </label>
              <input
                type="date"
                value={formNextDate}
                onChange={(e) => setFormNextDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                下次跟进目标
              </label>
              <input
                type="text"
                value={formNextGoal}
                onChange={(e) => setFormNextGoal(e.target.value)}
                placeholder="例如：组织技术架构师现场交流"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Star,
  Building,
  Award,
  BookOpen,
  TrendingUp,
  MessageSquare,
  CheckCircle2
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';

export const CustomerReviewView: React.FC = () => {
  const { customers, projects, addToast, openPageTab } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [customerReviews, setCustomerReviews] = useState([
    {
      id: 'cr-1',
      customerName: '国家电网华东分部',
      projectName: '国家电网华东分布式协同调度平台一期',
      score: 98,
      evaluator: '张总 (信息化主任)',
      date: '2026-07-20',
      feedback: '师创团队展现了卓越的信创攻坚能力，在达梦数据库高并发适配和公安等保测评中表现出色，系统稳定可靠，完全满足调度大厅严苛业务要求。',
      upsellOpportunity: '已成功锁定二期扩容与AI智能调度中枢商机 (预估 ¥360万)',
      awardLetter: '已收到国家电网官方书面感谢信'
    },
    {
      id: 'cr-2',
      customerName: '招商局能源运输',
      projectName: '招商局智慧船务协同办公中枢',
      score: 96,
      evaluator: '孙处长',
      date: '2026-05-18',
      feedback: '项目交付准时，界面操作流畅，多语言与离线断网同步功能解决了远洋船只协同痛点，团队响应极快。',
      upsellOpportunity: '正在推进全集团海外分支机构推广项目',
      awardLetter: '获评2026年度优秀数字化供应商'
    }
  ]);

  const [formCustomer, setFormCustomer] = useState(customers[0]?.name || '');
  const [formProject, setFormProject] = useState(projects[0]?.name || '');
  const [formScore, setFormScore] = useState(98);
  const [formEvaluator, setFormEvaluator] = useState('客户分管领导');
  const [formFeedback, setFormFeedback] = useState('');
  const [formUpsell, setFormUpsell] = useState('');

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFeedback.trim()) {
      addToast('warning', '请填写客户评价与反馈');
      return;
    }

    setCustomerReviews([
      {
        id: `cr-${Date.now()}`,
        customerName: formCustomer,
        projectName: formProject,
        score: Number(formScore),
        evaluator: formEvaluator,
        date: new Date().toISOString().split('T')[0],
        feedback: formFeedback,
        upsellOpportunity: formUpsell || '已建立长期粘性，有望衍生运维与定制化二期',
        awardLetter: '已完成官方满意度评价表盖章'
      },
      ...customerReviews
    ]);
    setIsModalOpen(false);
    addToast('success', '客户交付复盘已归档');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="客户交付复盘总数"
          value={customerReviews.length}
          unit="家"
          subText="标杆客户口碑沉淀"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="综合客户满意度"
          value="97.2"
          unit="分"
          change="行业第一梯队"
          isPositive={true}
          subText="NPS 净推荐值 +82%"
          icon={<Star className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
        />
        <StatCard
          title="衍生增购/二期商机"
          value="¥840"
          unit="万元"
          change="+36% 增购率"
          isPositive={true}
          subText="续约率达 95%"
          icon={<TrendingUp className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="官方书面表扬信"
          value="5"
          unit="封"
          subText="国家电网/招商局等"
          icon={<Award className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索客户名称 / 评价关键词..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-72"
          />
        </div>

        <button
          id="btn-add-customer-review"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新增客户交付满意度复盘
        </button>
      </div>

      {/* Reviews Cards List */}
      <div className="space-y-4">
        {customerReviews
          .filter((r) => r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || r.feedback.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                    <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{r.customerName}</h4>
                    <span className="text-[11px] text-slate-400">
                      复盘项目：{r.projectName} · 评价人：{r.evaluator} · 日期：{r.date}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">客户评分</span>
                  <span className="font-bold text-amber-600 text-base">{r.score} 分 (满分100)</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">💬 客户官方反馈与验收评价：</span>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                  "{r.feedback}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg text-emerald-800 dark:text-emerald-300">
                  <span className="font-semibold">🚀 衍生商机与二次采购机会：</span>
                  <p className="mt-0.5">{r.upsellOpportunity}</p>
                </div>
                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 rounded-lg text-purple-800 dark:text-purple-300">
                  <span className="font-semibold">🏆 客户荣誉与表扬背书：</span>
                  <p className="mt-0.5">{r.awardLetter}</p>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => addToast('success', '已同步至知识库', '全员可在【知识库 - 案例沉淀】中查阅')}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  沉淀为公司标杆标书案例
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="登记客户交付复盘与口碑"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveReview}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存客户复盘
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveReview} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                客户主体 *
              </label>
              <select
                value={formCustomer}
                onChange={(e) => setFormCustomer(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                客户打分 (满分100) *
              </label>
              <input
                type="number"
                min="60"
                max="100"
                value={formScore}
                onChange={(e) => setFormScore(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              客户评价人与职位 *
            </label>
            <input
              type="text"
              required
              value={formEvaluator}
              onChange={(e) => setFormEvaluator(e.target.value)}
              placeholder="如：国家电网信息化中心主任"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              客户反馈原声评价 *
            </label>
            <textarea
              rows={4}
              required
              value={formFeedback}
              onChange={(e) => setFormFeedback(e.target.value)}
              placeholder="记录客户对交付质量、产品性能、团队态度等方面的具体评价..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              衍生增购或后续合作机会
            </label>
            <input
              type="text"
              value={formUpsell}
              onChange={(e) => setFormUpsell(e.target.value)}
              placeholder="如：计划在下季度启动二期AI智能调度中枢建设"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

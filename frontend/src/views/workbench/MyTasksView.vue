<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRouter} from 'vue-router';
import PageHeader from '../../components/common/PageHeader.vue';
import SegmentTabs from '../../components/common/SegmentTabs.vue';
import EmptyState from '../../components/common/EmptyState.vue';
import StatusTag from '../../components/common/StatusTag.vue';
import {workbenchRepository} from '../../services/workbenchRepository';

const router = useRouter();
const data = ref(workbenchRepository.load());

// Tab states
const taskTab = ref('pending');
const approvalTab = ref('pending');
const feedTab = ref('dynamic');

// Computed lists
const tasks = computed(() => 
  data.value.tasks.filter(item => 
    taskTab.value === 'done' ? item.status === '已完成' : item.status !== '已完成'
  )
);

const approvals = computed(() => {
  const items = data.value.approvals;
  if (approvalTab.value === 'pending') return items.filter(a => a.status === '待审批');
  if (approvalTab.value === 'my_apply') return items.filter(a => a.applicant === '当前用户');
  if (approvalTab.value === 'cc_me') return items; // 抄送我的，暂时返回全部
  return items.filter(a => a.status !== '待审批'); // 已审批
});

// Feed data with full structure
interface FeedItem {
  id: number;
  time: string;
  title: string;
  content: string;
  customer?: string;
}

const feedData: Record<string, FeedItem[]> = {
  dynamic: [
    { id: 1, time: '10分钟前', title: '师创智联OS V3.5.2 已发布至预发环境', content: '研发一组完成了达梦DM8方言兼容层自动化单元测试，通过率100%。' },
    { id: 2, time: '1小时前', title: '研发任务筛选能力进入验收', content: '商务大客户部提交【国家电网华东二期扩容】合同用印审批。' },
    { id: 3, time: '3小时前', title: '商务合同审批通过', content: '合同标的额480万元，已进入平台技术委员会审批节点。' }
  ],
  feedback: [
    { id: 4, time: '今天 09:30', title: '客户评价：申通智联上海分拨中心', content: '"新版移动端PDA扫码响应非常迅速，尤其在地下弱网环境下没有丢单，给一线员工减轻了极大负担，点赞！"', customer: '申通智联' },
    { id: 5, time: '昨天 17:40', title: '产品体验吐槽反馈', content: '"3D数字孪生看板在4K超宽屏显示器上有微距错位，希望在9月10日正式述标前能够修复完毕。"', customer: '智行新能源' }
  ],
  supervise: [
    { id: 6, time: '今天 09:20', title: '跟进国家电网二期合同用印审批', content: '请在今日 18:00 前补充法务确认单，并同步商务运营部。', customer: '国家电网华东分部' },
    { id: 7, time: '昨天 16:10', title: '完成智行新能源现场述标材料复核', content: '技术标与演示环境待技术负责人确认，截止 9 月 8 日 12:00。', customer: '智行新能源' }
  ]
};

const currentFeeds = computed(() => feedData[feedTab.value] || []);

// My OKRs with KRs
const myOkrs = computed(() => data.value.okrs.filter(x => x.category === 'my'));

// Mock customers count
const customersCount = 12;

const go = (id: string) => router.push(`/app/${id}`);
</script>

<template>
  <section class="workbench-view">
    <PageHeader 
      eyebrow="WORKBENCH" 
      title="我的工作台" 
      description="聚合待办、审批、目标和近期业务动态。"
    >
      <template #actions>
        <button class="secondary" @click="go('wb_work_orders')">进入工单中心</button>
      </template>
    </PageHeader>

    <!-- Top 4 Core Metrics -->
    <div class="metric-grid compact">
      <article @click="go('prod_req_tasks')">
        <span>待办事项</span>
        <strong>{{ data.tasks.filter(x => x.status !== '已完成').length }}</strong>
        <small>项</small>
      </article>
      <article @click="go('approval_center')">
        <span>待办审批</span>
        <strong>{{ data.approvals.filter(x => x.status === '待审批').length }}</strong>
        <small>单</small>
      </article>
      <article @click="go('crm_customers')">
        <span>跟进客户数</span>
        <strong>{{ customersCount }}</strong>
        <small>家</small>
      </article>
      <article @click="go('crm_opportunities')">
        <span>商机总额</span>
        <strong>1443</strong>
        <small>万元</small>
      </article>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="dashboard-grid">
      <!-- Card 1: 待办中心 -->
      <article class="panel">
        <div class="panel-head">
          <h3>待办中心</h3>
          <button class="link-button" @click="go('prod_req_tasks')">查看全部</button>
        </div>
        <SegmentTabs 
          v-model="taskTab" 
          :items="[
            { key: 'pending', label: '待处理', count: data.tasks.filter(x => x.status !== '已完成').length },
            { key: 'done', label: '已完成', count: data.tasks.filter(x => x.status === '已完成').length }
          ]"
        />
        <div v-if="tasks.length" class="stack-list">
          <button 
            v-for="item in tasks.slice(0, 4)" 
            :key="item.id" 
            class="list-row" 
            @click="go('prod_req_tasks')"
          >
            <span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.productLine }} · 截止 {{ item.dueDate }}</small>
            </span>
            <StatusTag :status="item.priority" />
          </button>
        </div>
        <EmptyState v-else title="暂无任务" />
      </article>

      <!-- Card 2: 审批流程 -->
      <article class="panel">
        <div class="panel-head">
          <h3>审批流程</h3>
          <button class="link-button" @click="go('approval_center')">查看全部</button>
        </div>
        <SegmentTabs 
          v-model="approvalTab" 
          :items="[
            { key: 'pending', label: '待审批', count: data.approvals.filter(x => x.status === '待审批').length },
            { key: 'my_apply', label: '我发起' },
            { key: 'cc_me', label: '抄送我' },
            { key: 'approved', label: '已审批' }
          ]"
        />
        <div v-if="approvals.length" class="stack-list">
          <button 
            v-for="item in approvals.slice(0, 4)" 
            :key="item.id" 
            class="list-row" 
            @click="go('approval_center')"
          >
            <span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.applicant }} · {{ item.createdAt }}</small>
            </span>
            <StatusTag :status="item.status" />
          </button>
        </div>
        <EmptyState v-else title="暂无审批" />
      </article>

      <!-- Card 3: 我的 OKR -->
      <article class="panel">
        <div class="panel-head">
          <h3>我的 OKR</h3>
          <button class="link-button" @click="go('wb_okr_perf')">目标详情</button>
        </div>
        <div class="okr-list">
          <div v-for="okr in myOkrs" :key="okr.id" class="okr-item">
            <div class="okr-header">
              <strong>{{ okr.objective }}</strong>
              <span class="okr-progress">{{ okr.progress }}%</span>
            </div>
            <div class="progress">
              <i :style="{ width: `${okr.progress}%` }" />
            </div>
            <small class="okr-deadline">截止 {{ okr.deadline }}</small>
            
            <!-- KR list -->
            <div v-if="okr.keyResults && okr.keyResults.length" class="kr-list">
              <div 
                v-for="(kr, idx) in okr.keyResults" 
                :key="kr.id" 
                class="kr-item"
              >
                <div class="kr-content">
                  <span class="kr-label">KR{{ idx + 1 }}: {{ kr.content }}</span>
                  <span class="kr-progress">{{ kr.progress }}%</span>
                </div>
                <div class="kr-meta">
                  <span>权重: {{ kr.weight }}%</span>
                  <span>截止: {{ kr.deadline }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <!-- Card 4: 动态与评价 -->
      <article class="panel">
        <div class="panel-head">
          <h3>动态与评价</h3>
        </div>
        <SegmentTabs 
          v-model="feedTab" 
          :items="[
            { key: 'dynamic', label: '产品动态' },
            { key: 'feedback', label: '评价反馈' },
            { key: 'supervise', label: '督办事项' }
          ]"
        />
        <div class="feed-timeline">
          <div 
            v-for="feed in currentFeeds" 
            :key="feed.id" 
            class="feed-item"
            :class="{ 'is-dynamic': feedTab === 'dynamic' }"
          >
            <time>{{ feed.time }}</time>
            <div class="feed-content">
              <strong>{{ feed.title }}</strong>
              <p>{{ feed.content }}</p>
              <small v-if="feed.customer">{{ feed.customer }}</small>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.workbench-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.metric-grid.compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metric-grid article {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.metric-grid article:hover {
  border-color: #2F66F6;
  box-shadow: 0 4px 12px rgba(47, 102, 246, 0.1);
}

.metric-grid article span {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.metric-grid article strong {
  font-size: 2rem;
  font-weight: 700;
  color: #0f172a;
}

.metric-grid article small {
  font-size: 0.75rem;
  color: #94a3b8;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.panel-head h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #0f172a;
}

.link-button {
  font-size: 0.75rem;
  color: #2F66F6;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  transition: background 0.2s;
}

.link-button:hover {
  background: #eff6ff;
}

.stack-list {
  display: flex;
  flex-direction: column;
  max-height: 320px;
  overflow-y: auto;
}

.list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  text-align: left;
  background: none;
  border-left: none;
  border-right: none;
  border-top: none;
  transition: background 0.2s;
}

.list-row:hover {
  background: #f8fafc;
}

.list-row span {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.list-row strong {
  font-size: 0.875rem;
  color: #0f172a;
  font-weight: 500;
}

.list-row small {
  font-size: 0.75rem;
  color: #64748b;
}

.okr-list {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.okr-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.okr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.okr-header strong {
  font-size: 0.875rem;
  color: #0f172a;
  font-weight: 600;
}

.okr-progress {
  font-size: 0.875rem;
  font-weight: 600;
  color: #2F66F6;
}

.progress {
  height: 0.5rem;
  background: #f1f5f9;
  border-radius: 0.25rem;
  overflow: hidden;
}

.progress i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #2F66F6, #60a5fa);
  border-radius: 0.25rem;
  transition: width 0.3s;
}

.okr-deadline {
  font-size: 0.75rem;
  color: #64748b;
}

.kr-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding-left: 1rem;
  border-left: 2px solid #e2e8f0;
}

.kr-item {
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kr-content {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.kr-label {
  font-size: 0.8125rem;
  color: #475569;
  flex: 1;
}

.kr-progress {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #2F66F6;
}

.kr-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: #94a3b8;
}

.feed-timeline {
  padding: 1.5rem;
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.feed-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid #f1f5f9;
}

.feed-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.feed-item.is-dynamic {
  position: relative;
  padding-left: 1.5rem;
}

.feed-item.is-dynamic::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.25rem;
  width: 0.625rem;
  height: 0.625rem;
  background: #2F66F6;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px #2F66F6;
}

.feed-item time {
  font-size: 0.6875rem;
  color: #94a3b8;
}

.feed-content {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.feed-content strong {
  font-size: 0.875rem;
  color: #0f172a;
  font-weight: 600;
}

.feed-content p {
  font-size: 0.8125rem;
  color: #475569;
  line-height: 1.5;
}

.feed-content small {
  font-size: 0.6875rem;
  color: #94a3b8;
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>

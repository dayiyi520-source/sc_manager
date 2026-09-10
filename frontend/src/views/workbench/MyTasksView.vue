<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRouter} from 'vue-router';
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
  return items.filter(a => a.status !== '待审批');
});

// Feed data
interface FeedItem {
  id: number;
  time: string;
  title: string;
  content: string;
  customer?: string;
}

const feedData: Record<string, FeedItem[]> = {
  dynamic: [
    { id: 1, time: '10分钟前', title: '师创智联OS V3.5.2 成功构建并发布至预发回归环境', content: '研发一组完成了达梦DM8方言兼容层自动化单元测试，通过率100%。' },
    { id: 2, time: '1小时前', title: '商务大客户部提交【国家电网华东二期扩容】合同用印审批', content: '合同标的额480万元，已进入平台技术委员会审批节点。' }
  ],
  feedback: [
    { id: 4, time: '今天 09:30', title: '客户评价：申通智联上海分拨中心', content: '"新版移动端PDA扫码响应非常迅速，点赞！"', customer: '申通智联' }
  ],
  supervise: [
    { id: 6, time: '今天 09:20', title: '跟进国家电网二期合同用印审批', content: '请在今日 18:00 前补充法务确认单。', customer: '国家电网华东分部' }
  ]
};

const currentFeeds = computed(() => feedData[feedTab.value] || []);
const myOkrs = computed(() => data.value.okrs.filter(x => x.category === 'my'));
const customersCount = 6;

const go = (id: string) => router.push(`/app/${id}`);
</script>

<template>
  <div class="my-tasks-view">
    <!-- 顶部统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card blue" @click="go('prod_req_tasks')">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">待办事项</div>
          <div class="stat-value">
            <span class="stat-number">{{ data.tasks.filter(x => x.status !== '已完成').length }}</span>
            <span class="stat-unit">项</span>
          </div>
        </div>
      </div>

      <div class="stat-card rose" @click="go('approval_center')">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">待办审批</div>
          <div class="stat-value">
            <span class="stat-number">{{ data.approvals.filter(x => x.status === '待审批').length }}</span>
            <span class="stat-unit">单</span>
          </div>
        </div>
      </div>

      <div class="stat-card purple" @click="go('crm_customers')">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">跟进客户数</div>
          <div class="stat-value">
            <span class="stat-number">{{ customersCount }}</span>
            <span class="stat-unit">家</span>
          </div>
        </div>
      </div>

      <div class="stat-card green" @click="go('crm_opportunities')">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
        </div>
        <div class="stat-content">
          <div class="stat-label">商机总额</div>
          <div class="stat-value">
            <span class="stat-number">1,443</span>
            <span class="stat-unit">万元</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="main-grid">
      <!-- 左侧：待办中心 -->
      <div class="card large">
        <div class="card-header">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            待办中心
          </div>
          <div class="tabs">
            <button :class="{active: taskTab === 'pending'}" @click="taskTab = 'pending'">
              待处理 ({{ tasks.length }})
            </button>
            <button :class="{active: taskTab === 'done'}" @click="taskTab = 'done'">
              已完成 ({{ data.tasks.filter(x => x.status === '已完成').length }})
            </button>
          </div>
        </div>
        <div class="card-body">
          <div v-for="task in tasks.slice(0, 5)" :key="task.id" class="list-item">
            <div class="item-content">
              <div class="item-title">{{ task.title }}</div>
              <div class="item-meta">
                <span>需求编号：{{ task.id }}</span>
                <span>·</span>
                <span>负责人：{{ task.productLine }}</span>
                <span>·</span>
                <span>截止：{{ task.dueDate }}</span>
              </div>
            </div>
            <button class="btn-primary-sm" @click="go('prod_req_tasks')">去处理</button>
          </div>
        </div>
      </div>

      <!-- 右侧：审批中心 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            审批中心
          </div>
          <div class="tabs">
            <button :class="{active: approvalTab === 'pending'}" @click="approvalTab = 'pending'">待审批</button>
            <button :class="{active: approvalTab === 'my_apply'}" @click="approvalTab = 'my_apply'">我申请的</button>
            <button :class="{active: approvalTab === 'done'}" @click="approvalTab = 'done'">已处理</button>
          </div>
        </div>
        <div class="card-body">
          <div v-for="approval in approvals.slice(0, 5)" :key="approval.id" class="list-item">
            <div class="item-content">
              <div class="item-title">{{ approval.title }}</div>
              <div class="item-meta">
                <span>申请人：{{ approval.applicant }}</span>
              </div>
            </div>
            <button class="btn-primary-sm" @click="go('approval_center')">查看</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部区域 -->
    <div class="bottom-grid">
      <!-- 左侧：我的OKR进度 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            我的OKR进度
          </div>
          <a href="#" class="link-sm" @click.prevent="go('wb_okr_perf')">查看详情 →</a>
        </div>
        <div class="card-body">
          <div v-for="okr in myOkrs" :key="okr.id" class="okr-section">
            <div class="okr-header">
              <div class="okr-title">{{ okr.objective }}</div>
              <div class="okr-progress">{{ okr.progress }}%</div>
            </div>
            <div class="okr-period">{{ okr.cycle }} · 截止：{{ okr.deadline }}</div>
            
            <div v-for="kr in okr.keyResults" :key="kr.id" class="kr-item">
              <div class="kr-header">
                <div class="kr-title">{{ kr.content }}</div>
                <div class="kr-progress">{{ kr.progress }}%</div>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{width: `${kr.progress}%`}"></div>
              </div>
              <div class="kr-meta">权重：{{ kr.weight }}% · 截止：{{ kr.deadline }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：动态与评价 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            动态与评价
          </div>
          <div class="tabs">
            <button :class="{active: feedTab === 'dynamic'}" @click="feedTab = 'dynamic'">产品动态</button>
            <button :class="{active: feedTab === 'feedback'}" @click="feedTab = 'feedback'">评价吐槽</button>
            <button :class="{active: feedTab === 'supervise'}" @click="feedTab = 'supervise'">督办事项</button>
          </div>
        </div>
        <div class="card-body">
          <div v-for="feed in currentFeeds" :key="feed.id" class="feed-item">
            <div class="feed-time">{{ feed.time }}</div>
            <div class="feed-title">{{ feed.title }}</div>
            <div class="feed-content">{{ feed.content }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-tasks-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-main);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: var(--border-strong);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card.blue .stat-icon {
  background: rgba(59, 130, 246, 0.1);
  color: #3B82F6;
}

.stat-card.rose .stat-icon {
  background: rgba(251, 113, 133, 0.1);
  color: #FB7185;
}

.stat-card.purple .stat-icon {
  background: rgba(168, 85, 247, 0.1);
  color: #A855F7;
}

.stat-card.green .stat-icon {
  background: rgba(34, 197, 94, 0.1);
  color: #22C55E;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-unit {
  font-size: 14px;
  color: var(--text-muted);
}

/* 主要网格布局 */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.main-grid .card.large {
  grid-column: span 1;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* 卡片 */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-main);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-main);
  gap: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-title svg {
  color: var(--primary);
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-surface);
  padding: 3px;
  border-radius: 8px;
}

.tabs button {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tabs button:hover {
  color: var(--text-primary);
}

.tabs button.active {
  background: var(--bg-card);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.link-sm {
  font-size: 12px;
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.link-sm:hover {
  color: var(--primary-hover);
}

.card-body {
  padding: 0;
}

/* 列表项 */
.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-main);
  transition: background 0.2s;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: var(--bg-surface-soft);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.btn-primary-sm {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background: var(--primary);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary-sm:hover {
  background: var(--primary-hover);
}

/* OKR 区域 */
.okr-section {
  padding: 20px;
  border-bottom: 1px solid var(--border-main);
}

.okr-section:last-child {
  border-bottom: none;
}

.okr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.okr-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.okr-progress {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}

.okr-period {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.kr-item {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-surface-soft);
  border-radius: 8px;
}

.kr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.kr-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.kr-progress {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary);
}

.progress-bar {
  height: 6px;
  background: var(--bg-surface);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--primary-hover));
  border-radius: 3px;
  transition: width 0.3s;
}

.kr-meta {
  font-size: 11px;
  color: var(--text-muted);
}

/* 动态列表 */
.feed-item {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-main);
}

.feed-item:last-child {
  border-bottom: none;
}

.feed-time {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.feed-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.feed-content {
  font-size: 13px;
  color: var(--text-body);
  line-height: 1.6;
}

/* 响应式 */
@media (max-width: 1024px) {
  .main-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }
  
  .main-grid .card.large {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .tabs {
    overflow-x: auto;
  }
}
</style>

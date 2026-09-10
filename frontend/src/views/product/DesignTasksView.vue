<script setup lang="ts">
import { ref, computed } from 'vue';
import StatusTag from '../../components/common/StatusTag.vue';
import SearchFilterBar from '../../components/common/SearchFilterBar.vue';
import EmptyState from '../../components/common/EmptyState.vue';
import DetailDrawer from '../../components/common/DetailDrawer.vue';

interface DesignTask {
  id: string;
  title: string;
  designer: string;
  priority: string;
  status: string;
  type: string;
  deliverables: string;
  estimatedHours: number;
  spentHours: number;
  description: string;
  requirementId?: string;
  createdAt: string;
}

const searchQuery = ref('');
const statusFilter = ref('all');
const typeFilter = ref('all');
const selectedTask = ref<DesignTask | null>(null);
const createOpen = ref(false);

// 模拟数据
const designTasks = ref<DesignTask[]>([
  {
    id: 'DESIGN-001',
    title: '用户中心界面设计',
    designer: '王芳',
    priority: 'P1-高优',
    status: '设计中',
    type: 'UI设计',
    deliverables: 'Figma 设计稿',
    estimatedHours: 16,
    spentHours: 8,
    description: '设计用户中心的界面布局和交互流程',
    createdAt: '2026-09-08'
  },
  {
    id: 'DESIGN-002',
    title: '产品宣传海报设计',
    designer: '李娜',
    priority: 'P2-普通',
    status: '待开始',
    type: '视觉设计',
    deliverables: 'PSD 源文件 + PNG 导出',
    estimatedHours: 8,
    spentHours: 0,
    description: '为新产品发布设计宣传海报',
    createdAt: '2026-09-09'
  }
]);

const taskStatuses = ['待开始', '设计中', '待评审', '评审中', '已通过', '待修改', '已完成'];
const taskTypes = ['UI设计', 'UX设计', '交互设计', '视觉设计', '图标设计', '插画设计'];

const filteredTasks = computed(() => {
  return designTasks.value.filter(task => {
    const matchQuery = task.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                       task.designer.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchStatus = statusFilter.value === 'all' || task.status === statusFilter.value;
    const matchType = typeFilter.value === 'all' || task.type === typeFilter.value;
    return matchQuery && matchStatus && matchType;
  });
});

const stats = computed(() => ({
  total: designTasks.value.length,
  inProgress: designTasks.value.filter(t => t.status === '设计中').length,
  pending: designTasks.value.filter(t => t.status === '待开始').length,
  completed: designTasks.value.filter(t => t.status === '已完成').length
}));
</script>

<template>
  <section class="workbench-view">
    <div class="page-actions">
      <button class="primary" @click="createOpen = true">创建设计任务</button>
    </div>

    <!-- 统计卡片 -->
    <div class="metric-grid compact">
      <article>
        <span>任务总数</span>
        <strong>{{ stats.total }}</strong>
        <small>个</small>
      </article>
      <article>
        <span>设计中</span>
        <strong>{{ stats.inProgress }}</strong>
        <small>个</small>
      </article>
      <article>
        <span>待开始</span>
        <strong>{{ stats.pending }}</strong>
        <small>个</small>
      </article>
      <article>
        <span>已完成</span>
        <strong>{{ stats.completed }}</strong>
        <small>个</small>
      </article>
    </div>

    <!-- 搜索和筛选 -->
    <SearchFilterBar v-model="searchQuery" placeholder="搜索任务标题、设计师..." :count="filteredTasks.length">
      <select v-model="statusFilter">
        <option value="all">全部状态</option>
        <option v-for="status in taskStatuses" :key="status" :value="status">{{ status }}</option>
      </select>
      <select v-model="typeFilter">
        <option value="all">全部类型</option>
        <option v-for="type in taskTypes" :key="type" :value="type">{{ type }}</option>
      </select>
    </SearchFilterBar>

    <!-- 任务列表 -->
    <div v-if="filteredTasks.length" class="task-list">
      <article v-for="task in filteredTasks" :key="task.id" class="task-item" @click="selectedTask = task">
        <div class="task-header">
          <div class="task-title-row">
            <h3>{{ task.title }}</h3>
            <StatusTag :status="task.status" />
          </div>
          <div class="task-meta">
            <span class="task-id">{{ task.id }}</span>
            <span class="task-type">🎨 {{ task.type }}</span>
            <StatusTag :status="task.priority" />
          </div>
        </div>
        <div class="task-footer">
          <div class="task-designer">
            <span>👤 {{ task.designer }}</span>
            <span>📦 {{ task.deliverables }}</span>
          </div>
          <div class="task-progress">
            <span>⏱️ {{ task.spentHours }}h / {{ task.estimatedHours }}h</span>
            <span>📅 {{ task.createdAt }}</span>
          </div>
        </div>
      </article>
    </div>
    <EmptyState v-else title="暂无设计任务" description="请创建新的设计任务" />

    <!-- 详情抽屉 -->
    <DetailDrawer :open="Boolean(selectedTask)" :title="selectedTask?.title || '任务详情'" @close="selectedTask = null">
      <template v-if="selectedTask">
        <div class="task-detail">
          <div class="detail-section">
            <h4>基本信息</h4>
            <dl class="detail-list">
              <dt>任务编号</dt>
              <dd>{{ selectedTask.id }}</dd>
              <dt>设计师</dt>
              <dd>{{ selectedTask.designer }}</dd>
              <dt>任务类型</dt>
              <dd>{{ selectedTask.type }}</dd>
              <dt>优先级</dt>
              <dd><StatusTag :status="selectedTask.priority" /></dd>
              <dt>状态</dt>
              <dd><StatusTag :status="selectedTask.status" /></dd>
              <dt>交付物</dt>
              <dd>{{ selectedTask.deliverables }}</dd>
            </dl>
          </div>
          <div class="detail-section">
            <h4>工时统计</h4>
            <dl class="detail-list">
              <dt>预计工时</dt>
              <dd>{{ selectedTask.estimatedHours }} 小时</dd>
              <dt>已用工时</dt>
              <dd>{{ selectedTask.spentHours }} 小时</dd>
            </dl>
          </div>
          <div class="detail-section">
            <h4>任务描述</h4>
            <p>{{ selectedTask.description }}</p>
          </div>
        </div>
      </template>
    </DetailDrawer>

    <!-- 创建任务弹窗 -->
    <DetailDrawer :open="createOpen" title="创建设计任务" @close="createOpen = false">
      <form class="work-item-form" @submit.prevent="createOpen = false">
        <label>任务标题<input required placeholder="请输入任务标题" /></label>
        <label>设计师<input required placeholder="请输入设计师姓名" /></label>
        <div class="form-grid">
          <label>任务类型
            <select required>
              <option value="">请选择任务类型</option>
              <option v-for="type in taskTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label>优先级
            <select required>
              <option value="">请选择优先级</option>
              <option value="P0-紧急阻断">P0-紧急阻断</option>
              <option value="P1-高优">P1-高优</option>
              <option value="P2-普通">P2-普通</option>
              <option value="P3-低优">P3-低优</option>
            </select>
          </label>
        </div>
        <label>交付物<input required placeholder="例如：Figma 设计稿、PSD 源文件" /></label>
        <label>预计工时<input type="number" required placeholder="小时" /></label>
        <label>任务描述<textarea rows="5" placeholder="请输入任务描述" /></label>
        <div class="form-actions">
          <button type="button" class="secondary" @click="createOpen = false">取消</button>
          <button type="submit" class="primary">创建任务</button>
        </div>
      </form>
    </DetailDrawer>
  </section>
</template>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  padding: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-main);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.task-item:hover {
  border-color: var(--border-strong);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.task-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.task-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.task-title-row h3 {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: var(--text-primary);
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-muted);
}

.task-id {
  font-weight: 500;
  color: var(--primary);
}

.task-type {
  display: flex;
  align-items: center;
  gap: 4px;
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.task-designer {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-body);
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.task-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--text-primary);
}

.detail-section p {
  margin: 0;
  line-height: 1.6;
  color: var(--text-body);
}
</style>

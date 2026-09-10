<script setup lang="ts">
import { ref, computed } from 'vue';
import StatusTag from '../../components/common/StatusTag.vue';
import SearchFilterBar from '../../components/common/SearchFilterBar.vue';
import EmptyState from '../../components/common/EmptyState.vue';
import DetailDrawer from '../../components/common/DetailDrawer.vue';

interface BugItem {
  id: string;
  title: string;
  productLineName: string;
  versionName: string;
  type: string;
  severity: string;
  priority: string;
  status: string;
  assignee: string;
  env: string;
  description: string;
  steps: string;
  createdAt: string;
}

const searchQuery = ref('');
const severityFilter = ref('all');
const statusFilter = ref('all');
const envFilter = ref('all');
const selectedBug = ref<BugItem | null>(null);
const createOpen = ref(false);

// 模拟数据
const bugs = ref<BugItem[]>([
  {
    id: 'BUG-001',
    title: '登录页面验证码不显示',
    productLineName: '师创云平台',
    versionName: 'V2.1.0',
    type: '功能缺陷',
    severity: 'P1-严重',
    priority: '高',
    status: '待修复',
    assignee: '张瑞',
    env: '生产环境',
    description: '用户在登录页面无法看到验证码图片',
    steps: '1. 打开登录页面\n2. 查看验证码区域\n3. 发现验证码不显示',
    createdAt: '2026-09-09'
  },
  {
    id: 'BUG-002',
    title: '报表导出功能异常',
    productLineName: '数据分析平台',
    versionName: 'V1.5.2',
    type: '功能缺陷',
    severity: 'P2-一般',
    priority: '中',
    status: '修复中',
    assignee: '李明',
    env: '测试环境',
    description: '导出 Excel 报表时出现格式错误',
    steps: '1. 进入报表页面\n2. 点击导出按钮\n3. 查看导出的文件',
    createdAt: '2026-09-08'
  }
]);

const bugStatuses = ['待修复', '修复中', '待验证', '已关闭', '已解决'];
const severityLevels = ['P0-致命', 'P1-严重', 'P2-一般', 'P3-轻微'];
const environments = ['开发环境', '测试环境', '预发布环境', '生产环境'];

const filteredBugs = computed(() => {
  return bugs.value.filter(bug => {
    const matchQuery = bug.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                       bug.assignee.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchSeverity = severityFilter.value === 'all' || bug.severity === severityFilter.value;
    const matchStatus = statusFilter.value === 'all' || bug.status === statusFilter.value;
    const matchEnv = envFilter.value === 'all' || bug.env === envFilter.value;
    return matchQuery && matchSeverity && matchStatus && matchEnv;
  });
});

const stats = computed(() => ({
  total: bugs.value.length,
  pending: bugs.value.filter(b => b.status === '待修复').length,
  fixing: bugs.value.filter(b => b.status === '修复中').length,
  closed: bugs.value.filter(b => b.status === '已关闭').length
}));
</script>

<template>
  <section class="workbench-view">
    <div class="page-actions">
      <button class="primary" @click="createOpen = true">提交缺陷</button>
    </div>

    <!-- 统计卡片 -->
    <div class="metric-grid compact">
      <article>
        <span>缺陷总数</span>
        <strong>{{ stats.total }}</strong>
        <small>个</small>
      </article>
      <article>
        <span>待修复</span>
        <strong>{{ stats.pending }}</strong>
        <small>个</small>
      </article>
      <article>
        <span>修复中</span>
        <strong>{{ stats.fixing }}</strong>
        <small>个</small>
      </article>
      <article>
        <span>已关闭</span>
        <strong>{{ stats.closed }}</strong>
        <small>个</small>
      </article>
    </div>

    <!-- 搜索和筛选 -->
    <SearchFilterBar v-model="searchQuery" placeholder="搜索缺陷标题、处理人..." :count="filteredBugs.length">
      <select v-model="severityFilter">
        <option value="all">全部严重程度</option>
        <option v-for="level in severityLevels" :key="level" :value="level">{{ level }}</option>
      </select>
      <select v-model="statusFilter">
        <option value="all">全部状态</option>
        <option v-for="status in bugStatuses" :key="status" :value="status">{{ status }}</option>
      </select>
      <select v-model="envFilter">
        <option value="all">全部环境</option>
        <option v-for="env in environments" :key="env" :value="env">{{ env }}</option>
      </select>
    </SearchFilterBar>

    <!-- 缺陷列表 -->
    <div v-if="filteredBugs.length" class="bug-list">
      <article v-for="bug in filteredBugs" :key="bug.id" class="bug-item" @click="selectedBug = bug">
        <div class="bug-header">
          <div class="bug-title-row">
            <h3>{{ bug.title }}</h3>
            <div class="bug-tags">
              <StatusTag :status="bug.severity" />
              <StatusTag :status="bug.status" />
            </div>
          </div>
          <div class="bug-meta">
            <span class="bug-id">{{ bug.id }}</span>
            <span>📦 {{ bug.productLineName }}</span>
            <span>🏷️ {{ bug.versionName }}</span>
            <span>🔧 {{ bug.type }}</span>
            <span>🌍 {{ bug.env }}</span>
          </div>
        </div>
        <div class="bug-footer">
          <div class="bug-assignee">
            <span>👤 {{ bug.assignee }}</span>
          </div>
          <div class="bug-date">
            <span>📅 {{ bug.createdAt }}</span>
          </div>
        </div>
      </article>
    </div>
    <EmptyState v-else title="暂无缺陷" description="请提交新的缺陷" />

    <!-- 详情抽屉 -->
    <DetailDrawer :open="Boolean(selectedBug)" :title="selectedBug?.title || '缺陷详情'" @close="selectedBug = null">
      <template v-if="selectedBug">
        <div class="bug-detail">
          <div class="detail-section">
            <h4>基本信息</h4>
            <dl class="detail-list">
              <dt>缺陷编号</dt>
              <dd>{{ selectedBug.id }}</dd>
              <dt>产品线</dt>
              <dd>{{ selectedBug.productLineName }}</dd>
              <dt>版本</dt>
              <dd>{{ selectedBug.versionName }}</dd>
              <dt>缺陷类型</dt>
              <dd>{{ selectedBug.type }}</dd>
              <dt>严重程度</dt>
              <dd><StatusTag :status="selectedBug.severity" /></dd>
              <dt>优先级</dt>
              <dd>{{ selectedBug.priority }}</dd>
              <dt>状态</dt>
              <dd><StatusTag :status="selectedBug.status" /></dd>
              <dt>处理人</dt>
              <dd>{{ selectedBug.assignee }}</dd>
              <dt>环境</dt>
              <dd>{{ selectedBug.env }}</dd>
            </dl>
          </div>
          <div class="detail-section">
            <h4>缺陷描述</h4>
            <p>{{ selectedBug.description }}</p>
          </div>
          <div class="detail-section">
            <h4>复现步骤</h4>
            <pre>{{ selectedBug.steps }}</pre>
          </div>
        </div>
      </template>
    </DetailDrawer>

    <!-- 创建缺陷弹窗 -->
    <DetailDrawer :open="createOpen" title="提交缺陷" @close="createOpen = false">
      <form class="work-item-form" @submit.prevent="createOpen = false">
        <label>缺陷名称<input required placeholder="请输入缺陷名称" /></label>
        <div class="form-grid">
          <label>所属产品线<input required placeholder="请输入产品线" /></label>
          <label>关联版本<input required placeholder="请输入版本号" /></label>
        </div>
        <div class="form-grid">
          <label>缺陷类型
            <select required>
              <option value="">请选择缺陷类型</option>
              <option value="功能缺陷">功能缺陷</option>
              <option value="性能问题">性能问题</option>
              <option value="界面问题">界面问题</option>
              <option value="兼容性问题">兼容性问题</option>
            </select>
          </label>
          <label>严重程度
            <select required>
              <option value="">请选择严重程度</option>
              <option value="P0-致命">P0-致命</option>
              <option value="P1-严重">P1-严重</option>
              <option value="P2-一般">P2-一般</option>
              <option value="P3-轻微">P3-轻微</option>
            </select>
          </label>
        </div>
        <div class="form-grid">
          <label>处理人<input required placeholder="请输入处理人姓名" /></label>
          <label>所属环境
            <select required>
              <option value="">请选择环境</option>
              <option value="开发环境">开发环境</option>
              <option value="测试环境">测试环境</option>
              <option value="预发布环境">预发布环境</option>
              <option value="生产环境">生产环境</option>
            </select>
          </label>
        </div>
        <label>缺陷描述<textarea rows="4" required placeholder="请描述缺陷现象" /></label>
        <label>复现步骤<textarea rows="4" required placeholder="请输入复现步骤" /></label>
        <div class="form-actions">
          <button type="button" class="secondary" @click="createOpen = false">取消</button>
          <button type="submit" class="primary">提交缺陷</button>
        </div>
      </form>
    </DetailDrawer>
  </section>
</template>

<style scoped>
.bug-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bug-item {
  padding: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-main);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.bug-item:hover {
  border-color: var(--border-strong);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.bug-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.bug-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.bug-title-row h3 {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: var(--text-primary);
}

.bug-tags {
  display: flex;
  gap: 8px;
}

.bug-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-muted);
}

.bug-id {
  font-weight: 500;
  color: #dc2626;
}

.bug-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-body);
}

.bug-detail {
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

.detail-section pre {
  margin: 0;
  padding: 12px;
  background: var(--bg-elevated);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--text-body);
}
</style>

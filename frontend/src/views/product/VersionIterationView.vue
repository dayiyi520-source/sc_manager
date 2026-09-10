<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Calendar, GitBranch, ListTodo, Bug } from 'lucide-vue-next';
import { useQuery } from '@tanstack/vue-query';

interface Version {
  id: string;
  name: string;
  code?: string;
  status: string;
  releaseDate?: string;
  productLineId?: string;
  productLineName?: string;
  requirementsCount?: number;
  completedReqCount?: number;
  tasksCount?: number;
  bugsCount?: number;
}

interface RequirementTask {
  id: string;
  title: string;
  status: string;
  ownerName: string;
  priority: string;
  versionId?: string;
  versionName?: string;
}

interface DevTask {
  id: string;
  title: string;
  status: string;
  developer?: string;
  priority: string;
  versionName?: string;
}

interface BugItem {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  severity: string;
  versionName?: string;
  createdAt?: string;
}

const props = defineProps<{
  productLineId?: string;
}>();

// 模拟数据查询
const versionsQuery = useQuery<Version[]>({
  queryKey: ['versions', props.productLineId],
  queryFn: async () => []
});

const requirementsQuery = useQuery<RequirementTask[]>({
  queryKey: ['requirements'],
  queryFn: async () => []
});

const devTasksQuery = useQuery<DevTask[]>({
  queryKey: ['dev-tasks'],
  queryFn: async () => []
});

const bugsQuery = useQuery<BugItem[]>({
  queryKey: ['bugs'],
  queryFn: async () => []
});

const versions = computed(() => versionsQuery.data.value || []);
const requirements = computed(() => requirementsQuery.data.value || []);
const devTasks = computed(() => devTasksQuery.data.value || []);
const bugs = computed(() => bugsQuery.data.value || []);

// 视图模式
type ViewMode = 'list' | 'detail' | 'planning';
const viewMode = ref<ViewMode>('list');

// 详情Tab
type DetailTab = 'requirements' | 'tasks' | 'bugs';
const detailTab = ref<DetailTab>('requirements');

// 选中的版本
const selectedVersionId = ref<string>('');
const selectedVersion = computed(() => 
  versions.value.find((v: Version) => v.id === selectedVersionId.value) || versions.value[0]
);

// 搜索和筛选
const searchQuery = ref('');
const statusFilter = ref('all');

// 过滤后的版本列表
const filteredVersions = computed(() => {
  let result = versions.value;
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((v: Version) => 
      v.name.toLowerCase().includes(q) || 
      (v.code || '').toLowerCase().includes(q)
    );
  }
  
  if (statusFilter.value !== 'all') {
    result = result.filter((v: Version) => v.status === statusFilter.value);
  }
  
  return result;
});

// 当前版本关联的需求/任务/缺陷
const versionRequirements = computed(() => {
  if (!selectedVersion.value) return [];
  return requirements.value.filter((r: RequirementTask) => 
    r.versionId === selectedVersion.value?.id || 
    r.versionName === selectedVersion.value?.name
  );
});

const versionTasks = computed(() => {
  if (!selectedVersion.value) return [];
  return devTasks.value.filter((t: DevTask) => 
    t.versionName === selectedVersion.value?.name
  );
});

const versionBugs = computed(() => {
  if (!selectedVersion.value) return [];
  return bugs.value.filter((b: BugItem) => 
    b.versionName === selectedVersion.value?.name
  );
});

// 进度计算
function versionProgress(version: Version): number {
  const total = version.requirementsCount || 1;
  const completed = version.completedReqCount || 0;
  return Math.round((completed / total) * 100);
}

// 模态框
const showCreateModal = ref(false);

function openDetail(version: Version) {
  selectedVersionId.value = version.id;
  viewMode.value = 'detail';
}

function backToList() {
  viewMode.value = 'list';
}
</script>

<template>
  <div class="version-iteration-view">
    <!-- 列表视图 -->
    <div v-if="viewMode === 'list'" class="list-view">
      <!-- 工具栏 -->
      <div class="toolbar">
        <h2 class="title">版本迭代</h2>
        <div class="toolbar-actions">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索版本..."
            class="search-input"
          />
          <select v-model="statusFilter" class="status-filter">
            <option value="all">全部状态</option>
            <option value="规划中">规划中</option>
            <option value="开发中">开发中</option>
            <option value="测试中">测试中</option>
            <option value="已发布">已发布</option>
          </select>
          <button class="create-btn" @click="showCreateModal = true">
            <Plus :size="16" />
            新建版本
          </button>
        </div>
      </div>

      <!-- 版本卡片网格 -->
      <div class="versions-grid">
        <div
          v-for="version in filteredVersions"
          :key="version.id"
          class="version-card"
          @click="openDetail(version)"
        >
          <div class="card-header">
            <div>
              <h3 class="version-name">{{ version.name }}</h3>
              <p v-if="version.code" class="version-code">{{ version.code }}</p>
            </div>
            <span :class="['status-badge', version.status]">{{ version.status }}</span>
          </div>
          
          <div class="card-body">
            <div class="metric-row">
              <div class="metric">
                <Calendar :size="14" class="metric-icon" />
                <span>{{ version.releaseDate || '未设置' }}</span>
              </div>
              <div v-if="version.productLineName" class="metric">
                <GitBranch :size="14" class="metric-icon" />
                <span>{{ version.productLineName }}</span>
              </div>
            </div>
            
            <div class="progress-section">
              <div class="progress-label">
                <span>完成进度</span>
                <span class="progress-value">{{ versionProgress(version) }}%</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: `${versionProgress(version)}%` }"
                />
              </div>
            </div>
            
            <div class="stats-row">
              <div class="stat">
                <ListTodo :size="14" />
                <span>{{ version.requirementsCount || 0 }} 需求</span>
              </div>
              <div class="stat">
                <Bug :size="14" />
                <span>{{ version.bugsCount || 0 }} 缺陷</span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="filteredVersions.length === 0" class="empty-state">
          <p>暂无版本</p>
        </div>
      </div>
    </div>

    <!-- 详情视图 -->
    <div v-else-if="viewMode === 'detail' && selectedVersion" class="detail-view">
      <!-- 详情头部 -->
      <div class="detail-header">
        <button class="back-btn" @click="backToList">
          ← 返回列表
        </button>
        <div class="detail-title-section">
          <h2 class="detail-title">{{ selectedVersion.name }}</h2>
          <span :class="['status-badge', selectedVersion.status]">
            {{ selectedVersion.status }}
          </span>
        </div>
      </div>

      <!-- 版本信息卡片 -->
      <div class="version-info-card">
        <div class="info-grid">
          <div class="info-item">
            <label>版本编号</label>
            <div>{{ selectedVersion.code || '—' }}</div>
          </div>
          <div class="info-item">
            <label>发布日期</label>
            <div>{{ selectedVersion.releaseDate || '未设置' }}</div>
          </div>
          <div class="info-item">
            <label>所属产品线</label>
            <div>{{ selectedVersion.productLineName || '—' }}</div>
          </div>
          <div class="info-item">
            <label>完成进度</label>
            <div>{{ versionProgress(selectedVersion) }}%</div>
          </div>
        </div>
      </div>

      <!-- Tab导航 -->
      <div class="detail-tabs">
        <button
          :class="['tab', { active: detailTab === 'requirements' }]"
          @click="detailTab = 'requirements'"
        >
          需求 ({{ versionRequirements.length }})
        </button>
        <button
          :class="['tab', { active: detailTab === 'tasks' }]"
          @click="detailTab = 'tasks'"
        >
          任务 ({{ versionTasks.length }})
        </button>
        <button
          :class="['tab', { active: detailTab === 'bugs' }]"
          @click="detailTab = 'bugs'"
        >
          缺陷 ({{ versionBugs.length }})
        </button>
      </div>

      <!-- Tab内容 -->
      <div class="detail-content">
        <!-- 需求列表 -->
        <div v-if="detailTab === 'requirements'" class="table-wrapper">
          <table v-if="versionRequirements.length > 0" class="data-table">
            <thead>
              <tr>
                <th>需求标题</th>
                <th>状态</th>
                <th>负责人</th>
                <th>优先级</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="req in versionRequirements" :key="req.id">
                <td class="title-cell">{{ req.title }}</td>
                <td><span class="status-tag">{{ req.status }}</span></td>
                <td>{{ req.ownerName }}</td>
                <td><span :class="['priority-tag', req.priority]">{{ req.priority }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty">暂无需求</div>
        </div>

        <!-- 任务列表 -->
        <div v-else-if="detailTab === 'tasks'" class="table-wrapper">
          <table v-if="versionTasks.length > 0" class="data-table">
            <thead>
              <tr>
                <th>任务标题</th>
                <th>状态</th>
                <th>开发者</th>
                <th>优先级</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in versionTasks" :key="task.id">
                <td class="title-cell">{{ task.title }}</td>
                <td><span class="status-tag">{{ task.status }}</span></td>
                <td>{{ task.developer || '—' }}</td>
                <td><span :class="['priority-tag', task.priority]">{{ task.priority }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty">暂无任务</div>
        </div>

        <!-- 缺陷列表 -->
        <div v-else-if="detailTab === 'bugs'" class="table-wrapper">
          <table v-if="versionBugs.length > 0" class="data-table">
            <thead>
              <tr>
                <th>缺陷标题</th>
                <th>状态</th>
                <th>负责人</th>
                <th>严重程度</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bug in versionBugs" :key="bug.id">
                <td class="title-cell">{{ bug.title }}</td>
                <td><span class="status-tag">{{ bug.status }}</span></td>
                <td>{{ bug.assignee || '—' }}</td>
                <td><span class="severity-tag">{{ bug.severity }}</span></td>
                <td class="text-muted">{{ bug.createdAt || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="empty">暂无缺陷</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.version-iteration-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-page);
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-main);
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input, .status-filter {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.search-input {
  width: 200px;
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.create-btn:hover {
  background: var(--primary-hover);
}

/* 版本卡片网格 */
.list-view {
  flex: 1;
  overflow-y: auto;
}

.versions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 24px;
}

.version-card {
  padding: 20px;
  border: 1px solid var(--border-main);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
}

.version-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.version-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.version-code {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.规划中 { background: #e3f2fd; color: #1565c0; }
.status-badge.开发中 { background: #fff3e0; color: #e65100; }
.status-badge.测试中 { background: #f3e5f5; color: #6a1b9a; }
.status-badge.已发布 { background: #e8f5e9; color: #2e7d32; }

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.metric {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

.metric-icon {
  flex-shrink: 0;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}

.progress-value {
  font-weight: 600;
  color: var(--text-primary);
}

.progress-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--bg-surface-soft);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s;
}

.stats-row {
  display: flex;
  gap: 16px;
  padding-top: 8px;
  border-top: 1px solid var(--border-main);
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 13px;
}

/* 详情视图 */
.detail-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  padding: 16px 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-main);
}

.back-btn {
  margin-bottom: 12px;
  padding: 6px 12px;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.back-btn:hover {
  background: var(--bg-surface-soft);
}

.detail-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.version-info-card {
  padding: 20px 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-main);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  color: var(--text-muted);
  font-size: 13px;
}

.info-item div {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.detail-tabs {
  display: flex;
  gap: 8px;
  padding: 0 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-main);
}

.tab {
  padding: 12px 16px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  border-bottom-color: var(--primary);
  color: var(--primary);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* 表格 */
.table-wrapper {
  background: var(--bg-card);
  border-radius: 8px;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  padding: 12px 16px;
  background: var(--bg-surface-soft);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.data-table td {
  padding: 12px 16px;
  border-top: 1px solid var(--border-main);
  color: var(--text-primary);
  font-size: 14px;
}

.data-table tbody tr:hover {
  background: var(--bg-surface-soft);
}

.title-cell {
  font-weight: 500;
}

.status-tag, .priority-tag, .severity-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-tag { background: var(--bg-surface-soft); }
.priority-tag.紧急 { background: #fee; color: #c00; }
.priority-tag.高 { background: #fff3e0; color: #e65100; }
.priority-tag.中 { background: #e3f2fd; color: #1565c0; }
.priority-tag.低 { background: #f5f5f5; color: #616161; }
.severity-tag { background: #ffebee; color: #c62828; }

.text-muted {
  color: var(--text-muted);
}

.empty, .empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-muted);
  font-size: 14px;
}
</style>

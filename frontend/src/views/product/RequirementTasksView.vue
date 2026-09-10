<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Filter, Plus, X } from 'lucide-vue-next';
import { useQuery } from '@tanstack/vue-query';
import type { RequirementTask, TaskKind } from '../../types/product';
import RequirementTaskModal from '../../components/product/RequirementTaskModal.vue';

const props = defineProps<{
  kind?: TaskKind;
  productLineId?: string;
}>();

// Mock data - 实际项目中应该从API获取
const tasksQuery = useQuery({
  queryKey: ['requirement-tasks', props.kind, props.productLineId],
  queryFn: async () => {
    // TODO: 替换为实际API调用
    return [] as RequirementTask[];
  }
});

const tasks = computed(() => tasksQuery.data.value || []);
const isLoading = computed(() => tasksQuery.isLoading.value);

const itemLabel = computed(() => {
  switch (props.kind) {
    case 'design': return '设计任务';
    case 'dev': return '研发任务';
    case 'bug': return '缺陷';
const props = defineProps<{
  kind?: TaskKind;
  productLineId?: string;
}>();
  }
});

// 状态选项
const statusOptions = ['待处理', '进行中', '已完成', '已关闭'];
const priorityOptions = ['紧急', '高', '中', '低'];

// 筛选和搜索
const activeTab = ref<'all' | 'my_owned' | 'my_created'>('all');
const searchQuery = ref('');
const selectedOwners = ref<string[]>([]);
const selectedStatuses = ref<string[]>([]);
const selectedPriorities = ref<string[]>([]);
const filterOpen = ref(false);

// 分页
const page = ref(1);
const pageSize = ref(10);

// 当前用户 (mock)
const currentUser = { name: '当前用户' };

// 过滤后的任务
const filteredTasks = computed(() => {
  let result = tasks.value;
  
  // Tab筛选
  if (activeTab.value === 'my_owned') {
    result = result.filter((t: RequirementTask) => t.ownerName === currentUser.name);
  } else if (activeTab.value === 'my_created') {
    result = result.filter((t: RequirementTask) => t.creatorName === currentUser.name);
  }
  
  // 搜索
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((t: RequirementTask) => t.title.toLowerCase().includes(q));
  }
  
  // 负责人筛选
  if (selectedOwners.value.length > 0) {
    result = result.filter((t: RequirementTask) => t.ownerName && selectedOwners.value.includes(t.ownerName));
  }
  
  // 状态筛选
  if (selectedStatuses.value.length > 0) {
    result = result.filter((t: RequirementTask) => t.status && selectedStatuses.value.includes(t.status));
  }
  
  // 优先级筛选
  if (selectedPriorities.value.length > 0) {
    result = result.filter((t: RequirementTask) => t.priority && selectedPriorities.value.includes(t.priority));
  }
  
  return result;
});

// 分页后的任务
const pagedTasks = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredTasks.value.slice(start, start + pageSize.value);
});

// Tab计数
const tabCounts = computed(() => ({
  all: tasks.value.length,
  my_owned: tasks.value.filter((t: RequirementTask) => t.ownerName === currentUser.name).length,
  my_created: tasks.value.filter((t: RequirementTask) => t.creatorName === currentUser.name).length
}));

// 详情抽屉
const selectedTask = ref<RequirementTask | null>(null);
const showCreateModal = ref(false);
const editingTask = ref<RequirementTask | null>(null);
const modalMode = ref<'create' | 'edit'>('create');

function openCreateModal() {
  editingTask.value = null;
  modalMode.value = 'create';
  showCreateModal.value = true;
}

function openEditModal(task: RequirementTask) {
  editingTask.value = task;
  modalMode.value = 'edit';
  showCreateModal.value = true;
}

function handleSaveTask(task: RequirementTask) {
  // TODO: 调用API保存任务
  console.log('保存任务:', task);
  showCreateModal.value = false;
  // 这里应该刷新任务列表
}

function openDetail(task: RequirementTask) {
  selectedTask.value = task;
}

function closeDetail() {
  selectedTask.value = null;
}

function clearFilters() {
  selectedOwners.value = [];
  selectedStatuses.value = [];
  selectedPriorities.value = [];
  searchQuery.value = '';
}

// 获取唯一的负责人列表
const ownerOptions = computed(() => {
  return Array.from(new Set(tasks.value.map((t: RequirementTask) => t.ownerName))).sort();
});

// 重置分页
watch([activeTab, searchQuery, selectedOwners, selectedStatuses, selectedPriorities], () => {
  page.value = 1;
});
</script>

<template>
  <div class="requirement-tasks-view">
    <!-- 头部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2 class="title">{{ itemLabel }}</h2>
        <div class="tabs">
          <button
            :class="['tab', { active: activeTab === 'all' }]"
            @click="activeTab = 'all'"
          >
            全部 ({{ tabCounts.all }})
          </button>
          <button
            :class="['tab', { active: activeTab === 'my_owned' }]"
            @click="activeTab = 'my_owned'"
          >
            我负责的 ({{ tabCounts.my_owned }})
          </button>
          <button
            :class="['tab', { active: activeTab === 'my_created' }]"
            @click="activeTab = 'my_created'"
          >
            我创建的 ({{ tabCounts.my_created }})
          </button>
        </div>
      </div>
      
      <div class="toolbar-right">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`搜索${itemLabel}...`"
            class="search-input"
          />
        </div>
        
        <button class="filter-btn" @click="filterOpen = !filterOpen">
          <Filter :size="16" />
          筛选
          <span v-if="selectedOwners.length + selectedStatuses.length + selectedPriorities.length > 0" class="filter-count">
            {{ selectedOwners.length + selectedStatuses.length + selectedPriorities.length }}
          </span>
        </button>
        
        <button class="create-btn" @click="openCreateModal">
          <Plus :size="16" />
          新建{{ itemLabel }}
        </button>
      </div>
    </div>

    <!-- 筛选面板 -->
    <div v-if="filterOpen" class="filter-panel">
      <div class="filter-section">
        <label class="filter-label">负责人</label>
        <div class="filter-options">
          <label v-for="owner in ownerOptions" :key="owner" class="filter-checkbox">
            <input v-model="selectedOwners" type="checkbox" :value="owner" />
            <span>{{ owner }}</span>
          </label>
        </div>
      </div>
      
      <div class="filter-section">
        <label class="filter-label">状态</label>
        <div class="filter-options">
          <label v-for="status in statusOptions" :key="status" class="filter-checkbox">
            <input v-model="selectedStatuses" type="checkbox" :value="status" />
            <span>{{ status }}</span>
          </label>
        </div>
      </div>
      
      <div class="filter-section">
        <label class="filter-label">优先级</label>
        <div class="filter-options">
          <label v-for="priority in priorityOptions" :key="priority" class="filter-checkbox">
            <input v-model="selectedPriorities" type="checkbox" :value="priority" />
            <span>{{ priority }}</span>
          </label>
        </div>
      </div>
      
      <div class="filter-actions">
        <button class="clear-btn" @click="clearFilters">清空筛选</button>
        <button class="apply-btn" @click="filterOpen = false">应用</button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div v-if="isLoading" class="loading">加载中...</div>
    
    <div v-else-if="pagedTasks.length === 0" class="empty">
      <p>暂无{{ itemLabel }}</p>
    </div>
    
    <div v-else class="task-table-wrapper">
      <table class="task-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>优先级</th>
            <th>负责人</th>
            <th>产品线</th>
            <th>版本</th>
            <th>创建时间</th>
            <th width="100">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in pagedTasks" :key="task.id" @click="openDetail(task)">
            <td class="task-title">{{ task.title }}</td>
            <td><span class="status-tag">{{ task.status }}</span></td>
            <td><span :class="['priority-tag', task.priority]">{{ task.priority }}</span></td>
            <td>{{ task.ownerName }}</td>
            <td>{{ task.productLineName || '—' }}</td>
            <td>{{ task.versionName || '—' }}</td>
            <td class="text-muted">{{ task.createdAt || '—' }}</td>
            <td>
              <button class="detail-btn" @click.stop="openDetail(task)">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="filteredTasks.length > pageSize" class="pagination">
      <button :disabled="page === 1" @click="page--">上一页</button>
      <span>第 {{ page }} 页，共 {{ Math.ceil(filteredTasks.length / pageSize) }} 页</span>
      <button :disabled="page >= Math.ceil(filteredTasks.length / pageSize)" @click="page++">下一页</button>
    </div>

    <!-- 详情抽屉 (简化版) -->
    <div v-if="selectedTask" class="drawer-overlay" @click="closeDetail">
      <div class="drawer" @click.stop>
        <div class="drawer-header">
          <h3>{{ itemLabel }}详情</h3>
          <button class="close-btn" @click="closeDetail">
            <X :size="20" />
          </button>
        </div>
        
        <div class="drawer-body">
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-grid">
              <div class="detail-field">
                <label>标题</label>
                <div>{{ selectedTask.title }}</div>
              </div>
              <div class="detail-field">
                <label>状态</label>
                <div>{{ selectedTask.status }}</div>
              </div>
              <div class="detail-field">
                <label>优先级</label>
                <div>{{ selectedTask.priority }}</div>
              </div>
              <div class="detail-field">
                <label>负责人</label>
                <div>{{ selectedTask.ownerName }}</div>
              </div>
              <div class="detail-field">
                <label>产品线</label>
                <div>{{ selectedTask.productLineName || '未设置' }}</div>
              </div>
              <div class="detail-field">
                <label>版本</label>
                <div>{{ selectedTask.versionName || '未设置' }}</div>
              </div>
            </div>
          </div>
          
          <div v-if="selectedTask.description" class="detail-section">
            <h4>描述</h4>
            <div class="description">{{ selectedTask.description }}</div>
          </div>
        </div>
        
        <div class="drawer-footer">
          <button class="btn-secondary" @click="closeDetail">关闭</button>
        </div>
      </div>
    </div>
  </div>

    <!-- 创建/编辑模态框 -->
    <RequirementTaskModal
      :open="showCreateModal"
      :task="editingTask"
      :mode="modalMode"
      @close="showCreateModal = false"
      @save="handleSaveTask"
    />
</template>

<style scoped>
.requirement-tasks-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-page);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-main);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.tabs {
  display: flex;
  gap: 8px;
}

.tab {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  background: var(--bg-surface-soft);
  color: var(--text-primary);
}

.tab.active {
  background: var(--primary);
  color: white;
}

.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
}

.search-input {
  width: 240px;
  height: 36px;
  padding-left: 36px;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.filter-btn, .create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover, .create-btn:hover {
  background: var(--bg-surface-soft);
}

.create-btn {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.create-btn:hover {
  background: var(--primary-hover);
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--primary);
  color: white;
  font-size: 12px;
}

.filter-panel {
  padding: 16px 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-main);
}

.filter-section {
  margin-bottom: 16px;
}

.filter-section:last-of-type {
  margin-bottom: 0;
}

.filter-label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.filter-checkbox input[type="checkbox"] {
  cursor: pointer;
}

.filter-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.clear-btn, .apply-btn {
  height: 32px;
  padding: 0 16px;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.apply-btn {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.loading, .empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted);
  font-size: 14px;
}

.task-table-wrapper {
  flex: 1;
  overflow: auto;
  padding: 16px 24px;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-card);
  border-radius: 8px;
  overflow: hidden;
}

.task-table th {
  padding: 12px 16px;
  background: var(--bg-surface-soft);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
}

.task-table td {
  padding: 12px 16px;
  border-top: 1px solid var(--border-main);
  color: var(--text-primary);
  font-size: 14px;
}

.task-table tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}

.task-table tbody tr:hover {
  background: var(--bg-surface-soft);
}

.task-title {
  font-weight: 500;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-surface-soft);
  font-size: 12px;
}

.priority-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.priority-tag.紧急 { background: #fee; color: #c00; }
.priority-tag.高 { background: #fff3e0; color: #e65100; }
.priority-tag.中 { background: #e3f2fd; color: #1565c0; }
.priority-tag.低 { background: #f5f5f5; color: #616161; }

.text-muted {
  color: var(--text-muted);
}

.detail-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-main);
  border-radius: 4px;
  background: transparent;
  color: var(--primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.detail-btn:hover {
  background: var(--bg-surface-soft);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 24px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-main);
}

.pagination button {
  padding: 6px 12px;
  border: 1px solid var(--border-main);
  border-radius: 4px;
  background: var(--bg-surface);
  color: var(--text-primary);
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 抽屉 */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 600px;
  max-width: 90vw;
  background: var(--bg-card);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-main);
}

.drawer-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--bg-surface-soft);
  color: var(--text-primary);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-field label {
  color: var(--text-muted);
  font-size: 13px;
}

.detail-field div {
  color: var(--text-primary);
  font-size: 14px;
}

.description {
  padding: 12px;
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.drawer-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-main);
}

.btn-secondary {
  height: 36px;
  padding: 0 16px;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--bg-surface-soft);
}
</style>

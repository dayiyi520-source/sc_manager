<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useSessionStore} from '../stores/session';
import {useTheme} from '../composables/useTheme';
import {MENU_GROUPS} from '../config/menuConfig';
import DynamicIcon from '../components/common/DynamicIcon.vue';
import CrmDashboardView from './crm/CrmDashboardView.vue';
import CrmCustomersView from './crm/CrmCustomersView.vue';
import CrmPipelineView from './crm/CrmPipelineView.vue';
import ProductLinesView from './product/ProductLinesView.vue';
import ProductListView from './product/ProductListView.vue';
import WorkItemListView from './product/WorkItemListView.vue';
import ProjectListView from './project/ProjectListView.vue';
import ProjectMilestonesView from './project/ProjectMilestonesView.vue';
import ApprovalCenterView from './approval/ApprovalCenterView.vue';
import TeamOrganizationView from './system/TeamOrganizationView.vue';
import SystemSettingsView from './system/SystemSettingsView.vue';
import ModulePlaceholder from '../components/common/ModulePlaceholder.vue';
import MyTasksView from './workbench/MyTasksView.vue';
import OkrPerformanceView from './workbench/OkrPerformanceView.vue';
import KnowledgeBaseView from './workbench/KnowledgeBaseView.vue';
import WorkOrderCenterView from './workbench/WorkOrderCenterView.vue';
import RequirementTasksView from './product/RequirementTasksView.vue';
import VersionIterationView from './product/VersionIterationView.vue';
import ProductLineDetailView from './product/ProductLineDetailView.vue';

const route = useRoute();
const router = useRouter();
const store = useSessionStore();
const {theme, toggleTheme} = useTheme();
const collapsed = ref(false);
const mobileSidebarOpen = ref(false);
const openTabs = ref([{id: 'wb_my_tasks', title: '我的任务'}]);
const activeId = computed(() => String(route.params.viewId || 'wb_my_tasks'));
const activeTitle = computed(() => {
  for (const group of MENU_GROUPS) {
    const item = group.subMenus.find(m => m.id === activeId.value);
    if (item) return item.title;
  }
  return '工作台';
});

// 展开的分组
const expandedGroups = ref<Record<string, boolean>>({
  workbench: true,
  crm: true,
  product: true,
  project: true,
  approval: true
});

function toggleGroup(groupId: string) {
  expandedGroups.value[groupId] = !expandedGroups.value[groupId];
}

function open(id: string, title: string) {
  if (!openTabs.value.some((tab) => tab.id === id)) openTabs.value.push({id, title});
  router.push(`/app/${id}`);
  if (mobileSidebarOpen.value) mobileSidebarOpen.value = false;
}

function closeTab(id: string) {
  const index = openTabs.value.findIndex(tab => tab.id === id);
  if (index > -1) {
    openTabs.value.splice(index, 1);
    if (activeId.value === id && openTabs.value.length > 0) {
      router.push(`/app/${openTabs.value[0].id}`);
    }
  }
}

function getGroupIconClass(group: any) {
  const isActive = group.subMenus.some((m: any) => m.id === activeId.value);
  return isActive ? 'group-icon active-icon' : 'group-icon';
}

function getChevronClass(groupId: string) {
  return expandedGroups.value[groupId] ? 'chevron' : 'chevron rotated';
}

function getSubIconClass(subId: string) {
  return activeId.value === subId ? 'sub-icon active' : 'sub-icon';
}
</script>

<template>
  <div class="workspace">
    <!-- 侧边栏 -->
    <aside :class="['tech-sidebar', {collapsed, 'mobile-open': mobileSidebarOpen}]">
      <!-- Logo 区域 -->
      <div class="tech-brand-panel">
        <div v-if="!collapsed" class="tech-logo">SC</div>
        <div v-if="!collapsed" class="brand-text">
          <div class="brand-title">师创管理后台</div>
          <div class="brand-subtitle">Vue 迁移版</div>
        </div>
      </div>

      <!-- 导航菜单 -->
      <div class="nav-menu">
        <div v-for="group in MENU_GROUPS" :key="group.id" class="menu-group">
          <!-- 一级菜单 -->
          <button
            v-if="!collapsed"
            @click="toggleGroup(group.id)"
            :class="['group-header', {
              active: group.subMenus.some(m => m.id === activeId)
            }]"
          >
            <div class="group-header-content">
              <DynamicIcon 
                :name="group.icon" 
                :class="getGroupIconClass(group)"
              />
              <span class="group-title">{{ group.title }}</span>
            </div>
            <DynamicIcon
              name="ChevronDown"
              :class="getChevronClass(group.id)"
            />
          </button>

          <!-- 收起状态显示分组标题 -->
          <div v-else class="group-collapsed-title" :title="group.title">
            {{ group.title.slice(0, 2) }}
          </div>

          <!-- 二级子菜单 -->
          <div
            v-if="expandedGroups[group.id] || collapsed"
            :class="['sub-menu-list', {collapsed}]"
          >
            <button
              v-for="sub in group.subMenus"
              :key="sub.id"
              @click="open(sub.id, sub.title)"
              :class="['sub-menu-item', {active: activeId === sub.id}]"
              :title="collapsed ? `${group.title} · ${sub.title}` : undefined"
            >
              <DynamicIcon 
                :name="sub.icon" 
                :class="getSubIconClass(sub.id)"
              />
              <span v-if="!collapsed" class="sub-title">{{ sub.title }}</span>
              <span
                v-if="!collapsed && sub.badge"
                :class="['badge', sub.badgeType || 'default']"
              >
                {{ sub.badge }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部收起按钮 -->
      <div class="sidebar-footer">
        <button class="collapse-btn" @click="collapsed = !collapsed">
          <DynamicIcon :name="collapsed ? 'PanelLeftOpen' : 'PanelLeftClose'" />
          <span v-if="!collapsed">收起侧边栏</span>
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="workspace-main">
      <!-- 顶部栏 -->
      <header class="tech-header">
        <button class="mobile-menu" @click="mobileSidebarOpen = !mobileSidebarOpen">☰</button>
        <strong class="page-title">{{ activeTitle }}</strong>
        <div class="header-actions">
          <button 
            class="icon-btn theme-toggle" 
            @click="toggleTheme"
            :title="theme === 'light' ? '切换为暗色模式' : '切换为亮色模式'"
          >
            {{ theme === 'light' ? '🌙' : '☀️' }}
          </button>
          <span class="user-name">{{ store.user?.name }}</span>
          <button class="btn-logout" @click="store.logout(); router.push('/login')">退出</button>
        </div>
      </header>

      <!-- 标签页 -->
      <div class="tabs-bar">
        <button
          v-for="tab in openTabs"
          :key="tab.id"
          :class="['tab-item', {active: activeId === tab.id}]"
          @click="router.push(`/app/${tab.id}`)"
        >
          <span class="tab-title">{{ tab.title }}</span>
          <span
            v-if="openTabs.length > 1"
            class="tab-close"
            @click.stop="closeTab(tab.id)"
          >
            ×
          </span>
        </button>
      </div>

      <!-- 内容区 -->
      <main class="content-area">
        <MyTasksView v-if="activeId==='wb_my_tasks'"/>
        <OkrPerformanceView v-else-if="activeId==='wb_okr_perf'"/>
        <KnowledgeBaseView v-else-if="['wb_knowledge','wb_knowledge_center','know_base'].includes(activeId)"/>
        <WorkOrderCenterView v-else-if="['wb_work_orders','prod_req_pool','prod_pool'].includes(activeId)"/>
        <CrmDashboardView v-else-if="activeId === 'crm_dashboard'" />
        <CrmCustomersView v-else-if="activeId === 'crm_customers'" />
        <CrmPipelineView
          v-else-if="['crm_leads','crm_opportunities','crm_followups','crm_contracts'].includes(activeId)"
          :kind="activeId === 'crm_leads' ? 'leads' : activeId === 'crm_opportunities' ? 'opportunities' : activeId === 'crm_followups' ? 'followUps' : 'contracts'"
        />
        <ProductLinesView v-else-if="activeId === 'prod_lines'" />
        <VersionIterationView v-else-if="activeId === 'prod_versions'" />
        <RequirementTasksView v-else-if="activeId === 'prod_req_tasks'" kind="requirement" />
        <WorkItemListView v-else-if="activeId === 'prod_design_tasks'" kind="design" />
        <WorkItemListView v-else-if="activeId === 'prod_rd_tasks'" kind="dev" />
        <WorkItemListView v-else-if="activeId === 'prod_bugs'" kind="bug" />
        <ProjectListView v-else-if="activeId === 'proj_list'" />
        <ProjectMilestonesView v-else-if="activeId === 'proj_config'" />
        <ApprovalCenterView v-else-if="['approval_center','approval_center_old'].includes(activeId)" />
        <TeamOrganizationView v-else-if="activeId === 'team_org'" />
        <SystemSettingsView v-else-if="['system_settings','sys_settings'].includes(activeId)" />
        <ModulePlaceholder v-else kicker="VUE MIGRATION" :title="activeTitle" description="该业务页面尚未迁移。" />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* 全局布局 */
.workspace {
  display: flex;
  height: 100vh;
  background: var(--bg-main);
}

/* 侧边栏 */
.tech-sidebar {
  width: 240px;
  background: var(--bg-nav);
  border-right: 1px solid var(--border-main);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
  z-index: 40;
}

.tech-sidebar.collapsed {
  width: 64px;
}

/* Logo 区域 */
.tech-brand-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-main);
  min-height: 64px;
}

.tech-logo {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(47, 102, 246, 0.3);
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-subtitle {
  font-size: 11px;
  color: var(--text-muted);
}

/* 导航菜单 */
.nav-menu {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.menu-group {
  margin-bottom: 12px;
}

/* 一级菜单标题 */
.group-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-muted);
}

.group-header:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.group-header.active {
  background: var(--bg-surface);
  color: var(--text-primary);
  font-weight: 600;
}

.group-header-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.group-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: color 0.2s;
}

.group-icon.active-icon {
  color: var(--warning);
}

.group-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.chevron.rotated {
  transform: rotate(-90deg);
}

/* 收起状态的分组标题 */
.group-collapsed-title {
  width: 100%;
  text-align: center;
  padding: 6px 0;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  border-bottom: 1px solid var(--border-main);
  margin-bottom: 4px;
}

/* 二级子菜单 */
.sub-menu-list {
  position: relative;
  margin-left: 14px;
  padding-left: 12px;
  border-left: 1px solid var(--border-main);
  margin-top: 4px;
}

.sub-menu-list.collapsed {
  margin-left: 0;
  padding-left: 0;
  border-left: none;
}

.sub-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.tech-sidebar.collapsed .sub-menu-item {
  justify-content: center;
  padding: 10px;
  margin: 4px 0;
}

.sub-menu-item:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.sub-menu-item.active {
  background: var(--primary);
  color: white;
  font-weight: 500;
}

.sub-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: color 0.2s;
}

.sub-menu-item.active .sub-icon,
.sub-icon.active {
  color: white;
}

.sub-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.badge.default {
  background: var(--bg-elevated);
  color: var(--text-muted);
}

.badge.success {
  background: rgba(34, 197, 94, 0.2);
  color: var(--success);
}

.badge.warning {
  background: rgba(250, 204, 21, 0.2);
  color: var(--warning);
}

.badge.danger {
  background: rgba(242, 109, 91, 0.2);
  color: var(--danger);
}

/* 侧边栏底部 */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border-main);
  background: var(--bg-main);
}

.collapse-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  color: var(--text-body);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.collapse-btn:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.tech-sidebar.collapsed .collapse-btn {
  justify-content: center;
  padding: 8px;
}

.tech-sidebar.collapsed .collapse-btn span {
  display: none;
}

/* 主内容区 */
.workspace-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 顶部栏 */
.tech-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-main);
  flex-shrink: 0;
}

.mobile-menu {
  display: none;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 18px;
}

.icon-btn:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.user-name {
  font-size: 14px;
  color: var(--text-body);
}

.btn-logout {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  color: var(--text-body);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
}

.btn-logout:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

/* 标签页 */
.tabs-bar {
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-main);
  overflow-x: auto;
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-body);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-size: 13px;
}

.tab-item:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.tab-item.active {
  background: var(--primary);
  color: white;
}

.tab-title {
  user-select: none;
}

.tab-close {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  font-size: 16px;
  line-height: 1;
  opacity: 0.7;
}

.tab-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

/* 内容区 */
.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg-page);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .tech-sidebar {
    position: fixed;
    left: -240px;
    top: 0;
    bottom: 0;
    z-index: 100;
  }

  .tech-sidebar.mobile-open {
    left: 0;
  }

  .mobile-menu {
    display: block;
  }
}
</style>

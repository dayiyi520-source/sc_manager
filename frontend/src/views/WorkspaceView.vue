<script setup lang="ts">
import {computed, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useSessionStore} from '../stores/session';
import {useTheme} from '../composables/useTheme';
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

type MenuItem = [string, string];
type MenuGroup = {title: string; items: MenuItem[]};

const groups: MenuGroup[] = [
  {
    title: '工作台',
    items: [
      ['wb_my_tasks', '我的任务'],
      ['wb_okr_perf', '目标与绩效'],
      ['wb_knowledge', '知识库'],
      ['wb_work_orders', '工单中心']
    ]
  },
  {
    title: '客户与商机',
    items: [
      ['crm_dashboard', '数据看板'],
      ['crm_customers', '客户档案'],
      ['crm_leads', '线索管理'],
      ['crm_opportunities', '商机管理']
    ]
  },
  {
    title: '产研管理',
    items: [
      ['prod_lines', '产品线'],
      ['prod_versions', '版本迭代'],
      ['prod_req_tasks', '需求任务'],
      ['prod_design_tasks', '设计任务'],
      ['prod_rd_tasks', '研发任务'],
      ['prod_bugs', '缺陷管理']
    ]
  },
  {
    title: '项目管理',
    items: [
      ['proj_list', '项目列表'],
      ['proj_config', '里程碑计划']
    ]
  },
  {
    title: '协同管理',
    items: [
      ['approval_center', '审批中心'],
      ['team_org', '团队组织'],
      ['system_settings', '系统设置']
    ]
  }
];

const route = useRoute();
const router = useRouter();
const store = useSessionStore();
const {theme, toggleTheme} = useTheme();
const collapsed = ref(false);
const openTabs = ref([{id: 'wb_my_tasks', title: '我的任务'}]);
const activeId = computed(() => String(route.params.viewId || 'wb_my_tasks'));
const activeTitle = computed(() => groups.flatMap((group) => group.items).find(([id]) => id === activeId.value)?.[1] || '工作台');

function open(id: string, title: string) {
  if (!openTabs.value.some((tab) => tab.id === id)) openTabs.value.push({id, title});
  router.push(`/app/${id}`);
}
</script>

<template>
  <div class="workspace">
    <aside :class="['sidebar', {collapsed}]">
      <div class="brand">{{ collapsed ? 'SC' : '师创管理后台' }}</div>
      <nav>
        <section v-for="group in groups" :key="group.title">
          <h3 v-if="!collapsed">{{ group.title }}</h3>
          <button
            v-for="item in group.items"
            :key="item[0]"
            :class="{active: activeId === item[0]}"
            :title="item[1]"
            @click="open(item[0], item[1])"
          >
            {{ collapsed ? item[1].slice(0, 1) : item[1] }}
          </button>
        </section>
      </nav>
      <button class="collapse" @click="collapsed = !collapsed">{{ collapsed ? '展开' : '收起侧边栏' }}</button>
    </aside>
    <div class="workspace-main">
      <header class="topbar">
        <button class="mobile-menu" @click="collapsed=!collapsed">☰</button>
        <strong>{{ activeTitle }}</strong>
        <div class="account">
          <button 
            class="theme-toggle" 
            @click="toggleTheme"
            :title="theme === 'light' ? '切换为暗色模式' : '切换为亮色模式'"
          >
            {{ theme === 'light' ? '🌙' : '☀️' }}
          </button>
          <span>{{ store.user?.name }}</span>
          <button @click="store.logout(); router.push('/login')">退出</button>
        </div>
      </header>
      <div class="tabs">
        <button
          v-for="tab in openTabs"
          :key="tab.id"
          :class="{active: activeId === tab.id}"
          @click="router.push(`/app/${tab.id}`)"
        >
          {{ tab.title }}
        </button>
      </div>
      <main class="content">
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
.workspace { display: flex; height: 100vh; }
.sidebar { background: var(--bg-nav); color: var(--text-primary); width: 200px; display: flex; flex-direction: column; transition: width 0.3s; border-right: 1px solid var(--border-main); }
.sidebar.collapsed { width: 60px; }
.sidebar .brand { padding: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; border-bottom: 1px solid var(--border-main); }
.sidebar nav { flex: 1; overflow-y: auto; padding: 8px; }
.sidebar nav section { margin-bottom: 16px; }
.sidebar nav h3 { font-size: 12px; color: var(--text-muted); margin: 8px 0; text-transform: uppercase; }
.sidebar nav button { display: block; width: 100%; text-align: left; padding: 8px 12px; background: transparent; border: none; color: var(--text-body); cursor: pointer; border-radius: 6px; transition: all 0.2s; }
.sidebar nav button:hover { background: var(--bg-surface); color: var(--text-primary); }
.sidebar nav button.active { background: var(--primary); color: white; }
.sidebar .collapse { margin: 8px; padding: 8px; background: transparent; border: 1px solid var(--border-main); color: var(--text-body); cursor: pointer; border-radius: 6px; }
.workspace-main { flex: 1; display: flex; flex-direction: column; background: var(--bg-page); }
.topbar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: var(--bg-surface); border-bottom: 1px solid var(--border-main); }
.topbar strong { font-size: 16px; color: var(--text-primary); }
.topbar .mobile-menu { display: none; background: transparent; border: none; color: var(--text-primary); font-size: 20px; cursor: pointer; }
.topbar .account { display: flex; align-items: center; gap: 12px; }
.topbar .account span { color: var(--text-body); }
.topbar .account button { padding: 6px 12px; background: transparent; border: 1px solid var(--border-main); color: var(--text-body); cursor: pointer; border-radius: 6px; transition: all 0.2s; }
.topbar .account button:hover { background: var(--bg-elevated); color: var(--text-primary); border-color: var(--border-strong); }
.topbar .account .theme-toggle { font-size: 18px; padding: 6px 10px; }
.tabs { display: flex; gap: 4px; padding: 8px 16px; background: var(--bg-surface); border-bottom: 1px solid var(--border-main); overflow-x: auto; }
.tabs button { padding: 6px 12px; background: transparent; border: none; color: var(--text-body); cursor: pointer; border-radius: 6px; white-space: nowrap; transition: all 0.2s; }
.tabs button:hover { background: var(--bg-elevated); color: var(--text-primary); }
.tabs button.active { background: var(--primary); color: white; }
.content { flex: 1; overflow-y: auto; padding: 16px; }
@media (max-width: 768px) {
  .sidebar { position: fixed; z-index: 100; height: 100%; }
  .sidebar:not(.collapsed) { width: 240px; }
  .topbar .mobile-menu { display: block; }
}
</style>

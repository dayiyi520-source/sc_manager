export interface SubMenu {
  id: string;
  title: string;
  icon: string;
  badge?: string | number;
  badgeType?: 'default' | 'success' | 'warning' | 'danger';
}

export interface MenuGroup {
  id: string;
  title: string;
  icon: string;
  subMenus: SubMenu[];
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'workbench',
    title: '工作台',
    icon: 'LayoutDashboard',
    subMenus: [
      { id: 'wb_my_tasks', title: '我的任务', icon: 'CheckSquare', badge: 4, badgeType: 'danger' },
      { id: 'wb_okr_perf', title: '目标与绩效', icon: 'Target' },
      { id: 'wb_knowledge', title: '知识库', icon: 'BookOpen' },
      { id: 'wb_work_orders', title: '工单中心', icon: 'Database' }
    ]
  },
  {
    id: 'crm',
    title: '客户与商机',
    icon: 'Briefcase',
    subMenus: [
      { id: 'crm_dashboard', title: '数据看板', icon: 'BarChart3' },
      { id: 'crm_customers', title: '客户档案', icon: 'Users' },
      { id: 'crm_leads', title: '线索管理', icon: 'Filter' },
      { id: 'crm_opportunities', title: '商机管理', icon: 'TrendingUp', badge: '¥1400w', badgeType: 'success' }
    ]
  },
  {
    id: 'product',
    title: '产研管理',
    icon: 'Layers',
    subMenus: [
      { id: 'prod_lines', title: '产品线', icon: 'Box' },
      { id: 'prod_versions', title: '版本迭代', icon: 'GitBranch' },
      { id: 'prod_req_tasks', title: '需求任务', icon: 'ListTodo', badge: '云效流', badgeType: 'default' },
      { id: 'prod_design_tasks', title: '设计任务', icon: 'Edit' },
      { id: 'prod_rd_tasks', title: '研发任务', icon: 'Code' },
      { id: 'prod_bugs', title: '缺陷管理', icon: 'Bug', badge: 3, badgeType: 'danger' }
    ]
  },
  {
    id: 'project',
    title: '项目管理',
    icon: 'FolderKanban',
    subMenus: [
      { id: 'proj_list', title: '项目列表', icon: 'FolderGit2' },
      { id: 'proj_config', title: '里程碑计划', icon: 'Settings2' }
    ]
  },
  {
    id: 'approval',
    title: '协同管理',
    icon: 'Boxes',
    subMenus: [
      { id: 'approval_center', title: '审批中心', icon: 'Stamp', badge: 1, badgeType: 'danger' },
      { id: 'team_org', title: '团队组织', icon: 'Users' },
      { id: 'system_settings', title: '系统设置', icon: 'Settings' }
    ]
  }
];

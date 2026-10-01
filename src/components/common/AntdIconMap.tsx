import React from 'react';
import {
  DashboardOutlined,
  CheckSquareOutlined,
  AimOutlined,
  BookOutlined,
  DatabaseOutlined,
  ShopOutlined,
  BarChartOutlined,
  TeamOutlined,
  FilterOutlined,
  RiseOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserSwitchOutlined,
  BellOutlined,
  FileTextOutlined,
  TrophyOutlined,
  ReloadOutlined,
  AuditOutlined,
  AppstoreOutlined,
  InboxOutlined,
  BranchesOutlined,
  OrderedListOutlined,
  EditOutlined,
  CodeOutlined,
  BugOutlined,
  FolderOpenOutlined,
  CompassOutlined,
  ContainerOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  ReconciliationOutlined,
  ClockCircleOutlined as AttendanceOutlined,
  ShoppingCartOutlined,
  PicCenterOutlined,
  DollarOutlined,
  ProjectOutlined,
  DeploymentUnitOutlined,
  SettingOutlined,
  ClusterOutlined,
  FileSearchOutlined,
  CarryOutOutlined,
  ToolOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';

// 图标名称到 Ant Design 组件的映射
export const ANTD_ICON_MAP: Record<string, React.ReactNode> = {
  // 工作台
  LayoutDashboard: <DashboardOutlined />,
  CheckSquare: <CheckSquareOutlined />,
  Target: <AimOutlined />,
  BookOpen: <BookOutlined />,
  Database: <DatabaseOutlined />,
  
  // 客户与商机
  Briefcase: <ShopOutlined />,
  BarChart3: <BarChartOutlined />,
  Users: <TeamOutlined />,
  Filter: <FilterOutlined />,
  TrendingUp: <RiseOutlined />,
  Calendar: <CalendarOutlined />,
  Clock: <ClockCircleOutlined />,
  Handshake: <UserSwitchOutlined />,
  Radio: <BellOutlined />,
  FileSpreadsheet: <FileSearchOutlined />,
  Award: <TrophyOutlined />,
  RefreshCw: <ReloadOutlined />,
  FileText: <FileTextOutlined />,
  Ticket: <FileProtectOutlined />,
  
  // 产研管理
  Layers: <AppstoreOutlined />,
  Box: <InboxOutlined />,
  GitBranch: <BranchesOutlined />,
  ListTodo: <OrderedListOutlined />,
  Edit: <EditOutlined />,
  Code: <CodeOutlined />,
  Bug: <BugOutlined />,
  Archive: <FolderOpenOutlined />,
  Compass: <CompassOutlined />,
  
  // 综合中心
  Boxes: <ContainerOutlined />,
  ShieldCheck: <SafetyOutlined />,
  FileCheck: <CheckCircleOutlined />,
  ClipboardList: <ReconciliationOutlined />,
  UserCheck: <AttendanceOutlined />,
  ShoppingCart: <ShoppingCartOutlined />,
  Package: <PicCenterOutlined />,
  Receipt: <DollarOutlined />,
  Wallet: <DollarOutlined />,
  
  // 项目管理
  FolderKanban: <ProjectOutlined />,
  Milestone: <DeploymentUnitOutlined />,
  ClipboardCheck: <CarryOutOutlined />,
  Server: <ToolOutlined />,
  
  // 系统
  Settings: <SettingOutlined />,
  Sitemap: <ClusterOutlined />,
};

export const getAntdIcon = (iconName: string): React.ReactNode => {
  return ANTD_ICON_MAP[iconName] || <FileTextOutlined />;
};

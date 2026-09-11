import React, { lazy, Suspense, useEffect, useState } from 'react';
import { AppProvider, MENU_GROUPS, useApp } from './context/AppContext';
import { useAppNavigation } from './hooks/useAppNavigation';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TabsBar } from './components/layout/TabsBar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { ToastContainer } from './components/common/UIComponents';
import { SearchableSelect } from './components/common';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { DevLoginPage } from './components/auth/DevLoginPage';
import { readSession } from './services/session';

const lazyNamed = (loader: () => Promise<Record<string, unknown>>, exportName: string) => lazy(async () => {
  const module = await loader();
  return { default: module[exportName] as React.ComponentType };
});
const MyTasksView = lazyNamed(() => import('./components/workbench/MyTasksView'), 'MyTasksView');
const KnowledgeBaseView = lazyNamed(() => import('./components/workbench/KnowledgeBaseView'), 'KnowledgeBaseView');
const CRMDashboardView = lazyNamed(() => import('./components/crm/CRMDashboardView'), 'CRMDashboardView');
const RequirementTasksView = lazyNamed(() => import('./components/product/RequirementTasksView'), 'RequirementTasksView');
const RequirementPoolView = lazyNamed(() => import('./components/workbench/RequirementPoolView'), 'RequirementPoolView');
const OKRPerformanceView = lazyNamed(() => import('./components/workbench/OKRPerformanceView'), 'OKRPerformanceView');

// CRM Views
const CRMCustomersView = lazyNamed(() => import('./components/crm/CRMCustomersView'), 'CRMCustomersView');
const CRMLeadsView = lazyNamed(() => import('./components/crm/CRMLeadsView'), 'CRMLeadsView');
const CRMOpportunitiesView = lazyNamed(() => import('./components/crm/CRMOpportunitiesView'), 'CRMOpportunitiesView');
const CRMVisitsView = lazyNamed(() => import('./components/crm/CRMVisitsView'), 'CRMVisitsView');
const CRMFollowupsView = lazyNamed(() => import('./components/crm/CRMFollowupsView'), 'CRMFollowupsView');
const CRMPartnersView = lazyNamed(() => import('./components/crm/CRMPartnersView'), 'CRMPartnersView');
const CRMTenderView = lazyNamed(() => import('./components/crm/CRMTenderView'), 'CRMTenderView');
const CRMBiddingView = lazyNamed(() => import('./components/crm/CRMBiddingView'), 'CRMBiddingView');
const CRMWinningEngagementView = lazyNamed(() => import('./components/crm/CRMWinningEngagementView'), 'CRMWinningEngagementView');
const CRMBidReviewView = lazyNamed(() => import('./components/crm/CRMBidReviewView'), 'CRMBidReviewView');
const CRMContractsView = lazyNamed(() => import('./components/crm/CRMContractsView'), 'CRMContractsView');

// Product & Dev Views
const ProductPlanningView = lazyNamed(() => import('./components/product/ProductPlanningView'), 'ProductPlanningView');
const VersionIterationView = lazyNamed(() => import('./components/product/VersionIterationView'), 'VersionIterationView');
const ProductLinesView = lazyNamed(() => import('./components/product/ProductLinesView'), 'ProductLinesView');
const ProductReviewView = lazyNamed(() => import('./components/product/ProductReviewView'), 'ProductReviewView');

// Approval & Comprehensive Center Views
const ApprovalCenterView = lazyNamed(() => import('./components/approval/ApprovalCenterView'), 'ApprovalCenterView');
const AttendanceManagementView = lazyNamed(() => import('./components/comprehensive/AttendanceManagementView'), 'AttendanceManagementView');
const ProcurementManagementView = lazyNamed(() => import('./components/comprehensive/ProcurementManagementView'), 'ProcurementManagementView');
const AssetManagementView = lazyNamed(() => import('./components/comprehensive/AssetManagementView'), 'AssetManagementView');
const InvoiceManagementView = lazyNamed(() => import('./components/comprehensive/InvoiceManagementView'), 'InvoiceManagementView');
const PaymentCollectionManagementView = lazyNamed(() => import('./components/comprehensive/PaymentCollectionManagementView'), 'PaymentCollectionManagementView');

// Operation & Project Views
const ProjectManagementView = lazyNamed(() => import('./components/project/ProjectManagementView'), 'ProjectManagementView');
const MilestoneScheduleView = lazyNamed(() => import('./components/project/MilestoneScheduleView'), 'MilestoneScheduleView');

// Finance Views

// Knowledge, Team & System Views
const TeamOrgView = lazyNamed(() => import('./components/team/TeamOrgView'), 'TeamOrgView');
const SystemSettingsView = lazyNamed(() => import('./components/system/SystemSettingsView'), 'SystemSettingsView');
const AntDesignTestView = lazyNamed(() => import('./components/test/AntDesignTestView'), 'AntDesignTestView');
const RequirementWorkItemsView = lazyNamed(() => import('./components/common/RequirementWorkItemsView'), 'RequirementWorkItemsView');

const MainContent: React.FC = () => {
  const { activeTabId, openTabs } = useAppNavigation();
  const { crmLoading, crmError, retryCrm, addToast, productLines } = useApp();
  const { viewId } = useParams();
  // 标签点击后以 activeTabId 为准；URL 参数只用于首次进入页面
  const routedTabId = activeTabId as typeof activeTabId;
  const [productLineFilter, setProductLineFilter] = useState('all');
  useEffect(() => {
    const pending = sessionStorage.getItem('shichuang.productLineFilter');
    if (pending) {
      setProductLineFilter(pending);
      sessionStorage.removeItem('shichuang.productLineFilter');
    }
  }, [routedTabId]);

  const renderView = () => {
    switch (routedTabId) {
      // Workbench
      case 'wb_my_tasks':
        return <MyTasksView />;
      case 'wb_okr_perf':
        return <OKRPerformanceView />;
      case 'wb_knowledge':
      case 'wb_knowledge_center':
      case 'know_base':
        return <KnowledgeBaseView />;

      // CRM
      case 'crm_dashboard':
        return <CRMDashboardView />;
      case 'crm_customers':
        return <CRMCustomersView />;
      case 'crm_leads':
        return <CRMLeadsView />;
      case 'crm_opportunities':
        return <CRMOpportunitiesView />;
      case 'crm_visits':
        return <CRMVisitsView />;
      case 'crm_followups':
        return <CRMFollowupsView />;
      case 'crm_partners':
        return <CRMPartnersView />;
      case 'crm_tender':
      case 'crm_tenders':
        return <CRMTenderView />;
      case 'crm_bidding':
        return <CRMBiddingView />;
      case 'crm_winning_engagement':
      case 'crm_winning':
        return <CRMWinningEngagementView />;
      case 'crm_bidding_review':
      case 'crm_bid_review':
        return <CRMBidReviewView />;
      case 'crm_contracts':
        return <CRMContractsView />;
      case 'crm_presales_tasks':
      case 'crm_presales_tickets':
        return <RequirementTasksView itemLabel="售前任务" taskKind="presales" />;

      // Product & Dev
      case 'prod_planning':
        return <ProductPlanningView />;
      case 'prod_req_tasks':
      case 'prod_reqs':
        return <RequirementTasksView />;
      case 'prod_design_tasks':
        return <RequirementTasksView itemLabel="设计任务" taskKind="design" />;
      case 'wb_work_order':
      
        return <RequirementPoolView />;
      case 'prod_versions':
        return <VersionIterationView />;
      case 'prod_lines':
        return <ProductLinesView />;
      case 'prod_rd_tasks':
      case 'prod_dev_tasks':
        return <RequirementTasksView productLineFilter={productLineFilter} itemLabel="研发任务" taskKind="dev" />;
      case 'prod_bugs':
        return <RequirementTasksView productLineFilter={productLineFilter} itemLabel="缺陷管理" taskKind="bug" />;
      case 'prod_reviews':
      case 'prod_review':
        return <ProductReviewView />;

      // Approval
      case 'approval_center':
      case 'comp_approval':
        return <ApprovalCenterView />;
      case 'comp_attendance':
        return <AttendanceManagementView />;
      case 'comp_procurement':
        return <ProcurementManagementView />;
      case 'comp_asset':
        return <AssetManagementView />;
      case 'comp_invoice':
        return <InvoiceManagementView />;
      case 'comp_payment':
        return <PaymentCollectionManagementView />;
      // Project
      case 'proj_list':
      case 'ops_projects':
        return <ProjectManagementView />;
      case 'proj_config':
      case 'ops_milestones':
        return <MilestoneScheduleView />;
      case 'proj_delivery_tickets':
      case 'proj_delivery_tasks':
        return <RequirementTasksView itemLabel="交付任务" taskKind="delivery" />;
      case 'proj_ops_tasks':
        return <RequirementTasksView itemLabel="运维任务" taskKind="ops" />;

      // Team & System
      case 'team_org':
        return <TeamOrgView />;
      case 'sys_settings':
        return <SystemSettingsView />;
      case 'test_antd':
        return <AntDesignTestView />;

      default:
        return <AntDesignTestView />;
    }
  };

  return (
    <main className="tech-main flex-1 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* 产品线筛选器（保留用于需求任务和设计任务页面） */}
        {(routedTabId === 'prod_req_tasks' || routedTabId === 'prod_design_tasks') && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pb-4 border-b border-[var(--border-main)]">
            <span>产品线</span>
            <div className="w-44"><SearchableSelect label="产品线" hideLabel value={productLineFilter === 'all' ? '全部产品线' : productLines.find((productLine) => productLine.id === productLineFilter)?.name || ''} options={['全部产品线', ...productLines.map((productLine) => productLine.name)]} onChange={(name) => setProductLineFilter(name === '全部产品线' ? 'all' : productLines.find((productLine) => productLine.name === name)?.id || 'all')} placeholder="全部产品线" clearable /></div>
          </div>
        )}

        {/* Dynamic View Component */}
        {String(routedTabId).startsWith('crm_') && (crmLoading || crmError) && (
          <div role={crmError ? 'alert' : 'status'} className={`flex items-center justify-between gap-3 border px-4 py-3 text-xs ${crmError ? 'border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--text-primary)]' : 'border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[var(--text-primary)]'}`}>
            <span>{crmError ? `CRM 数据加载失败：${crmError}` : '正在同步 CRM 数据...'}</span>
            {crmError && <button type="button" className="border border-current px-3 py-1 font-semibold hover:bg-[var(--bg-elevated)]" onClick={() => retryCrm().catch((error) => addToast('error', '重试失败', error instanceof Error ? error.message : '请稍后再试'))}>重试</button>}
          </div>
        )}
        <Suspense fallback={<div className="dark-panel flex min-h-80 items-center justify-center rounded-lg text-sm text-[var(--text-muted)]">正在加载页面…</div>}>
          <div className="animate-in fade-in duration-200">
            {routedTabId === 'prod_req_tasks' || routedTabId === 'prod_design_tasks' ? <RequirementTasksView key={routedTabId} productLineFilter={productLineFilter} taskKind={routedTabId === 'prod_design_tasks' ? 'design' : 'requirement'} itemLabel={routedTabId === 'prod_design_tasks' ? '设计任务' : '需求任务'} /> : renderView()}
          </div>
        </Suspense>
      </div>
    </main>
  );
};

const AppShell: React.FC = () => {
  return (
    <AppProvider>
        <div className="tech-shell flex flex-col h-screen w-screen overflow-hidden font-sans antialiased selection:bg-cyan-400 selection:text-slate-950">
          {/* Full-width global navigation */}
          <Header />

          <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
            {/* Left Vertical Menu */}
            <Sidebar />

            {/* Main body layout */}
            <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
              {/* Multitask Tabs Bar */}
              <TabsBar />

              {/* Dynamic Content Body */}
              <MainContent />
            </div>
          </div>
        </div>

        {/* Global Modal dialogs & Toasts */}
        <GlobalSearchModal />
        <ToastContainer />
    </AppProvider>
  );
};

const ProtectedApp: React.FC = () => {
  // 临时禁用登录验证用于测试
  return <AppShell />;
};

export const App: React.FC = () => <Routes>
  <Route path="/login" element={<DevLoginPage />} />
  <Route path="/app/:viewId" element={<ProtectedApp />} />
  <Route path="*" element={<Navigate to={readSession()?'/app/wb_my_tasks':'/login'} replace />} />
</Routes>;

export default App;

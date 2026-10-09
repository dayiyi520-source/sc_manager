import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ChevronRight, Layers, Users, Briefcase, FileCheck, BookOpen, Clock, FileText } from '@/components/common/octicons-compat';
import { useApp, MENU_GROUPS } from '../../context/AppContext';
import { SubMenuId } from '../../types';

export const GlobalSearchModal: React.FC = () => {
  const {
    globalSearchOpen,
    setGlobalSearchOpen,
    openPageTab,
    customers,
    opportunities,
    requirementTasks,
    approvals,
    knowledgeDocs,
    contracts,
    setSelectedCustomerIdForDetail,
    setSelectedOpportunityIdForDetail
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (globalSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [globalSearchOpen]);

  // Search through all items
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default quick suggestions
      return [
        { type: 'menu', id: 'wb_my_tasks', title: '工作台 · 我的任务', desc: '查看待办事项、审批与个人OKR', icon: Layers },
        { type: 'menu', id: 'prod_req_tasks', title: '产研管理 · 产品任务', desc: '产品任务列表与看板', icon: Layers },
        { type: 'menu', id: 'sys_work_items', title: '系统与组织 · 产研模板', desc: '配置新建产品的工作项、通知与自动化预设', icon: FileCheck },
        { type: 'menu', id: 'sys_okr_settings', title: '系统与组织 · 目标总结设置', desc: '配置目标拆解模板、开放时间与校验规则', icon: FileCheck },
        { type: 'menu', id: 'sys_permission_demo', title: '系统与组织 · 权限演示', desc: '按部门、产品身份与可见性查看权限范围', icon: FileCheck },
        { type: 'menu', id: 'sys_workflow_demo', title: '系统与组织 · 工作流演示', desc: '演示协同事项、产研任务与我的任务流转', icon: FileText }
      ];
    }

    const results: any[] = [];

    // Search menus
    MENU_GROUPS.forEach((group) => {
      group.subMenus.forEach((sub) => {
        if (sub.title.toLowerCase().includes(q) || group.title.toLowerCase().includes(q)) {
          results.push({
            type: 'menu',
            id: sub.id,
            title: `${group.title} · ${sub.title}`,
            desc: `进入【${sub.title}】管理模块`,
            icon: Layers
          });
        }
      });
    });

    // Search customers
    customers.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q)) {
        results.push({
          type: 'customer',
          id: c.id,
          title: c.name,
          desc: `客户编号: ${c.code} | 等级: ${c.level} | 联系人: ${c.contactName}`,
          icon: Users
        });
      }
    });

    // Search opportunities
    opportunities.forEach((opp) => {
      if (opp.name.toLowerCase().includes(q) || opp.customerName.toLowerCase().includes(q)) {
        results.push({
          type: 'opportunity',
          id: opp.id,
          title: opp.name,
          desc: `客户: ${opp.customerName} | 金额: ¥${(opp.amount / 10000).toFixed(1)}万 | 阶段: ${opp.stage}`,
          icon: Briefcase
        });
      }
    });

    // Search requirement tasks
    requirementTasks.forEach((t) => {
      if (t.title.toLowerCase().includes(q) || t.ownerName.toLowerCase().includes(q)) {
        results.push({
          type: 'task',
          id: t.id,
          title: t.title,
          desc: `负责人: ${t.ownerName} | 状态: ${t.status} | 优先级: ${t.priority}`,
          icon: Layers
        });
      }
    });

    // Search docs
    knowledgeDocs.forEach((d) => {
      if (d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)) {
        results.push({
          type: 'doc',
          id: d.id,
          title: d.title,
          desc: `分类: ${d.category} | 版本: ${d.version} | 作者: ${d.author}`,
          icon: BookOpen
        });
      }
    });

    return results.slice(0, 8);
  }, [query, customers, opportunities, requirementTasks, knowledgeDocs]);

  if (!globalSearchOpen) return null;

  const handleSelect = (item: any) => {
    setGlobalSearchOpen(false);
    if (item.type === 'menu') {
      openPageTab(item.id as SubMenuId);
    } else if (item.type === 'customer') {
      openPageTab('crm_customers');
      setSelectedCustomerIdForDetail(item.id);
    } else if (item.type === 'opportunity') {
      openPageTab('crm_opportunities');
      setSelectedOpportunityIdForDetail(item.id);
    } else if (item.type === 'task') {
      openPageTab('prod_req_tasks');
    } else if (item.type === 'doc') {
      openPageTab('wb_knowledge');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-20 p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={() => setGlobalSearchOpen(false)}
      />
      <div className="relative bg-[var(--bg-surface)] rounded-lg shadow-2xl border border-[var(--border-main)] w-full max-w-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-[var(--border-main)] bg-[var(--bg-main)]">
          <Search className="w-5 h-5 text-[var(--warning)] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入关键词搜索功能菜单、客户档案、商机、需求、合同、文档..."
            className="w-full py-4 text-sm bg-transparent outline-hidden text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[var(--border-main)]">
          {searchResults.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-xs">
              没有找到与 “{query}” 相关的匹配项，请尝试其他关键词
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  onClick={() => handleSelect(item)}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-[var(--bg-elevated)] cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-[var(--bg-elevated)] text-[var(--text-muted)] group-hover:bg-[var(--warning)] group-hover:text-black transition-colors">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[var(--text-body)] truncate group-hover:text-[var(--warning)]">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--warning)] transition-transform group-hover:translate-x-0.5" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[var(--bg-main)] border-t border-[var(--border-main)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded text-[10px] font-mono text-[var(--text-body)]">
                ESC
              </kbd>{' '}
              退出搜索
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded text-[10px] font-mono text-[var(--text-body)]">
                ↵
              </kbd>{' '}
              选择跳转
            </span>
          </div>
          <span className="font-serif text-[var(--warning)]">师创企业级智能中枢</span>
        </div>
      </div>
    </div>
  );
};

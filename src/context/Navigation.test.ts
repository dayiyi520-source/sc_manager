import { describe, expect, it } from 'vitest';
import { MENU_GROUPS } from './AppContext';

describe('design task navigation', () => {
  it('places design tasks immediately below requirement tasks', () => {
    const menus = MENU_GROUPS.find((group) => group.id === 'product')!.subMenus;
    const requirementIndex = menus.findIndex((menu) => menu.id === 'prod_req_tasks');
    expect(menus[requirementIndex].title).toBe('产品任务');
    expect(menus[requirementIndex + 1]).toEqual({
      id: 'prod_design_tasks', title: '设计任务', mainMenuId: 'product', icon: 'Edit'
    });
    expect(menus[requirementIndex + 2].id).toBe('prod_rd_tasks');
  });

  it('keeps menu identifiers unique', () => {
    const identifiers = MENU_GROUPS.flatMap((group) => group.subMenus.map((menu) => menu.id));
    expect(new Set(identifiers).size).toBe(identifiers.length);
  });

  it('exposes assistance and the separated product quality menus', () => {
    const workbench = MENU_GROUPS.find((group) => group.id === 'workbench')!.subMenus;
    const product = MENU_GROUPS.find((group) => group.id === 'product')!.subMenus;

    expect(workbench.find((menu) => menu.id === 'wb_work_order')?.title).toBe('协助事项');
    expect(product).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'prod_test_tasks', title: '测试任务' }),
      expect.objectContaining({ id: 'prod_test_management', title: '测试管理' }),
      expect.objectContaining({ id: 'prod_bugs', title: '缺陷管理' }),
      expect.objectContaining({ id: 'prod_version_reviews', title: '版本评审' })
    ]));
  });

  it('hides retired entry points while keeping system work item module visible', () => {
    expect(MENU_GROUPS.find((group) => group.id === 'crm')).toBeUndefined();
    expect(MENU_GROUPS.find((group) => group.id === 'approval')).toBeUndefined();
    expect(MENU_GROUPS.find((group) => group.id === 'project')).toBeUndefined();
    expect(MENU_GROUPS.find((group) => group.id === 'workbench')?.subMenus.some((menu) => menu.id === 'wb_knowledge')).toBe(false);
    const product = MENU_GROUPS.find((group) => group.id === 'product')!.subMenus;
    expect(product.some((menu) => menu.id === 'prod_reviews' || menu.id === 'prod_planning')).toBe(false);
    expect(MENU_GROUPS.find((group) => group.id === 'system')?.subMenus).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'sys_work_items', title: '产研模板' }),
      expect.objectContaining({ id: 'sys_permission_demo', title: '权限演示' }),
      expect.objectContaining({ id: 'sys_workflow_demo', title: '工作流演示' })
    ]));
  });

  it('places permission and workflow demos after the research template', () => {
    const system = MENU_GROUPS.find((group) => group.id === 'system')!.subMenus;
    const templateIndex = system.findIndex((menu) => menu.id === 'sys_work_items');
    expect(system[templateIndex + 1]).toEqual(expect.objectContaining({ id: 'sys_permission_demo', title: '权限演示' }));
    expect(system[templateIndex + 2]).toEqual(expect.objectContaining({ id: 'sys_workflow_demo', title: '工作流演示' }));
  });
});

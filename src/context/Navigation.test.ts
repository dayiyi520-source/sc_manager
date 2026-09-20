import { describe, expect, it } from 'vitest';
import { MENU_GROUPS } from './AppContext';

describe('design task navigation', () => {
  it('places design tasks immediately below requirement tasks', () => {
    const menus = MENU_GROUPS.find((group) => group.id === 'product')!.subMenus;
    const requirementIndex = menus.findIndex((menu) => menu.id === 'prod_req_tasks');
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
      expect.objectContaining({ id: 'prod_bugs', title: '缺陷管理' }),
      expect.objectContaining({ id: 'prod_version_reviews', title: '版本评审' })
    ]));
  });
});

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
});

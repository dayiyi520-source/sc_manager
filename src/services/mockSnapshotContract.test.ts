// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { MOCK_DATABASE, MOCK_OKR_PEOPLE } from '../data/mockSnapshot';
import { mockApiRequest } from './mockApi';
import { productLineDisplayStatus } from '../components/product/productLinePresentation';
import { readSession } from './session';

describe('snapshot demo contracts', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('migrates an old demo login identity to the same snapshot member', async () => {
    const token = 'dev-token-admin';
    sessionStorage.setItem('shichuang.session.token', token);
    sessionStorage.setItem('shichuang.session', JSON.stringify({ token, expiresAt: Date.now() + 60000, user: { id: 'legacy-admin', name: '林志豪', role: 'admin' } }));
    const session = readSession()!;
    const people = await mockApiRequest('/api/okr/people') as typeof MOCK_OKR_PEOPLE;
    expect(people.find(person => person.id === session.user.id)).toMatchObject({ name: '林志豪', rootFlag: 1 });
    expect(JSON.parse(sessionStorage.getItem('shichuang.session')!).user.id).toBe(session.user.id);
  });

  it('does not map a different name to the administrator through its role', () => {
    const token = 'dev-token-admin';
    sessionStorage.setItem('shichuang.session.token', token);
    sessionStorage.setItem('shichuang.session', JSON.stringify({ token, expiresAt: Date.now() + 60000, user: { id: 'unknown', name: '其他成员', role: 'admin' } }));
    expect(readSession()?.user.id).toBe('unknown');
  });

  it('returns the root reporting identity for Lin and repairs unedited cached seed data', async () => {
    localStorage.setItem('shichuang.frontend.mock.okrPeople', JSON.stringify([{ id: 'user-admin', rootFlag: 0, version: 0 }]));
    const people = await mockApiRequest('/api/okr/people') as typeof MOCK_OKR_PEOPLE;
    expect(people.find(person => person.id === 'user-admin')).toMatchObject({ name: '林志豪', rootFlag: 1, supervisorId: null });
    expect(people).toHaveLength(MOCK_OKR_PEOPLE.length);
  });

  it('preserves organization edits across subsequent reads', async () => {
    const member = MOCK_OKR_PEOPLE.find(person => person.id !== 'user-admin')!;
    await mockApiRequest(`/api/okr/people/${member.id}`, { method: 'PUT', body: JSON.stringify({ root: false, supervisorId: 'user-admin' }) });
    const people = await mockApiRequest('/api/okr/people') as typeof MOCK_OKR_PEOPLE;
    expect(people.find(person => person.id === member.id)).toMatchObject({ rootFlag: 0, supervisorId: 'user-admin', version: member.version + 1 });
  });

  it('uses snapshot product statuses for the display and filtering data', async () => {
    const products = await mockApiRequest('/api/product-lines') as Array<{ id: string; status: string; versions: [] }>;
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      const row = MOCK_DATABASE.t_product_line.find(row => row.id_ === product.id)!;
      expect(product.status).toBe(row.status_);
      expect(productLineDisplayStatus(product)).toBe(row.status_);
    }
    expect(products.filter(product => product.status === '已停用').length).toBeGreaterThan(0);
  });

  it('keeps product sort and commercial fields in the mock snapshot contract', async () => {
    const products = await mockApiRequest('/api/product-lines') as Array<{ id: string; sort?: number; commercialAvailability?: string; createdAt?: string }>;
    for (const product of products) {
      const row = MOCK_DATABASE.t_product_line.find(row => row.id_ === product.id)!;
      expect(product.sort).toBe(Number(row.sort_ || 0));
      expect(product.createdAt).toBe(row.create_time_);
      expect(['可商用', '不可商用']).toContain(product.commercialAvailability);
    }
  });

  it('persists a newly created product in the browser mock API', async () => {
    const created = await mockApiRequest('/api/product-lines', { method: 'POST', body: JSON.stringify({ name: '验收产品', code: 'acceptance', ownerName: '林志豪', commercialAvailability: '可商用', sort: 7 }) });
    const products = await mockApiRequest('/api/product-lines') as Array<{ id: string; name: string; commercialAvailability?: string; sort?: number }>;
    expect(products.find(product => product.id === created.id)).toMatchObject({ name: '验收产品', commercialAvailability: '可商用', sort: 7 });
  });

  it('derives responsibility candidates from snapshot product responsibility IDs', async () => {
    const products = await mockApiRequest('/api/product-lines') as Array<{ name: string; members?: Array<{ userId: string; name: string }> }>;
    const line = products.find((product) => product.name === '师创砺知堂');
    expect(line?.members?.length).toBeGreaterThan(0);
    expect(line?.members?.some((member) => member.name === '毛景强')).toBe(true);
  });

  it('refreshes team options and role seats after a member rename', async () => {
    const before = await mockApiRequest('/api/team-members/options') as Array<{ id: string; name: string }>;
    const target = before.find((member) => member.name === '毛景强')!;
    await mockApiRequest(`/api/team-members/${target.id}`, { method: 'PUT', body: JSON.stringify({ name: '杨硕', department: '', jobTitle: '', version: 0 }) });
    const after = await mockApiRequest('/api/team-members/options') as Array<{ id: string; name: string }>;
    expect(after.find((member) => member.id === target.id)?.name).toBe('杨硕');
  });
});

import { describe, expect, it } from 'vitest';
import { BUSINESS_TASK_SCOPES, businessTaskSource, matchesBusinessTaskScope } from './businessTaskPresentation';
import type { CurrentUser, Customer, Opportunity, ProjectRecord, TenderBidding, RequirementTask } from '../../types';
const user: CurrentUser = { id: 'u1', name: '张三', avatar: '', role: 'admin', roleTitle: '管理员', department: '交付部' };
const task = (value: Partial<RequirementTask> = {}): RequirementTask => ({ id: '1', title: '任务', status: '待处理', priority: '中', ownerName: '张三', creatorName: '李四', department: '交付部', versionName: '', productLineName: '', estimatedHours: 0, dueDate: '', ...value });
describe('business task presentation', () => {
  it('exposes company scope immediately after department scope', () => expect(BUSINESS_TASK_SCOPES.map(scope => scope[1])).toEqual(['我负责的', '我创建的', '我部门的', '全公司的', '我归档的']));
  it('includes other departments and missing ownership in company scope', () => {
    expect(matchesBusinessTaskScope(task({ department: '销售部', assigneeId: 'u2' }), 'all', user, [])).toBe(true);
    expect(matchesBusinessTaskScope(task({ department: undefined, creatorName: undefined }), 'all', { ...user, department: '' }, [])).toBe(true);
  });
  it('prefers stable identity over a matching name', () => {
    expect(matchesBusinessTaskScope(task({ assigneeId: 'u2' }), 'my_owned', user, [])).toBe(false);
    expect(matchesBusinessTaskScope(task({ assigneeId: 'u1', ownerName: '旧姓名' }), 'my_owned', user, [])).toBe(true);
    expect(matchesBusinessTaskScope(task({ creatorId: 'u2', creatorName: user.name }), 'my_created', user, [])).toBe(false);
    expect(matchesBusinessTaskScope(task({ creatorId: 'u1' }), 'my_created', user, [])).toBe(true);
  });
  it('supports legacy names without treating missing creators as the reader', () => {
    expect(matchesBusinessTaskScope(task(), 'my_owned', user, [])).toBe(true);
    expect(matchesBusinessTaskScope(task({ creatorName: undefined }), 'my_created', user, [])).toBe(false);
  });
  it('uses task department or the uniquely identified owner department', () => {
    expect(matchesBusinessTaskScope(task(), 'my_department', user, [])).toBe(true);
    expect(matchesBusinessTaskScope(task({ department: '', assigneeId: 'u2' }), 'my_department', user, [{ id: 'u2', name: '其他人', department: user.department }])).toBe(true);
    expect(matchesBusinessTaskScope(task({ department: '' }), 'my_department', user, [{ id: 'u1', name: '张三', department: user.department }, { id: 'u2', name: '张三', department: '销售部' }])).toBe(false);
  });
  it('does not expand the department scope when the viewer lacks a department', () => expect(matchesBusinessTaskScope(task(), 'my_department', { ...user, department: '' }, [])).toBe(false));
  it('shows either opportunity or bidding plus project', () => {
    expect(businessTaskSource(task({ specialFields: { opportunityName: '商机 A' }, projectName: '校园项目' }), 'presales').ownership).toBe('商机：商机 A / 校园项目');
    expect(businessTaskSource(task({ specialFields: JSON.stringify({ biddingName: '招标 A', projectName: '校园项目' }) }), 'presales').ownership).toBe('招投标：招标 A / 校园项目');
  });
  it('resolves associated projects and retains the task stage when present', () => {
    const project = { id: 'p1', name: '校园项目', customerName: '示例院校', stage: '需求调研' } as ProjectRecord;
    expect(businessTaskSource(task({ projectId: project.id }), 'delivery', { projects: [project] })).toEqual({ ownership: '校园项目 / 示例院校', stage: '需求调研' });
    expect(businessTaskSource(task({ projectId: project.id, specialFields: { projectStage: 'UAT验收' } }), 'delivery', { projects: [project] }).stage).toBe('UAT验收');
  });
  it('resolves source object ids and customer names from the available references', () => {
    const project = { id: 'p1', name: '项目一', customerId: 'c1', customerName: '', stage: '需求调研' } as ProjectRecord;
    const customer = { id: 'c1', name: '院校一' } as Customer;
    const opportunity = { id: 'o1', name: '商机一' } as Opportunity;
    const bidding = { id: 'b1', name: '招投标一', projectName: '项目一' } as TenderBidding;
    expect(businessTaskSource(task({ specialFields: { projectId: 'p1', customerId: 'c1' } }), 'delivery', { projects: [project], customers: [customer] }).ownership).toBe('项目一 / 院校一');
    expect(businessTaskSource(task({ specialFields: { opportunityId: 'o1' } }), 'presales', { opportunities: [opportunity] }).ownership).toBe('商机：商机一');
    expect(businessTaskSource(task({ specialFields: { biddingId: 'b1' } }), 'presales', { biddings: [bidding] }).ownership).toBe('招投标：招投标一 / 项目一');
  });
  it('handles missing and malformed source fields without using product/version names', () => {
    expect(businessTaskSource(task({ specialFields: '{broken', productLineName: '不能充当项目' }), 'presales').ownership).toBe('未关联商机或招投标');
    expect(businessTaskSource(task(), 'delivery')).toEqual({ ownership: '未关联项目 / 未关联客户院校', stage: '未设置' });
  });
});

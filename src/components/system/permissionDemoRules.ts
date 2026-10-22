import { isCollaborationCreator } from '../../utils/collaborationWorkflow';
import { canReviewCompletion, isTaskOwner, needsCompletionApproval } from '../../utils/businessTaskWorkflow';
import { canUpdateMyTaskProgress } from '../../services/myTaskProgress';
import { canViewWorkbenchFeed } from '../../services/workbenchFeeds';
import { hasOkrPermission, OKR_PERMISSIONS } from '../../services/okrSettingsPolicy';
import type { OkrPerson, OkrSettings } from '../../services/okrRepository';
import type { RequirementTask, CurrentUser } from '../../types';
export type DemoIdentity = 'creator' | 'owner' | 'audience' | 'other' | 'admin';
export type DemoDomain = 'collaboration' | 'todo' | 'feeds' | 'delivery' | 'okr' | 'product';
export type PermissionRow = { name: string; allowed?: boolean; reason: string };
export const permissionNames = { okrTemplates:'OKR模板', reviewTemplates:'复盘总结模板', roleSettings:'角色设置', weeklyCycles:'周期配置', confirmationSettings:'目标确认配置', companyGoalEdit:'公司目标编辑' };
export function demoPermissions(domain: DemoDomain, identity: DemoIdentity, status: string, specified: boolean, sourceMessage = false, sameOwner = false): PermissionRow[] {
  const user = { id: identity, name: identity, role: identity === 'admin' ? 'admin' : 'product_manager' } as CurrentUser;
  const task = { id:'demo-only', creatorId:'creator', creatorName:'creator', assigneeId:sameOwner?'creator':'owner', ownerName:sameOwner?'creator':'owner', status } as RequirementTask;
  const owner = isTaskOwner(task, user), creator = isCollaborationCreator(task, user);
  if(domain === 'collaboration') return [
    {name:'修改事项内容',allowed:creator || owner,reason:'创建人或当前负责人可修改；仍须满足内容、状态和版本校验。'},
    {name:'接收 / 发起转派',allowed:owner && status === '待处理',reason:'待处理事项由当前负责人操作；已有待接收转派时须先处理转派。'},
    {name:'新增下游任务 / 提交验收',allowed:owner && status === '处理中',reason:'处理中由负责人操作；提交验收须完成所有影响关闭的关联任务。'},
    {name:'验收通过 / 建议返工',allowed:creator && status === '待验收',reason:'创建人是验收入口的操作人，通过需选择 1 至 5 星；未通过须说明原因。'},
    {name:'关闭已退回事项',allowed:creator && status === '已退回',reason:'只有创建人能关闭已退回事项，不存在待关闭主流程。'},
    {name:'重新发起',allowed:creator && ['已退回','已完成','已关闭'].includes(status),reason:'创建人重新选择有效负责人；已完成或已关闭事项须填写重新开启原因。'},
  ];
  if(domain === 'todo') return [
    {name:'个人待办归属',allowed:owner,reason:'仅当前负责人名下任务进入本人的任务查询，不因管理员身份扩大为他人待办。'},
    {name:'修改当前进度',allowed:owner && canUpdateMyTaskProgress(status),reason:'仅本人负责且未结束的待办；进度为 0 至 100 的整数，保存校验版本。'},
    {name:'查看已结束记录',allowed:owner,reason:'完整待办中心包含本人已完成、关闭、取消等记录，首页仅展示未结束记录。'},
  ];
  if(domain === 'delivery') return [
    {name:'完成是否需要审核',allowed:needsCompletionApproval(task),reason:'创建人与负责人不同须审核；同一人直接完成。'},
    {name:'审核完成申请',allowed:status === '待审核' && canReviewCompletion(task,user),reason:'待审核申请由创建人或系统管理员通过、拒绝；基础任务状态仍为处理中。'},
  ];
  if(domain === 'feeds') {
    const feed={id:'demo-only',type:'feedback' as const,title:'演示信息',content:'只读演示',time:'',authorId:'creator',visibility:specified?'specified' as const:'all' as const,audienceIds:['audience']};
    return [
      {name:'查看工作台消息',allowed:canViewWorkbenchFeed(feed,{...user, department: specified ? identity : '产研部门'}),reason:'新信息按组织和部门范围可见；历史指定人员信息仍仅作者及指定人员可见，管理员不自动越过指定范围。'},
      {name:'编辑 / 删除工作台新建信息',allowed:creator && !sourceMessage,reason:'仅本人从工作台创建的信息；删除二次确认，来源板块信息须回来源维护。'},
      {name:'修改分类浏览 / 单条阅读状态',allowed:true,reason:'每位用户只记录自己的状态；进入分类清红点，详情成功显示后清除单条“新”。'},
    ];
  }
  return [
    {name:'产品与工作项页面',reason:'当前页面与 Mock 没有采用原演示的“部门角色＋成员角色”统一授权矩阵，不能据部门名称推断编辑权。'},
    {name:'产品公开 / 私有设置',reason:'保留产品可见范围配置；本演示不将配置值解释为全部查询接口均已执行产品访问拦截。'},
    {name:'任务状态操作',reason:'工作项依据绑定的已发布流程、允许的状态路径、表单和版本校验执行；八类任务保留期望完成时间。'},
    {name:'工作项设置',reason:'工作项分类、模版、通知、归档产品和归档任务使用现有页面行为；不套用 OKR 管理员授权。'},
  ];
}
export function okrDemoPermissions(viewerId:string, settings:OkrSettings, people:OkrPerson[]):PermissionRow[] {
  return OKR_PERMISSIONS.map(permission=>({name:permissionNames[permission],allowed:hasOkrPermission(viewerId,permission,settings,people),reason:'读取当前目标总结设置的授权；管理员具备全部授权，子管理员按授权生效，主管身份本身不授予设置编辑权。'}));
}

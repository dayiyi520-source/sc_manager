import type {KnowledgeDocument,OkrItem,PerformanceReview,WorkbenchApproval,WorkbenchTask,WorkOrder} from '../types';

const KEY='shichuang.vue.workbench';
const seed={
  tasks:[
    {id:'REQ-1042',title:'完善需求任务筛选和分组能力',status:'进行中',priority:'P1-高优',productLine:'师创智联协同OS',dueDate:'2026-09-15'},
    {id:'BUG-238',title:'修复迭代详情关联任务显示异常',status:'待处理',priority:'P0-紧急',productLine:'智能低代码中台',dueDate:'2026-09-12'},
    {id:'REQ-1036',title:'完成审批中心 Vue 页面验收',status:'已完成',priority:'P2-普通',productLine:'师创智联协同OS',dueDate:'2026-09-08'}] as WorkbenchTask[],
  approvals:[{id:'AP-001',title:'国家电网二期合同用印审批',applicant:'陈雅婷',status:'待审批',createdAt:'2026-09-09'},{id:'AP-002',title:'研发测试设备采购审批',applicant:'王浩然',status:'已通过',createdAt:'2026-09-08'}] as WorkbenchApproval[],
  okrs:[{id:'OKR-1',cycle:'2026-09',category:'my',objective:'完成核心模块 Vue 迁移并通过验收',owner:'林志豪',progress:72,weight:40,deadline:'2026-09-30',alignTo:'产品交付效率提升',keyResults:[{id:'KR-1',content:'完成工作台全部页面迁移',progress:80,weight:40,deadline:'2026-09-15'},{id:'KR-2',content:'完成研发管理深度功能',progress:55,weight:60,deadline:'2026-09-30'}]},{id:'OKR-2',cycle:'2026-09',category:'department',objective:'研发交付周期缩短 25%',owner:'王浩然',progress:61,weight:35,deadline:'2026-09-30',alignTo:'年度研发效能目标',keyResults:[{id:'KR-3',content:'需求按期交付率达到 90%',progress:61,weight:100,deadline:'2026-09-30'}]}] as OkrItem[],
  reviews:[{id:'REV-1',cycleName:'2026年8月月度复盘',type:'月复盘',summary:'完成审批与项目模块首轮 Vue 迁移。',selfScore:88,status:'已提交',createdAt:'2026-09-01'}] as PerformanceReview[],
  documents:[{id:'DOC-1',title:'Vue 前端迁移规范',category:'产研规范',tags:['Vue','迁移规范'],author:'张瑞',version:'V1.2',updatedAt:'2026-09-09',views:128,favorite:true,summary:'统一 Vue 页面结构、组件边界和验收规则。',content:'页面应复用统一头部、筛选、表格、详情和反馈组件；新建表单不设置默认选中项。'},{id:'DOC-2',title:'师创智联OS产品需求规格说明书',category:'产品沉淀',tags:['PRD','产品'],author:'毛景强',version:'V3.0',updatedAt:'2026-09-08',views:256,favorite:false,summary:'核心业务域产品需求说明。',content:'覆盖客户、产研、项目、审批及组织管理等业务域。'},{id:'DOC-3',title:'项目交付验收清单',category:'项目沉淀',tags:['验收','交付'],author:'李思齐',version:'V2.1',updatedAt:'2026-09-06',views:92,favorite:false,summary:'项目交付前检查项。',content:'包括功能、权限、数据、性能和部署验证。'}] as KnowledgeDocument[],
  workOrders:[{id:'WO-1',code:'POOL-2026-033',title:'支持双人同行人脸比对复核开锁',description:'高压变电站操作前需主操与监护人同时认证。',goal:'满足国网安规审计要求。',productLine:'师创智联协同OS',customer:'国家电网华东分部',priority:'P0-紧急阻断',source:'客户反馈',status:'待评审',createdAt:'2026-08-28'},{id:'WO-2',code:'POOL-2026-034',title:'第三方消息卡片一键催办',description:'在企业微信、飞书、钉钉卡片内完成审批。',goal:'常规审批时效提升40%。',productLine:'智能低代码中台',customer:'',priority:'P1-高优',source:'内部规划',status:'已采纳',createdAt:'2026-08-26'},{id:'WO-3',code:'POOL-2026-035',title:'电子运单条码OCR离线推理加速',description:'提高弱光和破损面单识别率。',goal:'识别率提升至95%。',productLine:'移动端协同App',customer:'申通智联',priority:'P1-高优',source:'销售商机',status:'已转任务',createdAt:'2026-08-15'}] as WorkOrder[]
};
export type WorkbenchData=typeof seed;
const clone=():WorkbenchData=>JSON.parse(JSON.stringify(seed)) as WorkbenchData;
export const workbenchRepository={
  load():WorkbenchData{try{const value=localStorage.getItem(KEY);return value?{...clone(),...JSON.parse(value)}:clone()}catch{return clone()}},
  save(data:WorkbenchData){localStorage.setItem(KEY,JSON.stringify(data));},
  reset(){localStorage.removeItem(KEY);return clone();}
};

# 八类任务个人归档实施记录

**目标**：在产品、设计、研发、测试、缺陷、运维、交付、售前列表的全公司范围之后增加个人归档，支持取消归档和刷新恢复。

**确认依据**：2026-10-22 用户确认聊天中的方案，补充缺陷任务。

**架构**：复用任务列表及现有归档恢复机制。通过仓库层读取完整归档记录，沿用各类任务表头、筛选、分组和分页，以操作人身份过滤。

**技术范围**：现有 React、TypeScript、React Query、Ant Design、Octicons 和本地 Mock 持久化；无新增依赖。

## 交付步骤

- [x] 核对归档数据和恢复契约，记录操作人身份、归档时间及版本，兼容可唯一识别的历史姓名记录。
- [x] 接入共用列表范围和计数，保留原字段，归档状态禁止直接修改及普通批量操作。
- [x] 实现取消归档、请求锁定、失败保留及查询刷新，复制不得继承归档标记。
- [x] 同步编号需求 1.1.58，描述正常、加载、失败、空数据、权限和版本冲突。
- [x] 验证八类任务交互、操作人隔离、保存重新读取、刷新恢复及相关回归；运行类型检查和构建。

## 涉及文件及职责

- `src/components/product/RequirementTasksView.tsx`：共用列表交互。
- `src/components/product/taskArchiveScope.ts`：操作人身份判定。
- `src/components/product/businessTaskPresentation.ts`：标签范围定义。
- `src/components/system/ResearchTemplateView.tsx`：归档管理操作后刷新个人范围。
- `src/services/productRepository.ts`、`mockApi.ts`、`mockBusinessTasks.ts`、`src/types/index.ts`：记录契约与本地保存恢复。
- 对应组件测试、持久化集成测试及 `docs/prd/V1.0.0.md`。

## 已知项目基线

- 共享详情回归中的 12 个失败项已使用修改前代码对照复现，涉及原有设计类型、详情卡片、创建校验及测试计划重试。
- PRD 注册表为空，但文档已包含 12 个主需求；原文包含校验禁止词。更新前后这两项校验结果相同，不扩展至全量 PRD 修复。

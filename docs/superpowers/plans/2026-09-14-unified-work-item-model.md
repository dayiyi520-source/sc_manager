# Unified Work Item Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在兼容现有业务表的前提下落地统一工作项、状态流程、关系和聚合查询。

**Architecture:** 先建立读取聚合层和配置模型，再接入评审原子创建与流转；旧业务表继续作为历史数据来源。关系和活动独立持久化，需求与版本汇总由服务端计算。

**Tech Stack:** React 19、Ant Design 6、Spring Boot 3.5、Java 17、MySQL、Flyway、Vitest。

**Spec:** `docs/superpowers/specs/2026-09-14-unified-work-item-model-design.md`

## Global Constraints
- 不引入模块层。
- 每个产品线使用统一工作项体系；category 表示分类，task_type_id 表示该产品线分类下自定义的任务类型，parent_work_item_id 单独表示父子关系。
- 分类状态流转和子任务类型配置均归属产品线，不能跨产品线误用配置。
- 需求评审通过只创建设计、研发、测试三个主任务。
- 自动创建失败整批回滚，失败仅写日志。
- P0/P1 缺陷阻塞，P2/P3 不阻塞。
- 已发布流程版本只能新建版本，已使用状态只能停用。

---

### Task 1: 字段与状态兼容读取层
**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/UnifiedWorkItemService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementService.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/UnifiedWorkItemServiceTest.java`

- [x] 定义统一 DTO、分类和旧字段兼容规则；category 与 taskTypeId 独立。历史缺失的配置 ID 返回 null，不按名称猜测。
- [x] 为需求、设计、研发、缺陷提供统一读取；测试分类返回未接入说明，不伪造测试任务。
- [x] 按原 ID 去重历史设计副本，独立设计记录优先；增加租户、产品角色和产品线可见范围校验。
- [x] 增加通用状态属性、逾期、潜在高优缺陷和按需求计数的版本汇总；不把读取结果当作自动流转依据。
- [ ] 测试持久化及流程版本接入完成后，替换覆盖范围限制并实现完整阶段计算。

**首批实际文件与接口：**
- `UnifiedWorkItem.java`：类型化读取结果；`WorkItemStatus.java`：历史状态兼容映射，不授予流转权限。
- `UnifiedWorkItemMapper.java`：四类表的参数化联合查询和历史设计去重，仅读取当前租户及指定产品线。
- `UnifiedWorkItemService.java`：过滤分页、需求关联汇总和版本需求计数；`UnifiedWorkItemController.java`：三个只读接口。
- `GET /api/work-items?productLineId=...` 返回 `{page, limitations}`；分页大小上限 100。
- `GET /api/requirements/{id}/summary?productLineId=...` 返回原需求、关联项、并行处理人、完成项、逾期项及潜在阻塞缺陷。
- `GET /api/product-lines/{lineId}/versions/{versionId}/summary` 返回需求计数和完成度。`readyToRelease` 与 `completionEligible` 为 null，明确尚不可判定。

**首批验证命令：**
```powershell
& ./.tools/apache-maven-3.9.11/bin/mvn.cmd -f backend/pom.xml '-Dtest=UnifiedWorkItemServiceTest,UnifiedWorkItemReadIntegrationTest' test
```
只读集成测试禁用 Flyway，不运行迁移或插入测试数据。检查自定义未知状态、评审非完成、P0/P1与P2/P3区别、取消非成功、分页溢出、跨租户/版本、产品线可见范围以及真实联合查询。后续数据库阶段必须先对照本地已执行历史，不能直接使用下面原草案中的迁移版本号。

**2026-09-14 首批验证结果：**12 项单元测试与 3 项只读集成测试全部通过；`git diff --check` 通过。现有 PRD 1.1 已同步更新。PRD 自动校验因项目缺少注册文件失败，未初始化或覆盖原文档，未创建功能 checkpoint。当前运行的后端服务仍是此前的版本修复构建，本批接口已在测试上下文验收，尚未替换运行服务。完整工作流、测试存储、关系写入、自动下发和页面接入仍属于后续阶段。

### Task 2: 状态定义与流转配置
**Files:**
- Create: 工作流增量迁移；本地数据库已经使用到 V1.0.38，落盘前统一主项目与 OKR 工作树的迁移编号。
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkflowController.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkflowService.java`

- [ ] 建立工作流、状态定义和流转规则表。
- [ ] 实现产品线+工作项分类匹配和流程版本读取；分类下任务类型使用分类流程。
- [ ] 对接产品线任务类型配置，补齐测试分类以及子任务类型、允许的父子分类组合配置。
- [ ] 验证跨产品线配置引用被拒绝、停用类型不能用于新建、历史任务保留原类型及流程版本。
- [ ] 实现已发布版本不可修改、已用状态仅停用校验。

### Task 3: 工作项关系与活动记录
**Files:**
- Create: 关系增量迁移；沿用上一步确定的迁移序列，不复用已执行编号。
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkItemRelationService.java`

- [ ] 建立关系和活动记录表。
- [ ] 实现 BLOCKS 循环检测及跨需求、跨版本校验。
- [ ] 验证子任务类型归属和父子组合，禁止父子自关联和循环。
- [ ] 记录状态、负责人、关系和验收变更。

### Task 4: 评审通过原子创建
**Files:**
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/RequirementController.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/RequirementControllerIntegrationTest.java`

- [ ] 新增评审通过接口。
- [ ] 在单事务内创建设计、研发、测试三个主任务。
- [ ] 任一失败回滚全部业务写入并结构化记录失败日志。
- [ ] 增加重复提交幂等测试。

### Task 5: 聚合查询与前端汇总
**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkItemSummaryController.java`
- Modify: `src/services/requirementRepository.ts`
- Modify: `src/components/product/RequirementTasksView.tsx`
- Modify: `src/components/product/VersionIterationView.tsx`

- [ ] 提供需求和版本汇总接口。
- [ ] 展示当前阶段、处理人、阻塞、逾期和未完成原因。
- [ ] 补充加载、空态、错误和禁用状态。

### Task 6: 验证与 PRD 更新
**Files:**
- Modify: `docs/prd/V1.0.0.md`

- [ ] 更新对应需求章节并运行 PRD 校验。
- [ ] 执行后端测试、前端 lint/test/build。
- [ ] 创建本地 feature checkpoint。

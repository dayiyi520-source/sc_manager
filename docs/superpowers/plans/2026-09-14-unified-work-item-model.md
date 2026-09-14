# Unified Work Item Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在兼容现有业务表的前提下落地统一工作项、状态流程、关系和聚合查询。

**Architecture:** 先建立读取聚合层和配置模型，再接入评审原子创建与流转；旧业务表继续作为历史数据来源。关系和活动独立持久化，需求与版本汇总由服务端计算。

**Tech Stack:** React 19、Ant Design 6、Spring Boot 3.5、Java 17、MySQL、Flyway、Vitest。

**Spec:** `docs/superpowers/specs/2026-09-14-unified-work-item-model-design.md`

## Global Constraints
- 不引入模块层。
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

- [ ] 定义统一 DTO、类型映射和旧字段兼容规则。
- [ ] 为需求、设计、研发、测试、缺陷提供统一读取结果。
- [ ] 增加状态类别和阶段聚合计算测试。

### Task 2: 状态定义与流转配置
**Files:**
- Create: `backend/src/main/resources/db/migration/V1.0.32__work_item_workflows.sql`
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkflowController.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkflowService.java`

- [ ] 建立工作流、状态定义和流转规则表。
- [ ] 实现产品线+工作项类型匹配和流程版本读取。
- [ ] 实现已发布版本不可修改、已用状态仅停用校验。

### Task 3: 工作项关系与活动记录
**Files:**
- Create: `backend/src/main/resources/db/migration/V1.0.33__work_item_relations.sql`
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkItemRelationService.java`

- [ ] 建立关系和活动记录表。
- [ ] 实现 BLOCKS 循环检测及跨需求、跨版本校验。
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

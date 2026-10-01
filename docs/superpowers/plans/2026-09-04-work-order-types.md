# 五类工单中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将提工单、工单列表和详情扩展为五类工单工作流并兼容历史需求记录。

**Architecture:** 在现有 RequirementTask/RequirementPoolView/RequirementController 链路上增加工单类型和专属字段，公共字段复用现有表单与保存接口；列表统计和筛选在前端组合现有数据，后端 DTO、实体映射和迁移同步保存新字段。

**Tech Stack:** React 19、TypeScript、Vite、Spring Boot 3.5、Java 17、Maven、MySQL/Flyway。

**Spec:** `docs/superpowers/specs/2026-09-04-work-order-types-design.md`

## Global Constraints

- 保留 React 19/Vite 与现有页面结构。
- 保留历史 `taskType`，新增 `workOrderType`/`specialFields` 做兼容扩展。
- 所有代码变更同步更新 `docs/prd/V1.0.0.md` 与 registry。
- 不提交 secrets、构建产物或无关用户修改。

### Task 1: 扩展工单数据契约

**Files:** `frontend/src/types/index.ts`、`backend/src/main/java/com/shichuang/manage/product/RequirementController.java`、`backend/src/main/java/com/shichuang/manage/product/RequirementService.java`、`backend/src/main/java/com/shichuang/manage/product/RequirementMapper.java`、新增 Flyway migration。

- [ ] 增加五类工单类型和专属字段类型。
- [ ] 创建和详情接口透传 `workOrderType`、`specialFields`。
- [ ] 为数据库增加可空字段，历史记录默认兼容。
- [ ] 运行后端测试与迁移校验。

### Task 2: 改造提工单入口和表单

**Files:** `frontend/src/components/product/RequirementPoolView.tsx`、相关测试。

- [ ] 用五张入口卡片替换默认图片和按钮，保留双语文案。
- [ ] 根据卡片类型渲染公共字段和专属字段。
- [ ] 校验公共必填字段，提交时保存工单类型和专属字段。
- [ ] 补充卡片选择、字段渲染和提交校验测试。

### Task 3: 改造列表和详情

**Files:** `frontend/src/components/product/RequirementPoolView.tsx`、相关测试、PRD/registry。

- [ ] 增加五类 Tab 和每类总数/待处理/处理中/已处理统计。
- [ ] 增加标题/客户/负责人搜索、与我有关范围、状态筛选。
- [ ] 调整列表字段和详情抽屉的专属字段区。
- [ ] 运行 lint、全量测试、build、diff check、PRD validate。

### Task 4: 浏览器与本地检查点

**Files:** 仅已变更的功能文件和文档。

- [ ] 在 1920x1080 内置浏览器验证五张卡片、类型表单、列表筛选、详情展示和控制台错误。
- [ ] 创建 requirement 1.2 的本地 feature checkpoint。

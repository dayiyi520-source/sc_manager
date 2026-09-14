# 目标与绩效闭环 Implementation Plan

> 执行方式：按用户要求在当前工作树直接完成，不拆分代理或分支。以下原始文件规划供追溯，实际交付以本节为准。

## 2026-09-14 实施结果

- [x] 组织关系配置、循环校验和直属上下级数据范围。
- [x] 下级必须承接同月直属上级执行中目标，可进一步引用上级 KR。
- [x] KR 权重、加权进度、目标提交确认、完成与归档。
- [x] 实际任务和工单归集、持久化 KR 关联、计划外工作保留。
- [x] 结构化复盘、产出与阻塞、受影响目标和 KR 关联。
- [x] 主管退回、员工重提、最终评分和计划外贡献确认。
- [x] MySQL 持久化、并发版本校验、事务审计、提交快照。
- [x] 前后端自动化检查和独立本地验收服务。

实际代码位于 `src/components/workbench/okr/`、`src/services/okrRepository.ts` 和 `backend/src/main/java/com/shichuang/manage/okr/`。新增迁移为 1.0.33、1.0.34。使用现有 React 19、Ant Design 6.6.3、Spring Boot JDBC 约定。

后续依次处理业务验收反馈、多目标协同与完整目标树、源任务页面关联入口、来源跳转与历史进度。统一旧任务负责人 ID 并处理历史数据库迁移基线后，另行安排共享环境验证和上线。未执行生产部署。

验收环境与已知边界见 `docs/qa/okr-local-acceptance.md`。

**Goal:** 实现上级 OKR 引用、任务/工单归集、计划外工作复盘和主管评价闭环。

**Architecture:** 保留现有 React 工作台入口，将单文件视图拆为目标、关联工作项和复盘三个职责单元；先建立可运行的前端领域模型和状态流转，再接入项目现有 API/后端约定。所有业务操作通过 Context/API 层完成，页面不直接发请求。

**Tech Stack:** React 19、TypeScript、Ant Design 5、React Query、React Router、Tailwind CSS、现有 Octicons 兼容层。

**Spec:** `docs/superpowers/specs/2026-09-14-okr-performance-design.md`

## Global Constraints

- 使用项目既有 React、Ant Design 和 TypeScript 约定。
- 颜色、字号、间距读取现有 Design Token，禁止新增硬编码视觉值。
- 新增组件提供 Normal、Hover/Focus、Loading、Disabled/Error 状态。
- 业务数据不得继续依赖不可恢复的页面内存状态。
- 每个代码变更同步更新 `docs/prd/V1.0.0.md`。

---

### Task 1: 补齐领域类型与示例关系数据

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/data/mockData.ts`
- Modify: `docs/prd/V1.0.0.md`

**Deliverable:** 增加目标引用、工作项关联、计划外工作和复盘明细类型，并准备覆盖上下级引用与计划外延期影响的示例数据。

### Task 2: 重构 OKR 视图

**Files:**
- Modify: `src/components/workbench/OKRPerformanceView.tsx`
- Create: `src/components/workbench/okr/ObjectiveForm.tsx`
- Create: `src/components/workbench/okr/ObjectiveDetail.tsx`
- Create: `src/components/workbench/okr/ObjectiveLinkPicker.tsx`

**Deliverable:** 强制引用上级目标/KR，校验 KR 权重，支持目标详情、状态反馈和关系展示。

### Task 3: 建立任务/工单关联与复盘归集

**Files:**
- Modify: `src/context/AppContext.tsx`
- Create: `src/components/workbench/okr/WorkItemLinksPanel.tsx`
- Modify: `src/components/workbench/OKRPerformanceView.tsx`

**Deliverable:** 按周期归集 OKR 内任务、工单和计划外工作，支持补充关联、结果、阻塞与延期影响。

### Task 4: 实现复盘与主管评价流程

**Files:**
- Create: `src/components/workbench/okr/ReviewWorkspace.tsx`
- Create: `src/components/workbench/okr/ReviewApprovalPanel.tsx`
- Modify: `src/types/index.ts`
- Modify: `src/context/AppContext.tsx`

**Deliverable:** 实现草稿、提交、退回、重新提交、主管评价、确认和归档状态流转。

### Task 5: 接入持久化边界并清理旧实现

**Files:**
- Modify: `src/context/AppContext.tsx`
- Modify: `src/api/*`（按现有 API 结构落位）
- Modify: `src/components/workbench/OKRPerformanceView.tsx`

**Deliverable:** 将目标与复盘写入项目既有持久化/API 边界，清理未使用 import、原生控件和重复逻辑。

### Task 6: 验证与验收

**Files:**
- Create or modify: `src/**/*.test.*`（仅覆盖关键业务规则）
- Modify: `docs/prd/V1.0.0.md`

**Checks:**
- 运行 `npm run typecheck` 或项目等价命令。
- 运行 `npm run lint`。
- 运行目标引用、KR 权重、计划外工作归集、复盘退回重提和权限过滤测试。
- 执行 PRD 校验和项目 feature checkpoint。

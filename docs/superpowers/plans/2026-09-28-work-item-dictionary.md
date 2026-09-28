# 产研字典动态分类与字段配置 Implementation Plan

> **For agentic workers:** 按任务顺序实现并在每项后运行最小相关检查。

**Goal:** 完成响应式产研字典、动态分类管理和四场景字段配置。

**Architecture:** 分类字典与字段配置分别持久化，通过分类稳定编码关联。前端使用 Ant Design Tabs、Table、Drawer、Form 和响应式断点；后端由 Controller → Service → Mapper 完成校验和存储。

**Tech Stack:** React 19、TypeScript、Ant Design、Spring Boot 3.5、JdbcTemplate、MySQL、Vitest/JUnit。

**Spec:** `docs/superpowers/specs/2026-09-28-work-item-dictionary-design.md`

## Global Constraints

- 保留六个内置分类编码和已有数据兼容性。
- 不增加新的前端依赖，不硬编码新颜色，不使用原生 alert/confirm。
- 所有写操作校验租户、权限、版本和引用关系。

### Task 1: 数据库与后端分类能力

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260928.5__work_item_field_configuration.sql`
- Modify: `backend/src/main/java/com/shichuang/manage/product/WorkItemCategoryController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/WorkItemCategoryService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/WorkItemCategoryMapper.java`

- [ ] 增加分类能力类型及字段配置表迁移。
- [ ] 增加分类新增、删除、动态编码校验和引用检查。
- [ ] 编译后端验证接口签名。

### Task 2: 字段配置后端模块

**Files:**
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkItemFieldConfigurationController.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkItemFieldConfigurationService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/WorkItemFieldConfigurationMapper.java`

- [ ] 定义字段目录、四场景默认值和查询接口。
- [ ] 实现场景整体保存、系统锁定和必填约束。
- [ ] 增加相关集成测试并运行。

### Task 3: 前端分类与字段配置

**Files:**
- Modify: `src/services/productRepository.ts`
- Modify: `src/components/system/ResearchTemplateView.tsx`
- Modify: `src/components/system/WorkItemCategoryPanel.tsx`
- Create: `src/components/system/WorkItemFieldConfigurationPanel.tsx`
- Modify: `src/components/system/WorkItemModuleView.tsx`

- [ ] 使用 Ant Design Tabs 修复分类切换选中态。
- [ ] 使用响应式 Table/Card 和 Drawer/Form 完成分类新增、编辑、删除。
- [ ] 完成分类导航、四场景字段配置与保存反馈。
- [ ] 让工作项模板读取动态分类并保持内置分类兼容。

### Task 4: PRD 与质量验证

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json`

- [ ] 在原需求编号下更新目标、流程、字段、边界和可观察验收。
- [ ] 运行 TypeScript、Vitest、前端构建、Maven 编译和相关测试。
- [ ] 运行 PRD 校验、差异检查和 1920×1080 页面预览。

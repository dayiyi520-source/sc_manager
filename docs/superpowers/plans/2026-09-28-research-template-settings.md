# 产研模板全局预设 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将产研模板扩展为五项设置，使工作项、通知与自动化在新建产品时继承，并保持产品配置独立。

**Architecture:** 工作项沿用租户模板。新增租户自动化模板及租户/产品通知配置；在现有产品创建事务中复制并映射工作项类型引用。React 页面复用产品设置视觉结构，通知共用可保存的矩阵组件，自动化编辑共用现有规则表单交互。

**Tech Stack:** React 19, TypeScript, Ant Design, Spring Boot 3.5, Java 17, JdbcTemplate, MySQL, Flyway, Vitest, JUnit.

**Spec:** `docs/superpowers/specs/2026-09-28-research-template-settings-design.md`

## Global Constraints

- 不修改已有产品配置；全局模板仅影响后续新建产品。
- 通知仅持久化，不发送站内信或钉钉消息。
- 产研字典与角色职责只展示，权限操作禁用。
- 使用现有 Design Token、React/Ant Design 与 API 层，不引入新生产依赖。
- 更新 `docs/prd/V1.0.0.md` 对应 1.1 需求和验收，运行 PRD 校验。

---

### Task 1: 通知配置持久化

**Files:**
- Create: `backend/src/main/resources/db/migration/V20260928.3__research_template_settings.sql`
- Create: `backend/src/main/java/com/shichuang/manage/product/NotificationSettingsMapper.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/NotificationSettingsService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/NotificationSettingsController.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/NotificationSettingsIntegrationTest.java`

**Interfaces:** `GET/PUT /api/notification-template`, `GET/PUT /api/product-lines/{lineId}/notification-settings`, body `{ rules: [{event, recipients, channels}] }`; service `copyToProduct(String lineId)` invoked by Task 3.

- [ ] Write integration tests for default matrix, tenant isolation, invalid events/recipients, persisted product override and copy independence.
- [ ] Run `mvn -q -Dtest=NotificationSettingsIntegrationTest test` from `backend` and observe failure.
- [ ] Add versioned tables with tenant keys and JSON configuration; use `RequestContext.tenantId()` and existing authorization checks. Validate stable event/recipient/channel enums and return default matrix when no row exists.
- [ ] Run focused test and confirm pass.

```java
@Transactional public void copyToProduct(String lineId) {
  mapper.upsertProduct(RequestContext.tenantId(), lineId,
      mapper.templateOrDefaults(RequestContext.tenantId()), RequestContext.userId());
}
```

### Task 2: 全局自动化模板

**Files:**
- Modify: `backend/src/main/resources/db/migration/V20260928.3__research_template_settings.sql`
- Create: `backend/src/main/java/com/shichuang/manage/product/AutomationTemplateMapper.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AutomationTemplateService.java`
- Create: `backend/src/main/java/com/shichuang/manage/product/AutomationTemplateController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/product/WorkItemTemplateService.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/AutomationTemplateIntegrationTest.java`

**Interfaces:** `GET/POST/PUT/DELETE /api/automation-template/rules`, `PUT /api/automation-template/setting`; overview `{ enabled, rules }`; `copyToProduct(String lineId, Map<String,String> typeIds)` invoked by Task 3. Type IDs in the map are template IDs and values are new product IDs.

- [ ] Test CRUD, optimistic revision, invalid type/state, disabled/deleted referenced type, and tenant isolation; run focused test red.
- [ ] Persist template setting/rules with tenant keys; reuse current action/condition schema. Validate referenced template workflow states; block type deletion/disable or workflow changes that break enabled template rules.
- [ ] Copy enabled/disabled setting and rules with remapped trigger/action/condition type IDs; reject missing mappings so product creation rolls back.
- [ ] Run focused test green.

```java
Map<String,Object> copied = new HashMap<>(templateRule);
copied.put("triggerTypeId", requireMapped(typeIds, templateRule.get("triggerTypeId")));
copied.put("actionConfig", remapActionConfig(templateRule.get("actionConfig"), typeIds));
```

### Task 3: 产品创建继承

**Files:**
- Modify: `backend/src/main/java/com/shichuang/manage/product/ProductLineService.java`
- Test: `backend/src/test/java/com/shichuang/manage/product/ProductLineControllerIntegrationTest.java`

**Interfaces:** Task 1 `NotificationSettingsService.copyToProduct(String)`, Task 2 `AutomationTemplateService.copyToProduct(String, Map<String,String>)`.

- [ ] Test default-on copy, off-switch skips types and automation but copies notifications, independent edits, and rollback on bad template reference.
- [ ] Change `initializeWorkItemTemplate` to return template-ID to product-ID map while retaining existing child-rule name lookup; call automation copy only when enabled, notification copy always, inside `create` transaction.
- [ ] Run focused product creation and template tests.

```java
Map<String,String> typeIds = initialize ? initializeWorkItemTemplate(id) : Map.of();
notificationSettings.copyToProduct(id);
if (initialize) automationTemplates.copyToProduct(id, typeIds);
```

### Task 4: 双栏页面及通知交互

**Files:**
- Modify: `src/context/AppContext.tsx`, `src/components/layout/GlobalSearchModal.tsx`, `src/context/Navigation.test.ts`, `src/components/system/WorkItemModuleView.tsx`
- Create: `src/components/system/ResearchTemplateView.tsx`, `src/components/system/ResearchDictionaryPanel.tsx`, `src/components/system/RoleResponsibilitiesPanel.tsx`, `src/components/product/NotificationSettingsPanel.tsx`
- Modify: `src/App.tsx`, `src/components/product/ProductLineDetailView.tsx`, `src/services/productRepository.ts`
- Test: `src/components/system/ResearchTemplateView.test.tsx`

**Interfaces:** API layer `notificationTemplate()/saveNotificationTemplate()` and `productNotificationSettings(id)/saveProductNotificationSettings(id, body)`; shared panel takes scope `template | product` and optional `productLineId`.

- [ ] Test renamed navigation, five sections, active selection, non-editable display panels, notification save/error and product-scope requests.
- [ ] Run `npm test -- ResearchTemplateView.test.tsx` red.
- [ ] Extract notification matrix with explicit save, request loading/error and dirty-state reset; render within product settings and global shell. Move work item CRUD into right workspace and match existing product settings table/tabs.
- [ ] Run test and `npm run lint`; fix relevant failures.

```tsx
<NotificationSettingsPanel scope="template" />
<NotificationSettingsPanel scope="product" productLineId={productLine.id} />
```

### Task 5: 复用自动化规则编辑体验

**Files:**
- Modify: `src/components/product/AutomationRulesPanel.tsx`, `src/services/productRepository.ts`
- Modify: `src/components/system/ResearchTemplateView.tsx`
- Test: `src/components/product/AutomationRulesPanel.test.tsx`

**Interfaces:** `scope: 'template' | 'product'`; template API reads global work item types/workflows and rules, hides logs; product API unchanged.

- [ ] Test scope-specific calls, template type/state choices, hidden logs, saving and validation errors.
- [ ] Run focused test red; adapt data loading and CRUD endpoints by scope without passing a fake product ID.
- [ ] Run focused test green, lint and build.

```tsx
<AutomationRulesPanel scope="template" />
<AutomationRulesPanel scope="product" productLine={productLine} />
```

### Task 6: PRD and acceptance

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json` only if the validator requires a matching registry update.

- [ ] Update requirement 1.1 and its numbered acceptance in place, including inheritance, independent overrides, notification not sending, display-only sections and compatibility impact.
- [ ] Run `python3 scripts/manage_prd.py --project D:/project/manager_admin validate` from plugin root.
- [ ] Run backend focused tests, frontend test/typecheck/build, inspect diff and verify HTTP endpoints and page using managed local services.

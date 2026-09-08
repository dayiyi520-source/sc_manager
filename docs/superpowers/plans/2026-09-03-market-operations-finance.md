# 市场运营款项与发票关联实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 CRM 合同、付款阶段、应收回款和发票页面上实现可追踪的款项闭环，并支持超开票本地审批记录。

**Architecture:** 以合同付款阶段作为应收业务主节点，发票和回款记录通过付款阶段关联到客户、商机、合同及项目。第一阶段审批只保存本地记录并由授权人员维护结果，不调用企业微信；后续接入企业微信时复用审批记录标识和状态。

**Tech Stack:** React 19、TypeScript、Vite、Bun、Spring Boot 3.5、Java 17、JdbcTemplate、MySQL/Flyway。

**Spec:** 已确认的市场运营流程与款项管理边界（会话确认记录）。

## Global Constraints

- 保留 React 19 + Vite + Bun，不切换 Vue。
- 所有业务变更同步更新 `docs/prd/V1.0.0.md` 和 `.enterprise-app-factory/prd/V1.0.0/registry.json`。
- 后端遵循 Controller -> Service -> Mapper -> Database，租户字段必须参与查询和写入。
- 发票作废、红冲和审批状态变化保留审计记录，不物理删除业务记录。
- 第一阶段不调用企业微信接口、不保存企业微信凭证，只保存本地审批记录。

---

### Task 1: 扩展财务领域契约

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/context/AppContext.tsx`
- Test: `frontend/src/services/financeRepository.test.ts`

**Interfaces:**
- `PaymentSchedule` 增加 `customerId`、`opportunityId`、`projectId`、`receivedAmount`、`invoicedAmount`、`overdueDays`、`invoiceStatus`。
- `InvoiceRecord` 增加 `customerId`、`opportunityId`、`projectId`、`paymentScheduleId`、`issueStatus`、`certificationStatus`、`approvalRecordId`、`voidReason`。
- 新增 `InvoiceApprovalRecord`：关联业务 ID、申请金额、可开票余额、超开金额、原因、状态、审批人、审批时间、审批意见。

- [x] Step 1: 为财务规则增加超开票审批契约测试。
- [x] Step 2: 运行前端测试确认规则覆盖销项和进项发票。
- [x] Step 3: 实现财务类型、上下文本地审批记录和发票关联交互。
- [x] Step 4: 运行财务测试、lint 和类型检查。

### Task 2: 后端付款阶段、发票与审批记录接口

**Files:**
- Create: `backend/src/main/resources/db/migration/V1.0.8__finance_invoice_associations.sql`
- Modify: `backend/src/main/java/com/shichuang/manage/crm/CrmController.java`
- Modify: `backend/src/main/java/com/shichuang/manage/crm/CrmService.java`
- Modify: `backend/src/main/java/com/shichuang/manage/crm/CrmMapper.java`
- Test: `backend/src/test/java/com/shichuang/manage/crm/CrmFinanceIntegrationTest.java`

**Interfaces:**
- `GET /api/crm/payment-schedules`：按租户分页查询付款阶段及开票/回款汇总。
- `PUT /api/crm/payment-schedules/{id}`：幂等更新回款状态和实际到账信息。
- `GET /api/crm/invoices`、`POST /api/crm/invoices`、`PUT /api/crm/invoices/{id}`：维护发票关联和状态。
- `GET /api/crm/invoice-approvals`、`POST /api/crm/invoice-approvals`、`PUT /api/crm/invoice-approvals/{id}`：维护本地超开票审批记录。
- 超开票申请必须校验付款阶段租户、可开票余额和审批状态；审批未通过禁止标记发票已开具。

- [ ] Step 1: 编写租户隔离、超开金额校验、审批通过后可开票和重复更新幂等测试。
- [ ] Step 2: 执行 Maven 指定测试，确认失败原因来自缺少迁移和接口。
- [ ] Step 3: 添加迁移字段、索引和审计列，实现 Mapper/Service/Controller。
- [ ] Step 4: 执行 Maven 测试与 package，并检查迁移校验。

### Task 3: 发票管理页面关联与本地审批交互

**Files:**
- Modify: `frontend/src/components/finance/FinanceInvoicesView.tsx`
- Modify: `frontend/src/components/finance/FinanceReceivablesView.tsx`
- Modify: `frontend/src/components/common/UIComponents.tsx`
- Test: `frontend/src/components/finance/FinanceInvoicesView.test.tsx`

**Interfaces:**
- 发票表单选择客户、商机、合同和付款阶段后展示可开票余额。
- 超出余额时提交本地审批记录，发票进入“待审批”，审批通过后才允许标记“已开具”。
- 应收列表展示已开票金额、未开票金额、已回款金额、逾期天数和发票状态。

- [x] Step 1: 编写超开票、审批状态和付款阶段回写的组件测试。
- [x] Step 2: 执行相关 Vitest 测试确认规则通过。
- [x] Step 3: 实现表单校验、审批记录列表和状态反馈，保持现有发票台账入口。
- [ ] Step 4: 运行前端测试、lint、build 和 `git diff --check`。

### Task 4: PRD、回归与提交

**Files:**
- Modify: `docs/prd/V1.0.0.md`
- Modify: `.enterprise-app-factory/prd/V1.0.0/registry.json`

- [ ] Step 1: 更新财务管理需求的流程、状态、异常、关联影响和验收标准。
- [ ] Step 2: 运行 PRD validate、前端检查和后端检查。
- [ ] Step 3: 确认工作区无敏感文件、构建产物或无关改动。
- [ ] Step 4: 创建独立 checkpoint 提交并记录提交号。

## Deferred Follow-up Plans

- 线索实体、拜访计划/手动打卡和统一历程。
- 商机漏斗、多产品/区域/伙伴统计。
- 招投标、合同、项目与回款的端到端详情关联。
- 企业微信审批接口、回调和自动状态同步。

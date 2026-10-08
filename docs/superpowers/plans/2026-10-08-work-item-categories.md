# Work Item Categories Implementation Plan

**Goal:** 运维任务进入产研菜单；字典分类即时进入字段及产品配置，并支持名称区分、提示和可视图标选择。

**Architecture:** 复用既有运维任务页面及分类接口。分类编码保持稳定，内置分类保持历史中文存储值，自定义分类使用编码；共享查询失效刷新分类。

**Tech Stack:** React、TypeScript、Ant Design、TanStack Query。

**Spec:** docs/prd/V1.0.0.md，1.1.55。

## Tasks
- [x] 导航：在缺陷管理下添加现有 proj_ops_tasks，保留详情链接。
- [x] 字典：保存分类后更新共享查询；字段页列出全部启用分类，失败禁止保存旧分类字段。
- [x] 产品：动态分类标签与下拉框使用同一字典，创建及编辑流程以分类编码请求，不覆盖既有产品类型。
- [x] 分类表单：分别显示分类名称、界面显示名称，图标提供中文名称及预览，必填空白校验，保存失败保留输入。
- [x] 验证：新增5项测试、typecheck、build通过。补跑产品既有测试有5项失败；PRD校验报告既有技术内容及登记数量不一致。保留未关联修改，不部署或提交。

## Boundaries and contracts
沿用 WorkItemCategoryDefinition 的 code/name/displayName/iconKey/capabilityType/sort/enabled 和既有类型创建接口。分类停用不删除历史类型；读取失败给出重试且禁止新增；重复编码或空白名称禁止保存；请求失败保留编辑内容。分类自动出现在产品配置，子类型仍需独立建立及发布，不自动覆盖产品定制。图标选择沿用现有图标库与主题，Normal/Hover/Loading/Disabled/Error 使用 Ant Design 状态。

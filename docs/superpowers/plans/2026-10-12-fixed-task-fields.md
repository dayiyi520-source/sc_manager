# 固定任务字段 Implementation Plan

**Goal:** 工作项分类独立管理，所有任务界面不再读取旧工作项字段配置。
**Architecture:** 使用按分类、场景、设计类型定义的固定字段契约；保留现有任务服务及列表列。拆分设计来源与产品状态，沿用已有持久化字段。
**Tech Stack:** React、TypeScript、Ant Design、Vitest。
**Spec:** 用户本次字段需求与 docs/prd/V1.0.0.md。

## Global Constraints
- 保留并发工作区改动、现有列表列和业务任务流程。
- 不新增依赖；使用现有主题与控件；仅固定展示字段，不修改已有状态流程。
- 边界：旧配置隐藏必填字段、来源切换后残留值、缺少必填版本或日期、保存失败。
- 契约：复用 productLineId、versionId、projectId、designSourceDepartment、designVariant 与现有任务字段。

## Tasks
- [ ] 新增固定字段契约与测试，替换任务字段读取。
- [ ] 按规定更新创建和详情、设计来源保存及回显，保留列表。
- [ ] 去掉字典字段配置入口，补齐业务分类，解释模板适用边界。
- [ ] 更新编号 PRD，运行相关测试、类型检查和构建。

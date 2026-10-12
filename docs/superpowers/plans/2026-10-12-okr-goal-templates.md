# 月度目标模板 Implementation Plan

**Goal:** 按已确认的四张参考图交付我的目标空状态、模板中心、模板编辑和分类选择。

**Architecture:** 保留 React / Ant Design 与现有主题。空状态回调指定月份；模板组件经独立 Repository 调用 API 层。本仓库无后端，提供现有 Mock 模式下可持久化、带版本冲突检查的完整契约；远端模式不回退到 Mock。

**Data contract:** GoalTemplate 包含 id、categoryId、description、title、keyResults、source、creatorId、usageCount、version。关键结果包含 id、title、confidence、weight、currentValue、targetValue。分类包含 id、name。加载、保存、删除、使用、新增分类均通过 API 层。

- [x] 保留原空状态图标、文案和布局，仅下方增加三个按钮，绑定当前月份，保留非本人范围只读。
- [x] 实现模板 Repository、验证规则和本地持久化处理：分类去重、引用次数、版本检查、保存失败保留输入。
- [x] 实现全屏模板中心与编辑器：两列卡片、Tab、分类筛选、搜索新增分类、动态 KR、权重与量化输入、确认删除。
- [x] 接入现有 ObjectiveForm 与复制弹窗，使用模板生成新 KR 标识并保留其他未保存目标。
- [x] 更新 PRD 1.1.33 同一需求，验证 PRD、相关测试、类型检查与构建。
- [x] 复用本地 frontend 服务，以 1920×1080 验证新建、筛选、编辑、使用及空状态。

**Boundaries:** 网络失败不关闭编辑器；重复提交禁用；重名分类拒绝；文本长度与权重总和验证；删除需二次确认；远端服务未实现时明确报错。

**Verification results:** 5 个相关测试文件、26 个用例通过，Vite 构建通过。浏览器实测文案与按钮间距 24px；新增分类、模板保存、编辑回填、推荐模板空状态、引用计数及 11 月目标归属验证通过。全项目类型检查仍有原先 2 处错误；PRD 校验仍报告既有“字段类型”误判与需求数量/注册表不一致，未在本次范围扩大修复。因全局检查未通过，不创建本地 checkpoint。

# 统一工作项分批本地验收

## 第七批自动完成与可发布判断

2026-09-14 自测：12 个测试类共 93 项通过，最后调整后复测 25 项通过，Maven package 成功。最新本地后端健康 UP，前端代理认证读取成功，API 文档确认 autoComplete 与 readinessReasons，前端登录页 HTTP 200。PRD 1.1.31 已更新；自动校验仍因缺失注册文件未通过，未迁移原文档。未进行大数据量依赖图压力测试。

需求流程边新增 `autoComplete: true`，目标必须为成功完成状态，仅需求分类可用。同一出发状态仅允许一条自动完成边；不能同时下发主任务、配置人工角色或要求现场填写 reason，可要求已保存的负责人、验收目标等字段。旧定义缺省 false，已发布版本不修改。

完成条件：已存在评审下发成功活动，design/dev/test 主任务齐备，全部关联非缺陷交付任务成功结束，无有效阻塞。任务状态变化、依赖解除会在同一事务触发重新计算；仅沿当前节点的自动边结束，产品验收等前置节点不会被跳过。手动完成已配置交付规则的需求也必须满足同样条件。完成写入 REQUIREMENT_AUTO_COMPLETED，影响其他需求的前置依赖时继续计算直到稳定。已终态需求与已发布版本不自动变更。

需求汇总 completionEligible 返回交付资格，未满足条件在 reasons 对应的 limitations 列表说明；历史记录保持 null。版本汇总 readyToRelease 在数据均为核心工作项且需求配置交付规则时返回布尔值，新增 readinessReasons 列出未完成原因；空版本 false，含历史数据或未配置规则时 null。可发布资格为实时计算，不替换原版本状态，也不执行发布。

本批没有数据库迁移或页面改动。自动化验收覆盖最后任务完成、必需子任务、产品验收状态、缺陷与外部依赖、解除关联、重复完成活动、真实事务回滚、只读版本与空版本。

## 第六批线上问题与回归任务验收

2026-09-14 自测：11 个相关测试类共 83 项通过，Maven package 成功。本地后端已替换，健康 UP；前端登录页 HTTP 200，经过前端代理登录与读取产品线成功，两项新增接口均出现在运行中的 OpenAPI。PRD 校验仍因缺失注册文件未通过，未擅自迁移文档。

新增 `POST /api/work-items/online-issues`，请求采用 CreateItem 字段，仅允许 category=bug 且无 parentWorkItemId。详情新增 sourceType，线上缺陷为 ONLINE_ISSUE。允许关联已完成历史需求，保存不改变其状态、revision 或完成时间；版本只能选择可编辑版本或留空。

`POST /api/work-items/{bugId}/regression-tests?productLineId=...` 接收：

```json
{
  "requestId": "每次转入的唯一请求标识",
  "revision": 0,
  "taskTypeId": "本产品线启用的测试类型ID",
  "title": "回归测试标题",
  "versionId": null,
  "assigneeId": null,
  "plannedEndDate": null
}
```

成功创建 DEFECT_REGRESSION 来源的测试主任务，继承缺陷 requirementId、priority、description 和 expectedGoal；本次版本由请求显式指定，不默认复制已发布历史版本。原缺陷必须未结束且版本可编辑。REQUIRES_REGRESSION 从缺陷指向测试，计算测试到缺陷的 FINISH 依赖；回归通过才解除缺陷关闭门槛，不自动关闭缺陷。该关联不能通过通用 DELETE 删除；取消测试不视为通过，需通过其流程恢复处理。

同请求、同来源、同内容及同操作人的重试返回原任务，即使状态或 revision 后续已改变；不同内容、来源或操作人拒绝。缺陷已有未通过的回归任务时拒绝新建另一轮；上一轮成功后可新建下一轮。线上登记同样校验来源幂等，不能把手工创建的已有任务借重试改为线上来源。

测试覆盖并发重试、真实事务回滚、历史需求不变、回归完成门槛、来源记录、只读版本、权限、类型停用和 HTTP 认证接口。本批未新增表或迁移，继续使用本地 20260914.2 迁移基线；所有新增集成测试使用独立租户并清理测试数据。前端及外部工单接入不在本批范围。

## 第五批关系与阻塞验收

新增本地迁移 `V20260914.2__work_item_relations.sql`，只增加关系表，不搬迁或删除旧数据。兼容目录已纳入此迁移，本地 Flyway 当前版本为 20260914.2。测试覆盖 10 个类共 73 项全部通过，Maven package 成功；关系新增 12 项集成测试和 3 项图计算测试。循环关系失败使用真实提交事务验证无残留，测试专属数据已清理。

- `GET /api/work-items/{id}/relations?productLineId=...` 返回正反向关系、blocked 和 blockers；每个 blocker 含来源工作项、限制范围和原因。
- `POST` 同一路径，参数 `{ "targetId": "目标ID", "type": "BLOCKS", "scope": "START" }` 表示当前工作项是前置项，目标项等待其成功完成。scope 可用 START 或 FINISH。重复相同关联不新增活动。
- 普通关联使用 RELATES_TO，交换两端仍为同一关系，不产生阻塞。
- 测试发现缺陷使用 FOUND_DEFECT，必须从 test 指向 bug。测试未结束时建立的关系中，未关闭 P0/P1 缺陷阻止测试完成，阻塞沿交付关系传递到需求；P2/P3 不默认阻塞。已结束测试后补充的关系不阻塞，不自动重开。
- `DELETE /api/work-items/{id}/relations/{relationId}?productLineId=...&revision=0` 软删除并记录活动。过期关系版本拒绝；重复删除不重复活动。
- 关系改变或前置项状态流转会事务内重算阻塞、更新受影响项 revision 并记录活动。业务状态保持原值；全部阻塞解除时记 WORK_ITEM_UNBLOCKED。前置项取消不等于成功完成。

同一产品线内允许跨需求和跨版本；跨租户、跨产品线、自关联、循环依赖、已发布版本关系写入拒绝。循环检测包括从子任务到父任务及从交付任务到需求的隐含完成依赖。

边界：本批为核心工作项服务端能力，前端、历史业务表、版本与需求汇总尚未接入有效阻塞；线上问题转入、回归任务、需求自动完成、版本可发布判断继续后续实现。关系算法当前按产品线加载图，尚未进行大规模压力测试。

## 已交付范围

本批可进行接口与数据持久化验收。统一核心表真实承载需求、设计、研发、测试和缺陷；测试类型、分类流程草稿/发布、父子类型组合和创建活动可保存。已有页面仍使用旧创建流程，不会自动产生统一核心记录。

前端入口：http://127.0.0.1:3010 。后端：http://127.0.0.1:8080 。登录沿用本地开发账号，新接口要求会话认证，写入角色为管理员、产品经理和技术负责人，同时校验产品线可见范围。

## 接口验收顺序

1. 在产品线下使用现有 `POST /api/product-lines/{lineId}/work-item-types` 创建类型：`category` 使用中文分类（新增支持“测试”），`name` 如“测试执行”，`enabled` 为 true。
2. `POST /api/product-lines/{lineId}/workflows` 保存草稿，内容示例：

```json
{
  "category": "test",
  "name": "测试流程",
  "definition": {
    "states": [
      {"key":"open","name":"待测试","group":"NOT_STARTED","initial":true,"successful":false,"enabled":true,"stage":"test"},
      {"key":"done","name":"测试通过","group":"COMPLETED","initial":false,"successful":true,"enabled":true,"stage":"test"}
    ],
    "transitions": [{"key":"finish","from":"open","to":"done","name":"完成测试"}]
  }
}
```

3. 用返回的流程 ID 调用 `POST /api/product-lines/{lineId}/workflows/{id}/publish`，提交 `{"revision":0}`。重复发布返回已发布版本；已发布流程的 PUT 修改应返回冲突。
4. `POST /api/work-items` 提交下面内容，将占位值替换为真实 ID，每次新任务使用不同请求标识：

```json
{
  "requestId": "acceptance-test-001",
  "productLineId": "产品线ID",
  "category": "test",
  "taskTypeId": "测试类型ID",
  "title": "测试存储验收",
  "priority": "P1"
}
```

5. `GET /api/work-items/{id}?productLineId={lineId}` 刷新仍返回任务；`GET /api/work-items?productLineId={lineId}&category=test` 包含该任务；`GET /api/work-items/{id}/activities?productLineId={lineId}` 包含创建记录。相同请求重试必须返回同一个 ID，不能新增活动；同一标识改标题应返回冲突。
6. 用 `PUT /api/product-lines/{lineId}/child-type-rules` 保存 `{"parentTypeId":"父类型ID","childTypeId":"子类型ID","enabled":true}`，创建任务时填写 parentWorkItemId 验证子任务继承。未允许的组合不得创建。
7. 已用类型删除/换分类须失败，停用后新建任务须失败；已有任务仍可读取。创建新流程版本并发布后，新任务用新版本，旧任务保持旧版本。

这些手工操作会保存真实验收数据。自动化测试使用独立测试租户；存储和流转测试在事务结束回滚，评审测试为了验证真实提交及回滚，在测试后删除其专属租户的测试数据。

## 自动化验证

```powershell
& ./.tools/apache-maven-3.9.11/bin/mvn.cmd -f backend/pom.xml '-Dtest=WorkItemDefinitionTest,WorkItemStorageIntegrationTest,UnifiedWorkItemServiceTest,UnifiedWorkItemReadIntegrationTest,ProductVersionDatesTest,ProductLineControllerIntegrationTest' '-Dspring.flyway.locations=filesystem:D:/project/manage_admin/.enterprise-app-factory/runtime/local-migrations' test
```

本机必须使用兼容迁移目录，不直接使用当前分支默认 classpath 历史。准备命令沿用 `scripts/prepare-local-migrations.ps1`，新增迁移 V20260914.1 已加入映射。

## 备份和回退

建表前本地备份为 `.enterprise-app-factory/runtime/backups/before-work-item-storage-20260914-142244.sql`，152920 字节，SHA256 `7bd85677edde4db1dcb71ac3dc95e51711b44101be6dfcc321c4ee468f14fb77`。备份和运行包只在本地保存，不提交。

增量只增加四张表，没有删除或搬迁历史业务记录。应用回退可恢复先前的版本修复运行包，仍使用完整兼容迁移目录；保留新增表，不自动删除或执行全库恢复。OKR 服务没有重启或修改，其下次启动仍须核对共享数据库历史，不能直接套用另一个分支的迁移集。

## 第三批流转接口验收

`GET /api/work-items/{id}/transitions?productLineId={lineId}` 返回当前 revision 和当前状态对应的动作；每个动作包含 allowed、reasons 和 requiredFields。原因字段只要求执行时提交，不妨碍查看动作。

`POST /api/work-items/{id}/transitions?productLineId={lineId}` 示例：

```json
{"edgeKey":"finish","revision":0,"reason":"验收通过"}
```

必须使用工作项当前版本号和其绑定流程中的动作编码。成功返回更新后的状态、revision、actualStartAt 和 completedAt。过期版本返回409，重复提交不会重复执行或重复记录活动。未配置的直接跳转拒绝执行。

流程边新增可选 roles 和 requiredFields。roles 只能从 admin、product_manager、tech_lead 中选择；缺省沿用这三个现有写入角色。requiredFields 支持 assigneeId、description、expectedGoal、plannedEndDate 和 reason。已发布流程不可改，需要新建版本；旧工作项继续使用旧定义。

“无需设计”作为设计流程中的显式成功终态和流转配置，不靠状态中文名称绕过校验。必要子任务仍须先完成；版本已发布或父任务已结束时不得改变任务状态。该批不提供任意编辑字段或线上问题自动回退。

产品线设置页接入测试分类、流程编辑和子任务规则，统一创建/详情页接入核心接口后，可以进行第一轮页面验收。随后再验收实际状态流转、评审原子下发、依赖和缺陷闭环。当前接口中的可发布资格仍是未知，不能当作已经实现可发布判断。

## 第四批评审自动下发接口验收

需求流程中的评审通过边可增加 `approvalTasks`，明确指定本产品线三个主任务类型：

```json
{
  "key": "approve",
  "from": "review",
  "to": "active",
  "name": "评审通过",
  "approvalTasks": {
    "designTypeId": "设计主任务类型ID",
    "devTypeId": "研发主任务类型ID",
    "testTypeId": "测试主任务类型ID"
  }
}
```

目标状态必须属于 IN_PROGRESS。三个任务类型必须启用且分类匹配，发布需求流程前必须已发布下游分类流程。旧流程无此字段时维持原行为；已发布定义不可修改，须创建新版本，旧任务继续绑定旧版本。

使用现有流转接口提交评审动作，成功后通过统一工作项查询核对三个主任务。主任务以 requirementId 关联需求，继承版本、优先级，负责人待分配，不自动成为受子任务类型组合限制的子任务。需求成功活动包含三项任务 ID。重新评审不会再下发；过期 revision 返回冲突。

任何下发或后续事务失败时全部回滚，日志记录 `REQUIREMENT_TASKS_DISPATCH_FAILED`，无失败任务或失败活动条目。日志含租户、产品线、需求定位信息，不含任务描述和凭证。

2026-09-14 自测：8 个相关测试类共 58 项通过，其中评审新增 10 项，包含并发、真实认证接口、部分创建失败与外层事务回滚；Maven package 成功。运行中的后端健康为 UP，前端登录页 HTTP 200，经前端代理登录和读取产品线成功，OpenAPI 已包含 ApprovalTasks。新能力尚未接入页面，不属于完整业务闭环验收。

文档校验：已执行 PRD validate，缺少既有 PRD registry 导致未通过；保留原 PRD，未擅自迁移或初始化。服务管理器的 Windows PID 检查使用 os.kill(pid, 0)，因此本地服务采用隐藏进程启动并通过管理器按外部服务登记，避免调用该 PID 探测；以实际监听端口和 HTTP 健康核对运行状态。

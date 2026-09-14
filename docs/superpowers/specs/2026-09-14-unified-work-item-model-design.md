# 统一工作项模型设计

## 目标
在不引入模块层、不中断现有业务表和接口的前提下，建立“产品线 → 版本/迭代周期 → 工作项”的统一模型。需求评审通过后原子创建设计、研发、测试三个主任务；研发和测试主任务可继续创建类型化子任务。

## 业务边界
- 一级工作项：需求、设计、研发、测试、缺陷。
- 研发任务默认拆分前端、后端；接口联调纳入前后端任务。
- 测试用例、测试执行等是测试子任务类型，不是一级主任务。
- 设计主任务允许选择“无需设计”并完成。
- 研发验收、产品验收通过当前工作项状态操作完成，不单独创建任务。
- 一个版本对应一个迭代周期，需求只能归属一个版本；已发布版本默认只读。

## 统一工作项字段
| 字段 | 说明 | 来源/策略 |
|---|---|---|
| id | 唯一标识 | 复用现有 UUID |
| code | 统一可读编号 | 新增并保留旧业务编号 |
| type | 一级类型 | 新增标准枚举 |
| subtype | 类型子任务 | 新增，研发/测试使用 |
| title | 标题 | 现有字段统一 |
| description | 描述 | 统一普通/富文本读取 |
| expected_goal | 预期目标 | 需求和任务已有 |
| status_key | 类型状态编码 | 替代直接依赖中文状态 |
| status_name | 展示名称 | 由状态定义返回 |
| status_category | 通用状态分类 | 未开始/进行中/等待/完成/阻塞/驳回/取消 |
| stage_key | 业务阶段 | 需求/设计/研发/测试/验收/发布 |
| workflow_id | 所属流程 | 产品线+类型匹配 |
| workflow_version | 流程版本 | 固定历史语义 |
| product_line_id | 产品线 | 现有字段 |
| version_id | 版本/迭代周期 | 现有字段统一 |
| requirement_id | 顶层需求 | 现有关联字段 |
| parent_work_item_id | 父主任务 | 新增 |
| assignee_id/name | 当前负责人 | ID为准，名称展示 |
| creator_id/name | 创建人 | ID为准，名称展示 |
| planned_start_at | 计划开始 | 兼容 planned_start_date |
| planned_end_at | 计划完成 | 兼容 due_date/expected_complete_date |
| actual_start_at | 实际开始 | 新增 |
| completed_at | 实际完成 | 新增 |
| priority | 优先级 | 统一 P0-P3 语义映射 |
| estimated_hours | 预估工时 | 现有字段 |
| actual_hours | 实际工时 | 合并 spent_hours |
| blocked_reason | 阻塞原因 | 新增/计算 |
| waiting_reason | 等待原因 | 新增/计算 |
| source_type | 创建来源 | 手动/阶段自动/线上转入/缺陷转入 |
| custom_fields | 类型专属字段 | 兼容 special_fields |
| attachments | 附件媒体 | 兼容 media |
| repository_url | 仓库地址 | 研发可选 |
| branch_name | 分支 | 研发已有 branch |
| pull_request_url | PR地址 | 研发可选 |
| created_at/updated_at | 审计时间 | 现有审计字段 |

## 状态、流转和关系
状态定义按产品线+工作项类型配置，状态类别、阶段、初始/终态/阻塞属性统一。流转规则定义起止状态、操作、角色、必填字段、依赖清理要求和自动流转标记。已发布流程版本不可修改，只能新建版本；已使用状态只能停用。

关系表支持 BLOCKS、RELATES_TO、DUPLICATES、PARENT_CHILD、FOUND_DEFECT、REQUIRES_REGRESSION、CONVERTED_TO。只存正向关系，BLOCKED_BY 反向计算；禁止循环 BLOCKS。

## 自动创建与事务
需求评审通过和三个主任务创建在同一数据库事务内。任意创建失败，需求和三个任务全部回滚；失败只写服务端结构化日志，不进入任务列表。通知发送在业务事务后独立重试，失败不回滚任务。重复提交使用幂等键或唯一约束拦截。

## 聚合规则
需求完成条件：设计完成或无需设计、研发主任务及子任务完成、测试主任务及必要子任务通过、P0/P1阻塞缺陷为0、产品验收操作完成。测试中发现缺陷时测试保持测试中，需求显示阻塞标记；已完成需求后续线上缺陷不回退需求状态。版本可发布条件：版本内需求全部完成、P0/P1阻塞缺陷为0、版本验收完成。

## 兼容迁移
第一阶段新增统一查询/聚合 DTO 和字段映射，不删除旧表。第二阶段新增状态定义、流转、关系、活动记录表。第三阶段将新建流程接入统一服务，旧接口继续返回兼容字段。历史数据按业务表映射为统一工作项读取模型，待运行稳定后再评估主表化。

## 待实现接口方向
- `GET /api/work-items`：跨类型、版本、负责人、状态、阻塞、逾期查询。
- `GET /api/requirements/{id}/summary`：阶段、处理人、完成项、等待项、阻塞项。
- `GET /api/product-lines/{id}/versions/{versionId}/summary`：完成度、可发布判断、未完成原因。
- `POST /api/requirements/{id}/review-approve`：事务内创建三个主任务。
- `POST /api/work-items/{id}/transitions`：按流程规则执行流转。
- `GET/POST /api/work-items/{id}/relations`：维护依赖和关联。

## 验收边界
覆盖重复提交、事务失败、缺负责人、流程版本变更、循环依赖、跨版本依赖、P0/P1阻塞、P2/P3非阻塞、设计无需执行、测试中发现缺陷、线上问题转入和已发布版本只读。

CREATE TABLE IF NOT EXISTS t_work_item_template_type (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  category_ VARCHAR(16) NOT NULL,
  name_ VARCHAR(128) NOT NULL,
  description_ TEXT,
  enabled_ TINYINT NOT NULL DEFAULT 1,
  is_default_ TINYINT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_work_item_template_type (tenant_id_, category_, name_, delete_flag_),
  KEY idx_work_item_template_type (tenant_id_, category_, delete_flag_)
);

CREATE TABLE IF NOT EXISTS t_work_item_template_workflow (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  template_type_id_ VARCHAR(36) NOT NULL,
  category_ VARCHAR(16) NOT NULL,
  name_ VARCHAR(128) NOT NULL,
  definition_ JSON NOT NULL,
  revision_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_work_item_template_workflow (tenant_id_, template_type_id_, delete_flag_),
  KEY idx_work_item_template_workflow (tenant_id_, category_, delete_flag_)
);

INSERT INTO t_work_item_template_type (id_, tenant_id_, category_, name_, description_, enabled_, is_default_, create_by_, update_by_, create_time_, update_time_)
SELECT source.id_, source.tenant_id_, source.category_, source.name_, source.description_, source.enabled_, source.is_default_, source.create_by_, source.update_by_, source.create_time_, source.update_time_
FROM t_product_line_work_item_type source
JOIN (SELECT tenant_id_, MIN(id_) AS line_id_ FROM t_product_line WHERE delete_flag_=0 GROUP BY tenant_id_) first_line
  ON first_line.tenant_id_=source.tenant_id_ AND first_line.line_id_=source.product_line_id_
WHERE source.delete_flag_=0
  AND source.category_ IN ('需求','设计','研发','测试','缺陷','用例')
  AND source.name_ IN ('产品类型需求','技术类需求','数据类需求','其他需求','需求设计','物料设计','其他设计','开发任务','缺陷修复任务','样式优化任务','性能优化任务','其他任务','测试任务','用例编写','测试验收','安全测试','回归测试','系统缺陷','样式缺陷','线上故障','安全漏洞','功能测试','性能测试','兼容性测试','易用性测试','安全性测试','稳定性测试','接口测试','自动化测试','按照部署测试','冒烟测试','回归测试','其他')
  AND NOT EXISTS (SELECT 1 FROM t_work_item_template_type target WHERE target.tenant_id_=source.tenant_id_ AND target.id_=source.id_);

INSERT INTO t_work_item_template_workflow (id_, tenant_id_, template_type_id_, category_, name_, definition_, revision_, create_by_, update_by_, create_time_, update_time_)
SELECT UUID(), workflow.tenant_id_, workflow.task_type_id_, workflow.category_, workflow.name_, workflow.definition_, workflow.version_, workflow.create_by_, workflow.update_by_, workflow.create_time_, workflow.update_time_
FROM t_product_workflow workflow
JOIN (SELECT tenant_id_, MIN(id_) AS line_id_ FROM t_product_line WHERE delete_flag_=0 GROUP BY tenant_id_) first_line
  ON first_line.tenant_id_=workflow.tenant_id_ AND first_line.line_id_=workflow.product_line_id_
JOIN t_work_item_template_type template_type
  ON template_type.tenant_id_=workflow.tenant_id_ AND template_type.id_=workflow.task_type_id_
WHERE workflow.task_type_id_ IS NOT NULL AND workflow.delete_flag_=0 AND workflow.status_='PUBLISHED'
  AND template_type.name_ IN ('产品类型需求','技术类需求','数据类需求','其他需求','需求设计','物料设计','其他设计','开发任务','缺陷修复任务','样式优化任务','性能优化任务','其他任务','测试任务','用例编写','测试验收','安全测试','回归测试','系统缺陷','样式缺陷','线上故障','安全漏洞','功能测试','性能测试','兼容性测试','易用性测试','安全性测试','稳定性测试','接口测试','自动化测试','按照部署测试','回归测试','其他')
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_workflow newer
    WHERE newer.tenant_id_=workflow.tenant_id_
      AND newer.product_line_id_=workflow.product_line_id_
      AND newer.task_type_id_=workflow.task_type_id_
      AND newer.delete_flag_=0
      AND newer.status_='PUBLISHED'
      AND (newer.version_ > workflow.version_ OR (newer.version_=workflow.version_ AND newer.id_ > workflow.id_))
  )
  AND NOT EXISTS (SELECT 1 FROM t_work_item_template_workflow target WHERE target.tenant_id_=workflow.tenant_id_ AND target.template_type_id_=workflow.task_type_id_ AND target.delete_flag_=0);

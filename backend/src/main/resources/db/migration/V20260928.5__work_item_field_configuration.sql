ALTER TABLE t_work_item_category_dictionary
  ADD COLUMN name_ VARCHAR(64) NULL AFTER code_,
  ADD COLUMN capability_type_ VARCHAR(32) NOT NULL DEFAULT 'STANDARD' AFTER icon_key_;

UPDATE t_work_item_category_dictionary
SET name_ = CASE code_
  WHEN 'requirement' THEN '产品'
  WHEN 'design' THEN '设计'
  WHEN 'dev' THEN '研发'
  WHEN 'test' THEN '测试'
  WHEN 'bug' THEN '缺陷'
  WHEN 'case' THEN '用例'
  ELSE display_name_
END,
capability_type_ = CASE WHEN code_ = 'case' THEN 'TEST_CASE' ELSE 'STANDARD' END
WHERE name_ IS NULL;

ALTER TABLE t_work_item_category_dictionary
  MODIFY COLUMN name_ VARCHAR(64) NOT NULL;

CREATE TABLE t_work_item_field_configuration (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  category_code_ VARCHAR(32) NOT NULL,
  scene_ VARCHAR(32) NOT NULL,
  field_code_ VARCHAR(64) NOT NULL,
  visible_ TINYINT NOT NULL DEFAULT 1,
  required_ TINYINT NOT NULL DEFAULT 0,
  sort_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_work_item_field_configuration (tenant_id_, category_code_, scene_, field_code_, delete_flag_),
  KEY idx_work_item_field_configuration_scene (tenant_id_, category_code_, scene_, sort_, delete_flag_)
);

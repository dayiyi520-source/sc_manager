CREATE TABLE t_product_role_template (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  name_ VARCHAR(64) NOT NULL,
  responsibility_ VARCHAR(500) NOT NULL,
  sort_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  active_name_key_ VARCHAR(64) GENERATED ALWAYS AS (CASE WHEN delete_flag_=0 THEN name_ ELSE NULL END) STORED,
  UNIQUE KEY uk_product_role_template_name (tenant_id_, active_name_key_),
  KEY idx_product_role_template_list (tenant_id_, delete_flag_, sort_)
);

INSERT INTO t_product_role_template(
  id_, tenant_id_, name_, responsibility_, sort_, create_by_, update_by_, create_time_, update_time_
)
SELECT UUID(), tenants.tenant_id_, roles.name_, roles.responsibility_, roles.sort_, 'system', 'system', NOW(6), NOW(6)
FROM (SELECT DISTINCT tenant_id_ FROM t_sys_user WHERE delete_flag_=0) tenants
CROSS JOIN (
  SELECT '管理员' name_, '管理产品成员与设置' responsibility_, 0 sort_
  UNION ALL SELECT '参与人', '参与产品协作', 1
  UNION ALL SELECT '产品', '负责产品需求与规划', 2
  UNION ALL SELECT '设计', '负责设计任务', 3
  UNION ALL SELECT '研发', '负责研发任务', 4
  UNION ALL SELECT '测试', '负责测试任务', 5
  UNION ALL SELECT '交付主管', '负责交付协作', 6
) roles;

-- Keep one deterministic ordinary product manager for the three-level local OKR acceptance path.
INSERT INTO t_sys_user
  (id_, tenant_id_, username_, name_, avatar_, department_, role_, role_title_, status_,
   create_by_, update_by_, create_time_, update_time_, delete_flag_, version_)
VALUES
  ('user-product-member', 'local-tenant', NULL, '毛景强', '', '产品规划部', 'employee', '产品经理', 'enabled',
   'system', 'system', NOW(6), NOW(6), 0, 0)
ON DUPLICATE KEY UPDATE
  name_ = VALUES(name_), department_ = VALUES(department_), role_ = VALUES(role_),
  role_title_ = VALUES(role_title_), status_ = 'enabled', delete_flag_ = 0,
  update_by_ = 'system', update_time_ = NOW(6);

INSERT INTO t_okr_reporting
  (id_, tenant_id_, employee_id_, supervisor_id_, root_flag_, create_by_, update_by_, create_time_, update_time_, delete_flag_)
VALUES
  ('reporting-product-member', 'local-tenant', 'user-product-member', 'user-product', 0,
   'system', 'system', NOW(6), NOW(6), 0)
ON DUPLICATE KEY UPDATE
  supervisor_id_ = 'user-product', root_flag_ = 0, delete_flag_ = 0,
  update_by_ = 'system', update_time_ = NOW(6);

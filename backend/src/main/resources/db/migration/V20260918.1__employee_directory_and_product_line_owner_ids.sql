ALTER TABLE t_sys_user
  MODIFY COLUMN username_ VARCHAR(64) NULL,
  ADD COLUMN phone_ VARCHAR(32) NULL AFTER role_title_,
  ADD COLUMN email_ VARCHAR(255) NULL AFTER phone_;

UPDATE t_sys_user
SET department_ = CASE id_
  WHEN 'user-admin' THEN '软件研发部'
  WHEN 'user-sales' THEN '市场运营部'
  WHEN 'user-product' THEN '产品规划部'
  WHEN 'user-tech' THEN '软件研发部'
  ELSE department_
END,
username_ = CASE WHEN id_ = 'user-admin' THEN username_ ELSE NULL END,
password_hash_ = CASE WHEN id_ = 'user-admin' THEN password_hash_ ELSE NULL END,
update_time_ = NOW()
WHERE tenant_id_ = 'local-tenant' AND delete_flag_ = 0;

DELETE FROM t_sys_user_role
WHERE tenant_id_ = 'local-tenant' AND user_id_ <> 'user-admin';

UPDATE t_sys_session
SET revoked_at_ = COALESCE(revoked_at_, NOW())
WHERE tenant_id_ = 'local-tenant' AND user_id_ <> 'user-admin';

ALTER TABLE t_product_line
  ADD COLUMN owner_user_id_ VARCHAR(36) NULL AFTER owner_name_,
  ADD COLUMN requirement_owner_user_id_ VARCHAR(36) NULL AFTER requirement_owner_,
  ADD COLUMN tech_owner_user_id_ VARCHAR(36) NULL AFTER tech_owner_,
  ADD COLUMN test_owner_user_id_ VARCHAR(36) NULL AFTER test_owner_,
  ADD INDEX idx_product_line_owner_user (tenant_id_, owner_user_id_, delete_flag_),
  ADD INDEX idx_product_line_key_owners (tenant_id_, requirement_owner_user_id_, tech_owner_user_id_, test_owner_user_id_, delete_flag_);

UPDATE t_product_line product_line
JOIN t_sys_user employee
  ON employee.tenant_id_ = product_line.tenant_id_
  AND employee.name_ = product_line.owner_name_
  AND employee.status_ = 'enabled'
  AND employee.delete_flag_ = 0
JOIN (
  SELECT tenant_id_, name_, MIN(id_) AS user_id_
  FROM t_sys_user
  WHERE status_ = 'enabled' AND delete_flag_ = 0
  GROUP BY tenant_id_, name_
  HAVING COUNT(*) = 1
) unique_employee
  ON unique_employee.tenant_id_ = employee.tenant_id_
  AND unique_employee.name_ = employee.name_
  AND unique_employee.user_id_ = employee.id_
SET product_line.owner_user_id_ = employee.id_;

UPDATE t_product_line product_line
JOIN t_sys_user employee
  ON employee.tenant_id_ = product_line.tenant_id_
  AND employee.name_ = product_line.requirement_owner_
  AND employee.status_ = 'enabled'
  AND employee.delete_flag_ = 0
JOIN (
  SELECT tenant_id_, name_, MIN(id_) AS user_id_
  FROM t_sys_user
  WHERE status_ = 'enabled' AND delete_flag_ = 0
  GROUP BY tenant_id_, name_
  HAVING COUNT(*) = 1
) unique_employee
  ON unique_employee.tenant_id_ = employee.tenant_id_
  AND unique_employee.name_ = employee.name_
  AND unique_employee.user_id_ = employee.id_
SET product_line.requirement_owner_user_id_ = employee.id_;

UPDATE t_product_line product_line
JOIN t_sys_user employee
  ON employee.tenant_id_ = product_line.tenant_id_
  AND employee.name_ = product_line.tech_owner_
  AND employee.status_ = 'enabled'
  AND employee.delete_flag_ = 0
JOIN (
  SELECT tenant_id_, name_, MIN(id_) AS user_id_
  FROM t_sys_user
  WHERE status_ = 'enabled' AND delete_flag_ = 0
  GROUP BY tenant_id_, name_
  HAVING COUNT(*) = 1
) unique_employee
  ON unique_employee.tenant_id_ = employee.tenant_id_
  AND unique_employee.name_ = employee.name_
  AND unique_employee.user_id_ = employee.id_
SET product_line.tech_owner_user_id_ = employee.id_;

UPDATE t_product_line product_line
JOIN t_sys_user employee
  ON employee.tenant_id_ = product_line.tenant_id_
  AND employee.name_ = product_line.test_owner_
  AND employee.status_ = 'enabled'
  AND employee.delete_flag_ = 0
JOIN (
  SELECT tenant_id_, name_, MIN(id_) AS user_id_
  FROM t_sys_user
  WHERE status_ = 'enabled' AND delete_flag_ = 0
  GROUP BY tenant_id_, name_
  HAVING COUNT(*) = 1
) unique_employee
  ON unique_employee.tenant_id_ = employee.tenant_id_
  AND unique_employee.name_ = employee.name_
  AND unique_employee.user_id_ = employee.id_
SET product_line.test_owner_user_id_ = employee.id_;

ALTER TABLE t_sys_user
  ADD COLUMN password_hash_ VARCHAR(512) NULL,
  ADD COLUMN failed_login_count_ INT NOT NULL DEFAULT 0,
  ADD COLUMN locked_until_ DATETIME NULL,
  ADD COLUMN password_changed_at_ DATETIME NULL;

CREATE TABLE IF NOT EXISTS t_sys_session (
  id_ VARCHAR(64) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  user_id_ VARCHAR(36) NOT NULL,
  expires_at_ DATETIME NOT NULL,
  revoked_at_ DATETIME NULL,
  create_time_ DATETIME NOT NULL,
  INDEX idx_sys_session_user (tenant_id_, user_id_, expires_at_),
  INDEX idx_sys_session_expiry (expires_at_)
);

DELETE b FROM t_product_bug b
LEFT JOIN t_product_requirement r ON r.id_=b.requirement_id_ AND r.tenant_id_=b.tenant_id_ AND r.delete_flag_=0
WHERE r.id_ IS NULL;

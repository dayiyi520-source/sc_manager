CREATE TABLE t_okr_record (
 id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL,
 kind_ VARCHAR(20) NOT NULL, owner_id_ VARCHAR(36) NOT NULL,
 period_key_ VARCHAR(40) NOT NULL, status_ VARCHAR(24) NOT NULL,
 payload_ JSON NOT NULL, version_ INT NOT NULL DEFAULT 0,
 create_by_ VARCHAR(36) NOT NULL, update_by_ VARCHAR(36) NOT NULL,
 create_time_ DATETIME(6) NOT NULL, update_time_ DATETIME(6) NOT NULL,
 delete_flag_ TINYINT NOT NULL DEFAULT 0,
 KEY idx_okr_owner_period (tenant_id_, owner_id_, kind_, period_key_),
 KEY idx_okr_status (tenant_id_, kind_, status_)
);
CREATE TABLE t_okr_reporting (
 id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL,
 employee_id_ VARCHAR(36) NOT NULL, supervisor_id_ VARCHAR(36),
 root_flag_ TINYINT NOT NULL DEFAULT 0, version_ INT NOT NULL DEFAULT 0,
 create_by_ VARCHAR(36) NOT NULL, update_by_ VARCHAR(36) NOT NULL,
 create_time_ DATETIME(6) NOT NULL, update_time_ DATETIME(6) NOT NULL,
 delete_flag_ TINYINT NOT NULL DEFAULT 0,
 UNIQUE KEY uk_okr_reporting (tenant_id_,employee_id_),
 KEY idx_okr_supervisor (tenant_id_,supervisor_id_)
);
CREATE TABLE t_okr_event (
 id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL,
 record_id_ VARCHAR(36) NOT NULL, action_ VARCHAR(32) NOT NULL,
 operator_id_ VARCHAR(36) NOT NULL, detail_ JSON NOT NULL,
 create_time_ DATETIME(6) NOT NULL,
 KEY idx_okr_event (tenant_id_,record_id_,create_time_)
);

CREATE TABLE t_okr_setting (
 id_ VARCHAR(36) PRIMARY KEY,
 tenant_id_ VARCHAR(36) NOT NULL,
 version_ INT NOT NULL DEFAULT 1,
 payload_ JSON NOT NULL,
 create_by_ VARCHAR(36) NOT NULL,
 update_by_ VARCHAR(36) NOT NULL,
 create_time_ DATETIME(6) NOT NULL,
 update_time_ DATETIME(6) NOT NULL,
 delete_flag_ TINYINT NOT NULL DEFAULT 0,
 UNIQUE KEY uk_okr_setting_tenant (tenant_id_)
);

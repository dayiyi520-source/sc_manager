CREATE TABLE t_okr_work_link (
 id_ VARCHAR(36) PRIMARY KEY, tenant_id_ VARCHAR(36) NOT NULL,
 owner_id_ VARCHAR(36) NOT NULL, work_id_ VARCHAR(128) NOT NULL,
 objective_id_ VARCHAR(36), key_result_id_ VARCHAR(36),
 version_ INT NOT NULL DEFAULT 0,
 create_by_ VARCHAR(36) NOT NULL, update_by_ VARCHAR(36) NOT NULL,
 create_time_ DATETIME(6) NOT NULL, update_time_ DATETIME(6) NOT NULL,
 delete_flag_ TINYINT NOT NULL DEFAULT 0,
 UNIQUE KEY uk_okr_work (tenant_id_,owner_id_,work_id_),
 KEY idx_okr_work_objective (tenant_id_,objective_id_)
);

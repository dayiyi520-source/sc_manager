CREATE TABLE IF NOT EXISTS t_crm_lead (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  name_ VARCHAR(255) NOT NULL,
  customer_id_ VARCHAR(36) NOT NULL,
  school_contact_ VARCHAR(128) NOT NULL,
  contact_phone_ VARCHAR(64),
  department_ VARCHAR(128) NOT NULL,
  owner_name_ VARCHAR(128) NOT NULL,
  source_ VARCHAR(64) NOT NULL,
  products_ JSON NOT NULL,
  status_ VARCHAR(32) NOT NULL DEFAULT '跟进中',
  converted_opportunity_id_ VARCHAR(36),
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  update_time_ DATETIME NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_lead_tenant_name_customer (tenant_id_, name_, customer_id_),
  KEY idx_lead_tenant_customer (tenant_id_, customer_id_),
  KEY idx_lead_tenant_status (tenant_id_, status_)
);

SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_crm_customer' AND column_name='status_')=0,
  'ALTER TABLE t_crm_customer ADD COLUMN status_ VARCHAR(32) NOT NULL DEFAULT ''无效''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_crm_customer' AND index_name='idx_customer_tenant_status')=0,
  'CREATE INDEX idx_customer_tenant_status ON t_crm_customer (tenant_id_, status_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_crm_customer' AND column_name='school_level_')=0,
  'ALTER TABLE t_crm_customer ADD COLUMN school_level_ VARCHAR(64) NULL, ADD COLUMN school_nature_ VARCHAR(64) NULL, ADD COLUMN school_type_ VARCHAR(64) NULL, ADD COLUMN ownership_ VARCHAR(32) NULL, ADD COLUMN region_ VARCHAR(128) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_crm_opportunity' AND column_name='lead_id_')=0,
  'ALTER TABLE t_crm_opportunity ADD COLUMN lead_id_ VARCHAR(36) NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_crm_opportunity' AND index_name='idx_opportunity_tenant_lead')=0,
  'CREATE INDEX idx_opportunity_tenant_lead ON t_crm_opportunity (tenant_id_, lead_id_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

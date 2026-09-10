-- Persist downstream synchronization state so failures remain observable and retryable.
SET @schema_name = DATABASE();
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@schema_name AND table_name='t_requirement_work_item' AND column_name='sync_status_')=0,
  'ALTER TABLE t_requirement_work_item ADD COLUMN sync_status_ VARCHAR(16) NOT NULL DEFAULT ''PENDING'', ADD COLUMN retry_count_ INT NOT NULL DEFAULT 0, ADD COLUMN last_error_ VARCHAR(1000) NULL, ADD COLUMN next_retry_time_ DATETIME NULL, ADD COLUMN last_sync_time_ DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=@schema_name AND table_name='t_requirement_work_item' AND index_name='idx_work_item_sync_retry')=0,
  'CREATE INDEX idx_work_item_sync_retry ON t_requirement_work_item (tenant_id_, sync_status_, next_retry_time_, retry_count_)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

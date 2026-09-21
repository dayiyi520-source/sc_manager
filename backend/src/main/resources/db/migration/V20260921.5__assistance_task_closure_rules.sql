ALTER TABLE t_product_work_item
  ADD COLUMN assistance_blocks_closure_ TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN assistance_task_status_ VARCHAR(32) NOT NULL DEFAULT 'PROCESSING';

CREATE INDEX idx_assistance_task_state
  ON t_product_work_item (tenant_id_, requirement_id_, source_type_, assistance_blocks_closure_, assistance_task_status_, delete_flag_);

ALTER TABLE t_product_line
  ADD COLUMN archived_at_ DATETIME(6) NULL AFTER current_version_,
  ADD COLUMN archived_by_ VARCHAR(36) NULL AFTER archived_at_,
  ADD COLUMN archived_by_name_ VARCHAR(128) NULL AFTER archived_by_,
  ADD INDEX idx_product_line_archive (tenant_id_, archived_at_, delete_flag_);

UPDATE t_product_line product_line
LEFT JOIN t_sys_user operator
  ON operator.tenant_id_ = product_line.tenant_id_
  AND operator.id_ = product_line.update_by_
  AND operator.delete_flag_ = 0
SET product_line.archived_at_ = product_line.update_time_,
    product_line.archived_by_ = product_line.update_by_,
    product_line.archived_by_name_ = COALESCE(operator.name_, product_line.update_by_)
WHERE product_line.status_ = '已归档'
  AND product_line.delete_flag_ = 0
  AND product_line.archived_at_ IS NULL;

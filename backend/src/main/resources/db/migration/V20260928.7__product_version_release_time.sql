ALTER TABLE t_product_line_version
  ADD COLUMN release_time_ DATETIME(6) NULL AFTER end_date_;

UPDATE t_product_line_version
SET release_time_ = COALESCE(update_time_, CAST(end_date_ AS DATETIME), create_time_)
WHERE status_ = '已发布'
  AND release_time_ IS NULL;

ALTER TABLE t_product_line_version
  ADD INDEX idx_product_version_release_time (tenant_id_, product_line_id_, status_, release_time_);

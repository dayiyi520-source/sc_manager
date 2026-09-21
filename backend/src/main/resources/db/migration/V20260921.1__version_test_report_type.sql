ALTER TABLE t_product_version_test_report
  ADD COLUMN report_type_ VARCHAR(20) NOT NULL DEFAULT '功能测试' AFTER name_;

CREATE INDEX idx_version_test_report_type
  ON t_product_version_test_report (tenant_id_, report_type_, delete_flag_, create_time_);

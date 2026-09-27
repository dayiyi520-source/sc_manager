ALTER TABLE t_product_line
  ADD COLUMN sort_ INT NOT NULL DEFAULT 0 AFTER visibility_;

CREATE INDEX idx_product_line_tenant_sort
  ON t_product_line (tenant_id_, sort_, create_time_);

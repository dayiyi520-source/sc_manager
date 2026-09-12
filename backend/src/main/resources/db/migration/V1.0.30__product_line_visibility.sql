ALTER TABLE t_product_line
  ADD COLUMN visibility_ VARCHAR(32) NOT NULL DEFAULT '公开' AFTER description_;

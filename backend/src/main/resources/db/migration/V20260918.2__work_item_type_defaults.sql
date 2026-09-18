ALTER TABLE t_product_line_work_item_type
  ADD COLUMN is_default_ TINYINT NOT NULL DEFAULT 0 AFTER enabled_,
  ADD COLUMN active_default_key_ VARCHAR(128)
    GENERATED ALWAYS AS (
      CASE
        WHEN delete_flag_ = 0 AND enabled_ = 1 AND is_default_ = 1
          THEN CONCAT(tenant_id_, ':', product_line_id_, ':', category_)
        ELSE NULL
      END
    ) STORED,
  ADD UNIQUE KEY uk_work_item_type_active_default (active_default_key_);

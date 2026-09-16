ALTER TABLE t_product_work_item
    ADD COLUMN status_color_ VARCHAR(24) NOT NULL DEFAULT 'neutral' AFTER status_group_;

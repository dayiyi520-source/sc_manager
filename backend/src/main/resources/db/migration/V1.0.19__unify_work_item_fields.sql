-- 四类工作项统一基础字段；专属字段保留，后续可按业务继续演进。
ALTER TABLE t_product_bug
  ADD COLUMN expected_goal_ VARCHAR(512) NULL,
  ADD COLUMN priority_ VARCHAR(32) NULL,
  ADD COLUMN owner_name_ VARCHAR(128) NULL,
  ADD COLUMN creator_name_ VARCHAR(128) NULL,
  ADD COLUMN department_ VARCHAR(128) NULL,
  ADD COLUMN version_id_ VARCHAR(36) NULL,
  ADD COLUMN customer_id_ VARCHAR(36) NULL,
  ADD COLUMN customer_name_ VARCHAR(255) NULL,
  ADD COLUMN estimated_hours_ DECIMAL(10,2) NULL DEFAULT 0,
  ADD COLUMN actual_hours_ DECIMAL(10,2) NULL DEFAULT 0,
  ADD COLUMN due_date_ DATE NULL,
  ADD COLUMN description_html_ LONGTEXT NULL,
  ADD COLUMN media_ JSON NULL,
  ADD COLUMN source_work_order_titles_ JSON NULL;

ALTER TABLE t_product_dev_task
  ADD COLUMN expected_goal_ VARCHAR(512) NULL,
  ADD COLUMN priority_ VARCHAR(32) NULL,
  ADD COLUMN owner_name_ VARCHAR(128) NULL,
  ADD COLUMN creator_name_ VARCHAR(128) NULL,
  ADD COLUMN department_ VARCHAR(128) NULL,
  ADD COLUMN version_id_ VARCHAR(36) NULL,
  ADD COLUMN customer_id_ VARCHAR(36) NULL,
  ADD COLUMN customer_name_ VARCHAR(255) NULL,
  ADD COLUMN actual_hours_ DECIMAL(10,2) NULL DEFAULT 0,
  ADD COLUMN due_date_ DATE NULL,
  ADD COLUMN description_html_ LONGTEXT NULL,
  ADD COLUMN media_ JSON NULL,
  ADD COLUMN source_work_order_titles_ JSON NULL,
  ADD COLUMN version_ INT NOT NULL DEFAULT 0;

UPDATE t_product_bug SET owner_name_=COALESCE(owner_name_, assignee_name_), priority_=COALESCE(priority_, '中'), creator_name_=COALESCE(creator_name_, create_by_);
UPDATE t_product_dev_task SET owner_name_=COALESCE(owner_name_, developer_name_), priority_=COALESCE(priority_, '中'), creator_name_=COALESCE(creator_name_, create_by_), actual_hours_=COALESCE(actual_hours_, 0);

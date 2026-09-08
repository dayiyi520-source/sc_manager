-- 缺陷任务表补齐统一任务界面所需字段，保留原有字段和数据。
ALTER TABLE t_product_bug
  ADD COLUMN code_ varchar(64) NOT NULL DEFAULT '',
  ADD COLUMN description_ text NULL,
  ADD COLUMN product_line_id_ varchar(36) NULL,
  ADD COLUMN product_line_name_ varchar(255) NULL,
  ADD COLUMN version_name_ varchar(255) NULL,
  ADD COLUMN type_ varchar(64) NULL,
  ADD COLUMN severity_ varchar(32) NULL,
  ADD COLUMN source_work_order_ids_ json NULL;

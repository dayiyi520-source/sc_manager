ALTER TABLE t_product_work_item
  ADD COLUMN description_html_ LONGTEXT NULL AFTER description_,
  ADD COLUMN creator_name_ VARCHAR(128) NULL AFTER assignee_name_,
  ADD COLUMN department_ VARCHAR(128) NULL AFTER creator_name_,
  ADD COLUMN customer_id_ VARCHAR(36) NULL AFTER department_,
  ADD COLUMN customer_name_ VARCHAR(255) NULL AFTER customer_id_,
  ADD COLUMN requirement_type_ VARCHAR(64) NULL AFTER customer_name_,
  ADD COLUMN cc_names_ JSON NULL AFTER requirement_type_,
  ADD COLUMN media_ JSON NULL AFTER cc_names_,
  ADD COLUMN source_work_order_ids_ JSON NULL AFTER media_,
  ADD COLUMN source_work_order_titles_ JSON NULL AFTER source_work_order_ids_,
  ADD COLUMN work_order_type_ VARCHAR(64) NULL AFTER source_work_order_titles_,
  ADD COLUMN special_fields_ JSON NULL AFTER work_order_type_,
  ADD KEY idx_work_item_customer (tenant_id_, customer_id_, delete_flag_, create_time_),
  ADD KEY idx_work_item_assignee (tenant_id_, assignee_name_, delete_flag_, update_time_);

UPDATE t_crm_presales_task SET requirement_id_ = NULL WHERE requirement_id_ IS NOT NULL;
UPDATE t_project_delivery_task SET requirement_id_ = NULL WHERE requirement_id_ IS NOT NULL;
UPDATE t_project_ops_task SET requirement_id_ = NULL WHERE requirement_id_ IS NOT NULL;

DROP TABLE IF EXISTS t_requirement_work_item;
DROP TABLE IF EXISTS t_product_requirement_event;
DROP TABLE IF EXISTS t_product_requirement_task;
DROP TABLE IF EXISTS t_product_design_task;
DROP TABLE IF EXISTS t_product_dev_task;
DROP TABLE IF EXISTS t_product_bug;
DROP TABLE IF EXISTS t_product_requirement;

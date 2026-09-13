CREATE TABLE IF NOT EXISTS t_product_work_item (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  code_ VARCHAR(64) NOT NULL,
  title_ VARCHAR(255) NOT NULL,
  type_ VARCHAR(32) NOT NULL,
  product_line_id_ VARCHAR(36),
  product_line_name_ VARCHAR(255),
  iteration_id_ VARCHAR(36),
  iteration_name_ VARCHAR(255),
  parent_id_ VARCHAR(36),
  owner_name_ VARCHAR(128),
  creator_name_ VARCHAR(128),
  priority_ VARCHAR(32),
  status_ VARCHAR(32) NOT NULL DEFAULT '待排期',
  due_date_ DATE,
  description_ TEXT,
  description_html_ LONGTEXT,
  source_id_ VARCHAR(36),
  source_table_ VARCHAR(64),
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  update_time_ DATETIME NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_product_work_item_code (tenant_id_, code_),
  KEY idx_work_item_type_status (tenant_id_, type_, status_, create_time_),
  KEY idx_work_item_parent (tenant_id_, parent_id_),
  KEY idx_work_item_iteration (tenant_id_, iteration_id_)
);

CREATE TABLE IF NOT EXISTS t_product_work_item_relation (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  from_id_ VARCHAR(36) NOT NULL,
  to_id_ VARCHAR(36) NOT NULL,
  relation_type_ VARCHAR(32) NOT NULL,
  create_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  UNIQUE KEY uk_work_item_relation (tenant_id_, from_id_, to_id_, relation_type_),
  KEY idx_work_item_relation_from (tenant_id_, from_id_),
  KEY idx_work_item_relation_to (tenant_id_, to_id_)
);

CREATE TABLE IF NOT EXISTS t_product_work_item_event (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  work_item_id_ VARCHAR(36) NOT NULL,
  event_type_ VARCHAR(32) NOT NULL,
  from_status_ VARCHAR(32),
  to_status_ VARCHAR(32),
  content_ VARCHAR(2000),
  operator_name_ VARCHAR(128),
  create_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  KEY idx_work_item_event (tenant_id_, work_item_id_, create_time_)
);

INSERT IGNORE INTO t_product_work_item
  (id_,tenant_id_,code_,title_,type_,product_line_id_,product_line_name_,owner_name_,creator_name_,priority_,status_,due_date_,description_,source_id_,source_table_,create_by_,update_by_,create_time_,update_time_)
SELECT id_,tenant_id_,code_,title_,'requirement',product_line_id_,product_line_name_,owner_name_,creator_name_,priority_,status_,due_date_,description_,id_,'t_product_requirement',create_by_,update_by_,create_time_,update_time_
FROM t_product_requirement WHERE delete_flag_=0;
INSERT IGNORE INTO t_product_work_item
  (id_,tenant_id_,code_,title_,type_,product_line_id_,product_line_name_,owner_name_,creator_name_,priority_,status_,due_date_,description_,source_id_,source_table_,create_by_,update_by_,create_time_,update_time_)
SELECT id_,tenant_id_,code_,title_,'design',product_line_id_,product_line_name_,owner_name_,creator_name_,priority_,status_,due_date_,description_,id_,'t_product_design_task',create_by_,update_by_,create_time_,update_time_
FROM t_product_design_task WHERE delete_flag_=0;
INSERT IGNORE INTO t_product_work_item
  (id_,tenant_id_,code_,title_,type_,product_line_id_,product_line_name_,owner_name_,creator_name_,priority_,status_,due_date_,description_,source_id_,source_table_,create_by_,update_by_,create_time_,update_time_)
SELECT id_,tenant_id_,code_,title_,'development',product_line_id_,product_line_name_,owner_name_,creator_name_,priority_,status_,due_date_,description_,id_,'t_product_dev_task',create_by_,update_by_,create_time_,update_time_
FROM t_product_dev_task WHERE delete_flag_=0;
INSERT IGNORE INTO t_product_work_item
  (id_,tenant_id_,code_,title_,type_,product_line_id_,product_line_name_,owner_name_,creator_name_,priority_,status_,due_date_,description_,source_id_,source_table_,create_by_,update_by_,create_time_,update_time_)
SELECT id_,tenant_id_,code_,title_,'bug',product_line_id_,product_line_name_,owner_name_,creator_name_,priority_,status_,due_date_,description_,id_,'t_product_bug',create_by_,update_by_,create_time_,update_time_
FROM t_product_bug WHERE delete_flag_=0;

CREATE TABLE t_product_test_case_directory (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  parent_id_ VARCHAR(36) NULL,
  name_ VARCHAR(120) NOT NULL,
  sort_ INT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_test_case_directory_name (tenant_id_,product_line_id_,parent_id_,name_,delete_flag_),
  KEY idx_test_case_directory_tree (tenant_id_,product_line_id_,parent_id_,delete_flag_,sort_)
);

CREATE TABLE t_product_test_case (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  directory_id_ VARCHAR(36) NOT NULL,
  source_requirement_id_ VARCHAR(36) NULL,
  code_ VARCHAR(32) NOT NULL,
  title_ VARCHAR(255) NOT NULL,
  precondition_ TEXT NULL,
  priority_ VARCHAR(8) NOT NULL,
  owner_id_ VARCHAR(36) NOT NULL,
  owner_name_ VARCHAR(120) NOT NULL,
  tags_ JSON NULL,
  enabled_ TINYINT NOT NULL DEFAULT 1,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_test_case_code (tenant_id_,product_line_id_,code_,delete_flag_),
  KEY idx_test_case_directory (tenant_id_,product_line_id_,directory_id_,enabled_,delete_flag_),
  KEY idx_test_case_owner (tenant_id_,product_line_id_,owner_id_,delete_flag_),
  KEY idx_test_case_source (tenant_id_,source_requirement_id_,delete_flag_)
);

CREATE TABLE t_product_test_case_step (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  test_case_id_ VARCHAR(36) NOT NULL,
  sort_ INT NOT NULL,
  action_ TEXT NOT NULL,
  expected_result_ TEXT NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_test_case_step_sort (tenant_id_,test_case_id_,sort_,delete_flag_),
  KEY idx_test_case_step_case (tenant_id_,test_case_id_,delete_flag_,sort_)
);

CREATE TABLE t_product_test_case_work_item (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  test_case_id_ VARCHAR(36) NOT NULL,
  work_item_id_ VARCHAR(36) NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_test_case_work_item (tenant_id_,test_case_id_,work_item_id_,delete_flag_),
  KEY idx_test_case_work_item_task (tenant_id_,product_line_id_,work_item_id_,delete_flag_)
);

CREATE TABLE t_product_test_plan (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  work_item_id_ VARCHAR(36) NOT NULL,
  requirement_id_ VARCHAR(36) NULL,
  version_id_ VARCHAR(36) NULL,
  environment_ VARCHAR(255) NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_test_plan_work_item (tenant_id_,work_item_id_,delete_flag_),
  KEY idx_test_plan_line (tenant_id_,product_line_id_,delete_flag_)
);

CREATE TABLE t_product_test_plan_case (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  test_plan_id_ VARCHAR(36) NOT NULL,
  test_case_id_ VARCHAR(36) NOT NULL,
  sort_ INT NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_test_plan_case (tenant_id_,test_plan_id_,test_case_id_,delete_flag_),
  KEY idx_test_plan_case_sort (tenant_id_,test_plan_id_,delete_flag_,sort_)
);

CREATE TABLE t_product_test_execution (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  test_plan_id_ VARCHAR(36) NOT NULL,
  work_item_id_ VARCHAR(36) NOT NULL,
  round_no_ INT NOT NULL,
  name_ VARCHAR(120) NOT NULL,
  scope_type_ VARCHAR(24) NOT NULL,
  environment_ VARCHAR(255) NULL,
  build_version_ VARCHAR(120) NULL,
  executor_id_ VARCHAR(36) NOT NULL,
  executor_name_ VARCHAR(120) NOT NULL,
  status_ VARCHAR(24) NOT NULL,
  request_id_ VARCHAR(64) NOT NULL,
  request_hash_ VARCHAR(64) NOT NULL,
  start_time_ DATETIME(6) NULL,
  end_time_ DATETIME(6) NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_test_execution_round (tenant_id_,test_plan_id_,round_no_,delete_flag_),
  UNIQUE KEY uk_test_execution_request (tenant_id_,work_item_id_,request_id_,delete_flag_),
  KEY idx_test_execution_task (tenant_id_,product_line_id_,work_item_id_,status_,delete_flag_)
);

CREATE TABLE t_product_test_execution_case (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  execution_id_ VARCHAR(36) NOT NULL,
  test_case_id_ VARCHAR(36) NOT NULL,
  sort_ INT NOT NULL,
  code_snapshot_ VARCHAR(32) NOT NULL,
  title_snapshot_ VARCHAR(255) NOT NULL,
  precondition_snapshot_ TEXT NULL,
  priority_snapshot_ VARCHAR(8) NOT NULL,
  steps_snapshot_ LONGTEXT NOT NULL,
  result_ VARCHAR(24) NOT NULL,
  actual_result_ TEXT NULL,
  executor_id_ VARCHAR(36) NULL,
  executor_name_ VARCHAR(120) NULL,
  executed_at_ DATETIME(6) NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_test_execution_case (tenant_id_,execution_id_,test_case_id_,delete_flag_),
  KEY idx_test_execution_case_result (tenant_id_,execution_id_,result_,delete_flag_,sort_)
);

CREATE TABLE t_product_test_execution_evidence (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  execution_case_id_ VARCHAR(36) NOT NULL,
  name_ VARCHAR(255) NOT NULL,
  content_type_ VARCHAR(120) NOT NULL,
  size_ BIGINT NOT NULL,
  data_url_ LONGTEXT NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  KEY idx_test_evidence_result (tenant_id_,execution_case_id_,delete_flag_)
);

CREATE TABLE t_product_test_execution_defect (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  product_line_id_ VARCHAR(36) NOT NULL,
  execution_case_id_ VARCHAR(36) NOT NULL,
  defect_work_item_id_ VARCHAR(36) NOT NULL,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_test_result_defect (tenant_id_,execution_case_id_,defect_work_item_id_,delete_flag_),
  KEY idx_test_defect_reverse (tenant_id_,product_line_id_,defect_work_item_id_,delete_flag_)
);

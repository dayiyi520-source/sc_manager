CREATE TABLE IF NOT EXISTS t_crm_bidding (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  opportunity_id_ VARCHAR(36) NOT NULL,
  customer_id_ VARCHAR(36) NOT NULL,
  name_ VARCHAR(255) NOT NULL,
  status_ VARCHAR(32) NOT NULL DEFAULT '进行中',
  result_ VARCHAR(32),
  owner_name_ VARCHAR(128) NOT NULL,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  update_time_ DATETIME NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_bidding_tenant_opportunity (tenant_id_, opportunity_id_),
  KEY idx_bidding_tenant_status (tenant_id_, status_)
);

CREATE TABLE IF NOT EXISTS t_crm_winning_engagement (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  bidding_id_ VARCHAR(36) NOT NULL,
  customer_id_ VARCHAR(36) NOT NULL,
  name_ VARCHAR(255) NOT NULL,
  status_ VARCHAR(32) NOT NULL DEFAULT '待接洽',
  owner_name_ VARCHAR(128) NOT NULL,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  update_time_ DATETIME NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_engagement_tenant_bidding (tenant_id_, bidding_id_),
  KEY idx_engagement_tenant_status (tenant_id_, status_)
);

CREATE TABLE IF NOT EXISTS t_project (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  engagement_id_ VARCHAR(36) NOT NULL,
  customer_id_ VARCHAR(36) NOT NULL,
  name_ VARCHAR(255) NOT NULL,
  status_ VARCHAR(32) NOT NULL DEFAULT '实施中',
  owner_name_ VARCHAR(128) NOT NULL,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  update_time_ DATETIME NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_project_tenant_engagement (tenant_id_, engagement_id_),
  KEY idx_project_tenant_status (tenant_id_, status_)
);

CREATE TABLE IF NOT EXISTS t_research_status_template (
  id_ VARCHAR(64) NOT NULL,
  tenant_id_ VARCHAR(64) NOT NULL,
  scope_ VARCHAR(16) NOT NULL,
  name_ VARCHAR(64) NOT NULL,
  phase_ VARCHAR(16) NOT NULL,
  color_ VARCHAR(32) NOT NULL DEFAULT 'neutral',
  initial_ TINYINT(1) NOT NULL DEFAULT 0,
  enabled_ TINYINT(1) NOT NULL DEFAULT 1,
  sort_ INT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  create_by_ VARCHAR(64) NOT NULL,
  update_by_ VARCHAR(64) NOT NULL,
  create_time_ DATETIME(6) NOT NULL,
  update_time_ DATETIME(6) NOT NULL,
  delete_flag_ TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id_),
  UNIQUE KEY uk_research_status_template_name (tenant_id_, scope_, name_, delete_flag_),
  KEY idx_research_status_template_scope (tenant_id_, scope_, enabled_, sort_, delete_flag_)
);

INSERT INTO t_research_status_template
  (id_, tenant_id_, scope_, name_, phase_, color_, initial_, enabled_, sort_, create_by_, update_by_, create_time_, update_time_)
SELECT UUID(), t.tenant_id_, s.scope_, s.name_, s.phase_, s.color_, s.initial_, 1, s.sort_, 'system', 'system', NOW(6), NOW(6)
FROM (SELECT DISTINCT tenant_id_ FROM t_sys_user WHERE delete_flag_=0) t
JOIN (
  SELECT 'PRODUCT' scope_, '待规划' name_, '待开始' phase_, 'neutral' color_, 1 initial_, 1 sort_
  UNION ALL SELECT 'PRODUCT', '迭代中', '处理中', 'blue', 0, 2
  UNION ALL SELECT 'PRODUCT', '已归档', '已完成', 'green', 0, 3
  UNION ALL SELECT 'PRODUCT', '已停用', '已结束', 'neutral', 0, 4
  UNION ALL SELECT 'ITERATION', '未开始', '待开始', 'neutral', 1, 1
  UNION ALL SELECT 'ITERATION', '进行中', '处理中', 'blue', 0, 2
  UNION ALL SELECT 'ITERATION', '已完成', '已完成', 'green', 0, 3
  UNION ALL SELECT 'ITERATION', '已结束', '已结束', 'neutral', 0, 4
) s
WHERE NOT EXISTS (
  SELECT 1 FROM t_research_status_template e
  WHERE e.tenant_id_=t.tenant_id_ AND e.scope_=s.scope_ AND e.name_=s.name_ AND e.delete_flag_=0
);

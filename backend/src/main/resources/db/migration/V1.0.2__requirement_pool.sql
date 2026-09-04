CREATE TABLE IF NOT EXISTS t_product_requirement (
  id_ VARCHAR(36) PRIMARY KEY,
  tenant_id_ VARCHAR(36) NOT NULL,
  code_ VARCHAR(64) NOT NULL,
  title_ VARCHAR(255) NOT NULL,
  description_ TEXT NOT NULL,
  expected_goal_ VARCHAR(512),
  status_ VARCHAR(32) NOT NULL,
  priority_ VARCHAR(32) NOT NULL,
  owner_name_ VARCHAR(128) NOT NULL,
  creator_name_ VARCHAR(128),
  department_ VARCHAR(128),
  version_id_ VARCHAR(36),
  version_name_ VARCHAR(255) NOT NULL,
  product_line_id_ VARCHAR(36),
  product_line_name_ VARCHAR(255) NOT NULL,
  customer_id_ VARCHAR(36),
  customer_name_ VARCHAR(255),
  estimated_hours_ DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_hours_ DECIMAL(10,2) NOT NULL DEFAULT 0,
  due_date_ DATE NOT NULL,
  create_by_ VARCHAR(36) NOT NULL,
  update_by_ VARCHAR(36) NOT NULL,
  create_time_ DATETIME NOT NULL,
  update_time_ DATETIME NOT NULL,
  delete_flag_ TINYINT NOT NULL DEFAULT 0,
  version_ INT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_requirement_tenant_code (tenant_id_, code_),
  KEY idx_requirement_tenant_status (tenant_id_, status_),
  KEY idx_requirement_tenant_product (tenant_id_, product_line_name_),
  KEY idx_requirement_tenant_created (tenant_id_, create_time_)
);

INSERT INTO t_product_requirement (
  id_, tenant_id_, code_, title_, description_, expected_goal_, status_, priority_, owner_name_, creator_name_, department_,
  version_id_, version_name_, product_line_id_, product_line_name_, customer_id_, customer_name_, estimated_hours_, actual_hours_, due_date_,
  create_by_, update_by_, create_time_, update_time_
)
VALUES
('req-1','local-tenant','REQ-2026-001','支持国产化达梦数据库与统信UOS双向高可用主备容灾切换','针对华东电网与浙江政务信创等保要求，研发底座必须无缝适配DM8达梦数据库，支持读写分离与主备节点15秒内无感故障自动转移。','通过国家工信部信创互认证测试，并在故障注入压测下数据零丢失。','研发中','P0-紧急阻断','王浩然','张瑞','核心引擎研发部','ver-1','师创智联OS V3.5.2','pl-1','师创智联协同OS','c-1','国家电网华东分部数智调度中心',80,54,'2026-09-08','system','system',NOW(),NOW()),
('req-2','local-tenant','REQ-2026-002','3D数字孪生看板WebGPU渲染管线升级与降级兼容机制','为满足智行新能源工业现场高密度三维点云展示，升级WebGPU多线程着色器，并在低端集显机器上平滑退避至WebGL 2.0。','渲染帧率稳定维持在55FPS以上，内存占用降低35%。','测试中','P1-高优','王浩然','张瑞','前端可视化架构组','ver-2','智慧数智分析引擎 V2.8.0','pl-2','智慧数智分析引擎','c-2','智行新能源汽车工业互联股份有限公司',60,58,'2026-09-05','system','system',NOW(),NOW()),
('req-3','local-tenant','REQ-2026-003','移动端PDA离线扫描识别与弱网批量断点续传队列','申通物流分拨中心地下仓库信号微弱，手持PDA扫码时必须支持本地SQLite加密存储，并在重连Wi-Fi后秒级分批上报。','保证单机离线存储5万条记录不卡顿，网络恢复后10秒内上报完成。','已发布','P0-紧急阻断','李思齐','陈雅婷','移动端研发组','ver-3','移动端协同App V3.1.2','pl-4','移动端协同App','c-4','申通智联现代供应链物流集团',45,42,'2026-08-28','system','system',NOW(),NOW()),
('req-4','local-tenant','REQ-2026-004','复杂跨部门多级审批流分支条件可视化配置器','支持按金额区间、申请人职级、关联客户S/A/B等级动态计算审批路由与并行加签。','支持10层嵌套条件，配置体验所见即所得。','设计中','P2-普通','张瑞','林志豪','产品与体验设计部','ver-4','智能低代码中台 V4.1.0','pl-3','智能低代码中台',NULL,NULL,40,12,'2026-09-18','system','system',NOW(),NOW())
ON DUPLICATE KEY UPDATE title_=VALUES(title_), description_=VALUES(description_), update_time_=NOW();

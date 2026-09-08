INSERT INTO t_sys_role (id_, tenant_id_, code_, name_, create_time_, update_time_)
VALUES
('role-admin', 'local-tenant', 'admin', '超级系统管理员', NOW(), NOW()),
('role-sales', 'local-tenant', 'sales_director', '销售总监', NOW(), NOW()),
('role-product', 'local-tenant', 'product_manager', '产品经理', NOW(), NOW()),
('role-tech', 'local-tenant', 'tech_lead', '技术负责人', NOW(), NOW())
ON DUPLICATE KEY UPDATE name_=VALUES(name_), update_time_=NOW();

INSERT INTO t_sys_user (id_, tenant_id_, username_, name_, avatar_, department_, role_, role_title_, status_, create_by_, update_by_, create_time_, update_time_)
VALUES
('user-admin', 'local-tenant', 'admin', '林志豪', '', '平台架构部', 'admin', '超级系统管理员 / 平台架构师', 'enabled', 'system', 'system', NOW(), NOW()),
('user-sales', 'local-tenant', 'sales', '陈雅婷', '', '商务大客户部', 'sales_director', '销售总监', 'enabled', 'system', 'system', NOW(), NOW()),
('user-product', 'local-tenant', 'product', '张瑞', '', '产品中心', 'product_manager', '产品经理', 'enabled', 'system', 'system', NOW(), NOW()),
('user-tech', 'local-tenant', 'tech', '王浩然', '', '研发一组', 'tech_lead', '技术负责人', 'enabled', 'system', 'system', NOW(), NOW())
ON DUPLICATE KEY UPDATE name_=VALUES(name_), role_=VALUES(role_), update_time_=NOW();

INSERT IGNORE INTO t_sys_user_role (id_, tenant_id_, user_id_, role_id_, create_time_)
VALUES
('ur-admin', 'local-tenant', 'user-admin', 'role-admin', NOW()),
('ur-sales', 'local-tenant', 'user-sales', 'role-sales', NOW()),
('ur-product', 'local-tenant', 'user-product', 'role-product', NOW()),
('ur-tech', 'local-tenant', 'user-tech', 'role-tech', NOW());

INSERT INTO t_crm_customer (id_, tenant_id_, code_, name_, type_, level_, contact_name_, contact_phone_, contact_title_, contact_email_, annual_budget_, source_, address_, industry_, scale_, tags_, create_by_, update_by_, create_time_, update_time_)
VALUES
('c-1', 'local-tenant', 'CUST-2026-001', '国家电网华东分部数智调度中心', '政府国企', 'S级-战略', '周德华', '13800000001', '总工程师', 'zhou@example.com', 12000000, '主动开发', '上海市浦东新区', '电力能源', '10000人以上', JSON_ARRAY('灯塔客户','信创适配'), 'system', 'system', NOW(), NOW()),
('c-2', 'local-tenant', 'CUST-2026-002', '智行新能源汽车工业互联股份有限公司', '民营标杆', 'A级-重点', '徐晓峰', '13800000002', '信息总监', 'xu@example.com', 6800000, '客户转介', '浙江省杭州市', '新能源汽车', '5000-10000人', JSON_ARRAY('数字孪生','重点跟进'), 'system', 'system', NOW(), NOW()),
('c-4', 'local-tenant', 'CUST-2026-004', '申通智联现代供应链物流集团', '民营标杆', 'A级-重点', '何敏', '13800000004', '数字化部负责人', 'he@example.com', 4200000, '行业展会', '上海市青浦区', '物流供应链', '10000人以上', JSON_ARRAY('移动端','弱网场景'), 'system', 'system', NOW(), NOW())
ON DUPLICATE KEY UPDATE name_=VALUES(name_), update_time_=NOW();

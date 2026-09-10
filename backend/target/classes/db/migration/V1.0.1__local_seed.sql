INSERT INTO t_sys_role (id_, tenant_id_, code_, name_, create_time_, update_time_)
VALUES ('role-admin','local-tenant','admin','超级系统管理员',NOW(),NOW()),('role-sales','local-tenant','sales_director','销售总监',NOW(),NOW()),('role-product','local-tenant','product_manager','产品经理',NOW(),NOW()),('role-tech','local-tenant','tech_lead','技术负责人',NOW(),NOW())
ON DUPLICATE KEY UPDATE name_=VALUES(name_), update_time_=NOW();

INSERT INTO t_crm_opportunity (id_,tenant_id_,name_,type_,customer_id_,stage_,amount_,related_product_,is_trial_,deadline_,owner_name_,collaborators_,source_,probability_,remarks_,create_by_,update_by_,create_time_,update_time_)
VALUES
('opp-1','local-tenant','国家电网数智调度协同平台定制采购','定制研发','c-1','方案设计',4800000,'数字化协同管理中枢 V4.2',0,'2026-10-31','周销售',JSON_ARRAY('李工','王经理'),'主动开发',65,'重点客户信创升级项目','system','system',NOW(),NOW()),
('opp-2','local-tenant','智行新能源工业互联平台升级','新购软件','c-2','需求确认',2600000,'数字化协同管理中枢 V4.2',1,'2026-11-15','陈雅婷',JSON_ARRAY('李工'),'客户转介',45,'等待客户完成现场调研','system','system',NOW(),NOW())
ON DUPLICATE KEY UPDATE stage_=VALUES(stage_),amount_=VALUES(amount_),probability_=VALUES(probability_),update_time_=NOW();

INSERT INTO t_crm_follow_up (id_,tenant_id_,customer_id_,opportunity_id_,contact_name_,follow_type_,content_,feedback_,next_follow_plan_,next_plan_date_,follow_time_,owner_name_,attachments_,create_by_,update_by_,create_time_,update_time_)
VALUES ('follow-1','local-tenant','c-1','opp-1','周德华','现场拜访','完成信创适配方案初审，确认国产数据库兼容性要求。','客户反馈积极，安排技术团队进行 PoC。','组织架构师与客户进行技术 PoC 演示','2026-09-12','2026-09-01 10:00:00','周销售',JSON_ARRAY('现场技术交流纪要.pdf'),'system','system',NOW(),NOW())
ON DUPLICATE KEY UPDATE content_=VALUES(content_),next_plan_date_=VALUES(next_plan_date_),update_time_=NOW();

INSERT INTO t_crm_contract (id_,tenant_id_,code_,name_,customer_id_,related_product_,type_,amount_,paid_amount_,owner_name_,sign_date_,status_,attachments_,create_by_,update_by_,create_time_,update_time_)
VALUES ('contract-1','local-tenant','SC-CT-2026-001','国家电网数智调度协同平台定制采购合同','c-1','数字化协同管理中枢 V4.2','定制开发',4800000,1440000,'周销售','2026-08-20','履约中',JSON_ARRAY('合同扫描件.pdf'),'system','system',NOW(),NOW())
ON DUPLICATE KEY UPDATE amount_=VALUES(amount_),paid_amount_=VALUES(paid_amount_),status_=VALUES(status_),update_time_=NOW();

INSERT INTO t_crm_contract_payment_stage (id_,tenant_id_,contract_id_,phase_,percentage_,amount_,status_,trigger_condition_,due_date_,create_time_,update_time_)
VALUES
('stage-1','local-tenant','contract-1','第一期（首付款）',30,1440000,'已收款','合同签订生效后 7 个工作日内','2026-08-27',NOW(),NOW()),
('stage-2','local-tenant','contract-1','第二期（初验款）',40,1920000,'待催收','系统部署上线并通过初验','2026-11-30',NOW(),NOW()),
('stage-3','local-tenant','contract-1','第三期（终验款）',20,960000,'未到期','系统稳定运行 3 个月并通过终验','2027-03-31',NOW(),NOW()),
('stage-4','local-tenant','contract-1','第四期（质保金）',10,480000,'未到期','质保期满无重大质量问题','2027-08-31',NOW(),NOW())
ON DUPLICATE KEY UPDATE percentage_=VALUES(percentage_),amount_=VALUES(amount_),status_=VALUES(status_),update_time_=NOW();
INSERT INTO t_sys_user (id_, tenant_id_, username_, name_, avatar_, department_, role_, role_title_, status_, create_by_, update_by_, create_time_, update_time_)
VALUES ('user-admin','local-tenant','admin','林志豪','', '平台架构部','admin','超级系统管理员 / 平台架构师','enabled','system','system',NOW(),NOW()),('user-sales','local-tenant','sales','陈雅婷','', '商务大客户部','sales_director','销售总监','enabled','system','system',NOW(),NOW()),('user-product','local-tenant','product','张瑞','', '产品中心','product_manager','产品经理','enabled','system','system',NOW(),NOW()),('user-tech','local-tenant','tech','王浩然','', '研发一组','tech_lead','技术负责人','enabled','system','system',NOW(),NOW())
ON DUPLICATE KEY UPDATE name_=VALUES(name_), role_=VALUES(role_), update_time_=NOW();
INSERT IGNORE INTO t_sys_user_role (id_,tenant_id_,user_id_,role_id_,create_time_) VALUES ('ur-admin','local-tenant','user-admin','role-admin',NOW()),('ur-sales','local-tenant','user-sales','role-sales',NOW()),('ur-product','local-tenant','user-product','role-product',NOW()),('ur-tech','local-tenant','user-tech','role-tech',NOW());
INSERT INTO t_crm_customer (id_,tenant_id_,code_,name_,type_,level_,contact_name_,contact_phone_,contact_title_,contact_email_,annual_budget_,source_,address_,industry_,scale_,tags_,create_by_,update_by_,create_time_,update_time_)
VALUES ('c-1','local-tenant','CUST-2026-001','国家电网华东分部数智调度中心','政府国企','S级-战略','周德华','13800000001','总工程师','zhou@example.com',12000000,'主动开发','上海市浦东新区','电力能源','10000人以上',JSON_ARRAY('灯塔客户','信创适配'),'system','system',NOW(),NOW()),('c-2','local-tenant','CUST-2026-002','智行新能源汽车工业互联股份有限公司','民营标杆','A级-重点','徐晓峰','13800000002','信息总监','xu@example.com',6800000,'客户转介','浙江省杭州市','新能源汽车','5000-10000人',JSON_ARRAY('数字孪生','重点跟进'),'system','system',NOW(),NOW()),('c-4','local-tenant','CUST-2026-004','申通智联现代供应链物流集团','民营标杆','A级-重点','何敏','13800000004','数字化部负责人','he@example.com',4200000,'行业展会','上海市青浦区','物流供应链','10000人以上',JSON_ARRAY('移动端','弱网场景'),'system','system',NOW(),NOW())
ON DUPLICATE KEY UPDATE name_=VALUES(name_), update_time_=NOW();

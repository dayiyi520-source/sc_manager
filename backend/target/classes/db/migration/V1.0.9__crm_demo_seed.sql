-- Local verification seed: ten customers, ten leads and ten linked opportunities.
-- IDs are stable so Flyway can be applied repeatedly without duplicate rows.
INSERT INTO t_crm_customer (id_, tenant_id_, code_, name_, type_, level_, contact_name_, contact_phone_, contact_title_, contact_email_, annual_budget_, source_, address_, industry_, scale_, tags_, status_, school_level_, school_nature_, school_type_, ownership_, region_, create_by_, update_by_, create_time_, update_time_)
VALUES
('seed-customer-01','local-tenant','SEED-CUST-001','华东师范大学数字化中心','高校科研','S级-战略','周敏','13800001001','信息化主任','zhou.min@example.com',9000000,'主动开发','上海市普陀区','教育科研','10000人以上',JSON_ARRAY('双一流高校','重点客户'),'无效','本科','师范类','普通高等学校','公办','华东','system','system',NOW(),NOW()),
('seed-customer-02','local-tenant','SEED-CUST-002','浙江工业职业技术学院','高校科研','A级-重点','陈立','13800001002','网络中心主任','chen.li@example.com',4200000,'市场活动','浙江省杭州市','职业教育','5000-10000人',JSON_ARRAY('省双高'),'无效','专科','职业教育','高等职业院校','公办','华东','system','system',NOW(),NOW()),
('seed-customer-03','local-tenant','SEED-CUST-003','南京信息工程大学','高校科研','A级-重点','刘洋','13800001003','信息化处处长','liu.yang@example.com',5600000,'官网引流','江苏省南京市','教育科研','10000人以上',JSON_ARRAY('国高水平专业群'),'无效','本科','理工类','普通高等学校','公办','华东','system','system',NOW(),NOW()),
('seed-customer-04','local-tenant','SEED-CUST-004','福建商贸职业中专学校','高校科研','B级-标准','林芳','13800001004','校长助理','lin.fang@example.com',1800000,'客户转介','福建省福州市','职业教育','1000-5000人',JSON_ARRAY('产教融合'),'无效','中职','职业教育','中等职业学校','公办','华东','system','system',NOW(),NOW()),
('seed-customer-05','local-tenant','SEED-CUST-005','广东技术师范大学','高校科研','A级-重点','黄伟','13800001005','数字校园负责人','huang.wei@example.com',6300000,'市场活动','广东省广州市','教育科研','10000人以上',JSON_ARRAY('师范院校'),'无效','本科','师范类','普通高等学校','公办','华南','system','system',NOW(),NOW()),
('seed-customer-06','local-tenant','SEED-CUST-006','深圳市南山实验教育集团','政府国企','A级-重点','赵倩','13800001006','信息中心主任','zhao.qian@example.com',3500000,'主动开发','广东省深圳市','基础教育','5000-10000人',JSON_ARRAY('基础教育'),'无效','基础教育','综合类','基础教育学校','公办','华南','system','system',NOW(),NOW()),
('seed-customer-07','local-tenant','SEED-CUST-007','山东交通职业学院','高校科研','B级-标准','孙涛','13800001007','教务处负责人','sun.tao@example.com',2700000,'官网引流','山东省潍坊市','职业教育','1000-5000人',JSON_ARRAY('实训基地'),'无效','专科','职业教育','高等职业院校','公办','华北','system','system',NOW(),NOW()),
('seed-customer-08','local-tenant','SEED-CUST-008','成都市高新实验中学','政府国企','B级-标准','何洁','13800001008','校务主任','he.jie@example.com',2100000,'客户转介','四川省成都市','基础教育','1000-5000人',JSON_ARRAY('智慧校园'),'无效','基础教育','综合类','基础教育学校','公办','西南','system','system',NOW(),NOW()),
('seed-customer-09','local-tenant','SEED-CUST-009','西安航空职业技术大学','高校科研','A级-重点','王磊','13800001009','信息化处负责人','wang.lei@example.com',3900000,'市场活动','陕西省西安市','职业教育','5000-10000人',JSON_ARRAY('产教融合'),'无效','本科','理工类','高等职业院校','公办','西北','system','system',NOW(),NOW()),
('seed-customer-10','local-tenant','SEED-CUST-010','东北财经大学','高校科研','B级-标准','高雪','13800001010','网络与信息中心主任','gao.xue@example.com',3100000,'主动开发','辽宁省大连市','教育科研','10000人以上',JSON_ARRAY('数字校园'),'无效','本科','综合类','普通高等学校','公办','东北','system','system',NOW(),NOW())
ON DUPLICATE KEY UPDATE name_=VALUES(name_), status_=VALUES(status_), update_time_=NOW();

INSERT INTO t_crm_lead (id_, tenant_id_, name_, customer_id_, school_contact_, contact_phone_, department_, owner_name_, source_, products_, status_, converted_opportunity_id_, create_by_, update_by_, create_time_, update_time_)
VALUES
('seed-lead-01','local-tenant','华东师大数字校园升级线索','seed-customer-01','周敏','13800001001','市场运营部','陈雅婷','市场活动',JSON_ARRAY('数字化协同管理中枢 V4.2'),'跟进中','seed-opportunity-01','system','system',NOW(),NOW()),
('seed-lead-02','local-tenant','浙江工院实训平台线索','seed-customer-02','陈立','13800001002','市场运营部','陈雅婷','市场活动',JSON_ARRAY('智慧数智分析引擎'),'跟进中','seed-opportunity-02','system','system',NOW(),NOW()),
('seed-lead-03','local-tenant','南京信息工程数据中台线索','seed-customer-03','刘洋','13800001003','市场运营部','周销售','官网引流',JSON_ARRAY('数字化协同管理中枢 V4.2'),'跟进中','seed-opportunity-03','system','system',NOW(),NOW()),
('seed-lead-04','local-tenant','福建商贸产教融合线索','seed-customer-04','林芳','13800001004','市场运营部','周销售','客户转介绍',JSON_ARRAY('移动端协同App'),'跟进中','seed-opportunity-04','system','system',NOW(),NOW()),
('seed-lead-05','local-tenant','广师大科研协同线索','seed-customer-05','黄伟','13800001005','市场运营部','陈雅婷','市场活动',JSON_ARRAY('数字化协同管理中枢 V4.2'),'跟进中','seed-opportunity-05','system','system',NOW(),NOW()),
('seed-lead-06','local-tenant','南山实验智慧校园线索','seed-customer-06','赵倩','13800001006','市场运营部','周销售','官网引流',JSON_ARRAY('智慧数智分析引擎'),'跟进中','seed-opportunity-06','system','system',NOW(),NOW()),
('seed-lead-07','local-tenant','山东交职院实训升级线索','seed-customer-07','孙涛','13800001007','市场运营部','陈雅婷','客户转介绍',JSON_ARRAY('移动端协同App'),'跟进中','seed-opportunity-07','system','system',NOW(),NOW()),
('seed-lead-08','local-tenant','成都高新实验中学线索','seed-customer-08','何洁','13800001008','市场运营部','周销售','市场活动',JSON_ARRAY('数字化协同管理中枢 V4.2'),'跟进中','seed-opportunity-08','system','system',NOW(),NOW()),
('seed-lead-09','local-tenant','西安航空产教平台线索','seed-customer-09','王磊','13800001009','市场运营部','陈雅婷','官网引流',JSON_ARRAY('智慧数智分析引擎'),'跟进中','seed-opportunity-09','system','system',NOW(),NOW()),
('seed-lead-10','local-tenant','东北财经数据治理线索','seed-customer-10','高雪','13800001010','市场运营部','周销售','市场活动',JSON_ARRAY('数字化协同管理中枢 V4.2'),'跟进中','seed-opportunity-10','system','system',NOW(),NOW())
ON DUPLICATE KEY UPDATE name_=VALUES(name_), update_time_=NOW();

INSERT INTO t_crm_opportunity (id_, tenant_id_, name_, type_, customer_id_, lead_id_, stage_, amount_, related_product_, is_trial_, deadline_, owner_name_, collaborators_, source_, probability_, remarks_, create_by_, update_by_, create_time_, update_time_)
VALUES
('seed-opportunity-01','local-tenant','华东师大数字校园升级项目','定制研发','seed-customer-01','seed-lead-01','需求确认',3200000,'数字化协同管理中枢 V4.2',0,'2026-11-30','陈雅婷',JSON_ARRAY('王浩然'),'线索转化',55,'等待信息化建设方案评审','system','system',NOW(),NOW()),
('seed-opportunity-02','local-tenant','浙江工院实训平台项目','标准产品','seed-customer-02','seed-lead-02','方案设计',1800000,'智慧数智分析引擎',0,'2026-12-15','陈雅婷',JSON_ARRAY('张瑞'),'线索转化',45,'已完成现场调研','system','system',NOW(),NOW()),
('seed-opportunity-03','local-tenant','南京信息工程数据中台项目','定制研发','seed-customer-03','seed-lead-03','商务谈判',2600000,'数字化协同管理中枢 V4.2',0,'2026-10-20','周销售',JSON_ARRAY('李工'),'线索转化',65,'预算已初步确认','system','system',NOW(),NOW()),
('seed-opportunity-04','local-tenant','福建商贸产教融合平台项目','标准产品','seed-customer-04','seed-lead-04','发现商机',950000,'移动端协同App',1,'2027-01-15','周销售',JSON_ARRAY('赵测试'),'线索转化',25,'处于方案交流阶段','system','system',NOW(),NOW()),
('seed-opportunity-05','local-tenant','广师大科研协同项目','定制研发','seed-customer-05','seed-lead-05','需求确认',2400000,'数字化协同管理中枢 V4.2',0,'2026-12-01','陈雅婷',JSON_ARRAY('王浩然'),'线索转化',40,'需要补充科研项目管理场景','system','system',NOW(),NOW()),
('seed-opportunity-06','local-tenant','南山实验智慧校园项目','标准产品','seed-customer-06','seed-lead-06','方案设计',1500000,'智慧数智分析引擎',0,'2026-11-10','周销售',JSON_ARRAY('张瑞'),'线索转化',50,'等待校方组织评审','system','system',NOW(),NOW()),
('seed-opportunity-07','local-tenant','山东交职院实训升级项目','标准产品','seed-customer-07','seed-lead-07','发现商机',1200000,'移动端协同App',0,'2027-02-28','陈雅婷',JSON_ARRAY('李工'),'线索转化',20,'已建立首次联系','system','system',NOW(),NOW()),
('seed-opportunity-08','local-tenant','成都高新实验智慧校园项目','定制研发','seed-customer-08','seed-lead-08','招投标',2100000,'数字化协同管理中枢 V4.2',0,'2026-10-31','周销售',JSON_ARRAY('王浩然'),'线索转化',70,'进入招标文件编制阶段','system','system',NOW(),NOW()),
('seed-opportunity-09','local-tenant','西安航空产教平台项目','标准产品','seed-customer-09','seed-lead-09','商务谈判',1750000,'智慧数智分析引擎',0,'2026-12-20','陈雅婷',JSON_ARRAY('张瑞'),'线索转化',60,'合作伙伴已确认参与','system','system',NOW(),NOW()),
('seed-opportunity-10','local-tenant','东北财经数据治理项目','定制研发','seed-customer-10','seed-lead-10','需求确认',2300000,'数字化协同管理中枢 V4.2',0,'2027-01-31','周销售',JSON_ARRAY('李工'),'线索转化',35,'待确认数据治理范围','system','system',NOW(),NOW())
ON DUPLICATE KEY UPDATE stage_=VALUES(stage_), amount_=VALUES(amount_), probability_=VALUES(probability_), update_time_=NOW();

UPDATE t_crm_lead SET status_='转商机', update_time_=NOW() WHERE tenant_id_='local-tenant' AND id_ LIKE 'seed-lead-%';
UPDATE t_crm_customer SET status_='有效', update_time_=NOW() WHERE tenant_id_='local-tenant' AND id_ LIKE 'seed-customer-%';

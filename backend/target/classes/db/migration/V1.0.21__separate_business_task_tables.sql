-- 售前、交付、运维任务使用独立数据表，字段先与设计任务保持一致。
CREATE TABLE IF NOT EXISTS t_crm_presales_task LIKE t_product_design_task;
CREATE TABLE IF NOT EXISTS t_project_delivery_task LIKE t_product_design_task;
CREATE TABLE IF NOT EXISTS t_project_ops_task LIKE t_product_design_task;

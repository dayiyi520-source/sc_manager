-- 开发阶段已切换到独立任务表；旧售前/交付工单表确认无数据、无外键依赖后移除。
DROP TABLE IF EXISTS t_crm_presales_ticket;
DROP TABLE IF EXISTS t_project_delivery_ticket;

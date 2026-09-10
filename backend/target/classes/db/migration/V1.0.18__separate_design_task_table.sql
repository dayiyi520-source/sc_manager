CREATE TABLE IF NOT EXISTS t_product_design_task LIKE t_product_requirement;

INSERT INTO t_product_design_task
SELECT * FROM t_product_requirement
WHERE work_item_kind_='design'
  AND NOT EXISTS (
    SELECT 1 FROM t_product_design_task d
    WHERE d.id_=t_product_requirement.id_ AND d.tenant_id_=t_product_requirement.tenant_id_
  );

-- 保留旧需求表数据，迁移阶段不做删除；待数据校验完成后再执行清理。

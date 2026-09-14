UPDATE t_product_work_item child
JOIN t_product_design_task source ON source.id_=child.source_id_ AND source.tenant_id_=child.tenant_id_
SET child.parent_id_=(SELECT parent.id_ FROM t_product_work_item parent WHERE parent.source_id_=source.requirement_id_ AND parent.tenant_id_=source.tenant_id_ AND parent.type_='requirement' LIMIT 1)
WHERE child.type_='design' AND child.parent_id_ IS NULL;

UPDATE t_product_work_item child
JOIN t_product_dev_task source ON source.id_=child.source_id_ AND source.tenant_id_=child.tenant_id_
SET child.parent_id_=(SELECT parent.id_ FROM t_product_work_item parent WHERE parent.source_id_=source.requirement_id_ AND parent.tenant_id_=source.tenant_id_ AND parent.type_='requirement' LIMIT 1)
WHERE child.type_='development' AND child.parent_id_ IS NULL;

UPDATE t_product_work_item child
JOIN t_product_bug source ON source.id_=child.source_id_ AND source.tenant_id_=child.tenant_id_
SET child.parent_id_=(SELECT parent.id_ FROM t_product_work_item parent WHERE parent.source_id_=source.requirement_id_ AND parent.tenant_id_=source.tenant_id_ AND parent.type_='requirement' LIMIT 1)
WHERE child.type_='bug' AND child.parent_id_ IS NULL;

CREATE TEMPORARY TABLE tmp_work_item_parent_map (child_id_ VARCHAR(36) PRIMARY KEY, parent_id_ VARCHAR(36) NOT NULL);
INSERT IGNORE INTO tmp_work_item_parent_map (child_id_, parent_id_)
SELECT child.id_, parent.id_
FROM t_product_work_item child
JOIN t_product_design_task source ON source.id_=child.source_id_ AND source.tenant_id_=child.tenant_id_
JOIN t_product_work_item parent ON parent.source_id_=source.requirement_id_ AND parent.tenant_id_=source.tenant_id_ AND parent.type_='requirement'
WHERE child.type_='design' AND child.parent_id_ IS NULL;
INSERT IGNORE INTO tmp_work_item_parent_map (child_id_, parent_id_)
SELECT child.id_, parent.id_
FROM t_product_work_item child
JOIN t_product_dev_task source ON source.id_=child.source_id_ AND source.tenant_id_=child.tenant_id_
JOIN t_product_work_item parent ON parent.source_id_=source.requirement_id_ AND parent.tenant_id_=source.tenant_id_ AND parent.type_='requirement'
WHERE child.type_='development' AND child.parent_id_ IS NULL;
INSERT IGNORE INTO tmp_work_item_parent_map (child_id_, parent_id_)
SELECT child.id_, parent.id_
FROM t_product_work_item child
JOIN t_product_bug source ON source.id_=child.source_id_ AND source.tenant_id_=child.tenant_id_
JOIN t_product_work_item parent ON parent.source_id_=source.requirement_id_ AND parent.tenant_id_=source.tenant_id_ AND parent.type_='requirement'
WHERE child.type_='bug' AND child.parent_id_ IS NULL;
UPDATE t_product_work_item child JOIN tmp_work_item_parent_map map ON map.child_id_=child.id_ SET child.parent_id_=map.parent_id_ WHERE child.parent_id_ IS NULL;
DROP TEMPORARY TABLE tmp_work_item_parent_map;

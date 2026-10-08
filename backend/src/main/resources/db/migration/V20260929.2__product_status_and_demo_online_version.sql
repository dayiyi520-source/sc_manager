-- 统一产品生命周期状态，并为指定产品补充已发布的线上版本演示数据。

ALTER TABLE t_product_line
  MODIFY COLUMN current_version_ VARCHAR(64) NOT NULL DEFAULT '';

UPDATE t_product_line pl
SET pl.status_ = CASE
  WHEN pl.status_ = '已归档' THEN '已归档'
  WHEN pl.status_ = '已停用' THEN '已停用'
  WHEN EXISTS (
    SELECT 1 FROM t_product_line_version pv
    WHERE pv.product_line_id_ = pl.id_ AND pv.delete_flag_ = 0
  ) THEN '迭代中'
  ELSE '待规划'
END
WHERE pl.delete_flag_ = 0;

INSERT INTO t_product_line_version (
  id_,
  tenant_id_,
  product_line_id_,
  code_,
  name_,
  start_date_,
  end_date_,
  status_,
  linked_requirement_ids_,
  create_by_,
  update_by_,
  create_time_,
  update_time_,
  delete_flag_
)
SELECT
  UUID(),
  pl.tenant_id_,
  pl.id_,
  'V1.0.5',
  'V1.0.5',
  '2026-09-20',
  '2026-09-20',
  '已发布',
  JSON_ARRAY(),
  pl.create_by_,
  pl.update_by_,
  NOW(),
  NOW(),
  0
FROM t_product_line pl
WHERE pl.name_ = '师创指砺知堂'
  AND pl.delete_flag_ = 0
  AND NOT EXISTS (
    SELECT 1 FROM t_product_line_version pv
    WHERE pv.product_line_id_ = pl.id_
      AND pv.code_ = 'V1.0.5'
      AND pv.delete_flag_ = 0
  )
LIMIT 1;

UPDATE t_product_line pl
SET pl.current_version_ = 'V1.0.5',
    pl.status_ = CASE WHEN pl.status_ IN ('已归档', '已停用') THEN pl.status_ ELSE '迭代中' END,
    pl.update_time_ = NOW()
WHERE pl.name_ = '师创指砺知堂'
  AND pl.delete_flag_ = 0
  AND EXISTS (
    SELECT 1 FROM t_product_line_version pv
    WHERE pv.product_line_id_ = pl.id_
      AND pv.code_ = 'V1.0.5'
      AND pv.delete_flag_ = 0
  );

-- 修复师创砺知堂线上版本演示数据。V20260929.2 使用了不一致的产品名称，已执行迁移不可原地修改。

INSERT INTO t_product_line_version (
  id_, tenant_id_, product_line_id_, code_, name_, start_date_, end_date_, release_time_, status_,
  linked_requirement_ids_, create_by_, update_by_, create_time_, update_time_, delete_flag_
)
SELECT
  UUID(), pl.tenant_id_, pl.id_, 'V1.0.5', 'V1.0.5', '2026-09-20', '2026-09-20', '2026-09-20 00:00:00', '已发布',
  JSON_ARRAY(), pl.create_by_, pl.update_by_, NOW(), NOW(), 0
FROM t_product_line pl
WHERE pl.name_ IN ('师创砺知堂', '师创指砺知堂')
  AND pl.delete_flag_ = 0
  AND NOT EXISTS (
    SELECT 1
    FROM t_product_line_version pv
    WHERE pv.product_line_id_ = pl.id_
      AND pv.code_ = 'V1.0.5'
      AND pv.delete_flag_ = 0
  );

UPDATE t_product_line_version pv
JOIN t_product_line pl ON pl.id_ = pv.product_line_id_
SET pv.name_ = 'V1.0.5',
    pv.start_date_ = '2026-09-20',
    pv.end_date_ = '2026-09-20',
    pv.release_time_ = '2026-09-20 00:00:00',
    pv.status_ = '已发布',
    pv.update_time_ = NOW()
WHERE pl.name_ IN ('师创砺知堂', '师创指砺知堂')
  AND pl.delete_flag_ = 0
  AND pv.code_ = 'V1.0.5'
  AND pv.delete_flag_ = 0;


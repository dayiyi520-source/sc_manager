SET @schema_name = DATABASE();

UPDATE t_product_line_member duplicate_member
JOIN t_product_line_member retained_member
  ON retained_member.tenant_id_ = duplicate_member.tenant_id_
  AND retained_member.product_line_id_ = duplicate_member.product_line_id_
  AND COALESCE(NULLIF(retained_member.user_id_, ''), CONCAT('name:', retained_member.member_name_)) = COALESCE(NULLIF(duplicate_member.user_id_, ''), CONCAT('name:', duplicate_member.member_name_))
  AND retained_member.delete_flag_ = 0
  AND duplicate_member.delete_flag_ = 0
  AND retained_member.id_ < duplicate_member.id_
SET duplicate_member.delete_flag_ = 1,
    duplicate_member.update_time_ = NOW();

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 't_product_line_member' AND column_name = 'active_member_key_') = 0,
  'ALTER TABLE t_product_line_member ADD COLUMN active_member_key_ VARCHAR(384) GENERATED ALWAYS AS (CASE WHEN delete_flag_ = 0 THEN COALESCE(NULLIF(user_id_, ''''), CONCAT(''name:'', member_name_)) ELSE CONCAT(''deleted:'', id_) END) STORED',
  'SELECT 1'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @schema_name AND table_name = 't_product_line_member' AND index_name = 'uk_product_line_active_member') = 0,
  'ALTER TABLE t_product_line_member ADD UNIQUE KEY uk_product_line_active_member (tenant_id_, product_line_id_, active_member_key_)',
  'SELECT 1'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

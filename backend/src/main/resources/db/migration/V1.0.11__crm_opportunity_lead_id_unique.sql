SET @schema_name = DATABASE();
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 't_crm_opportunity'
      AND index_name = 'uk_opportunity_tenant_lead') = 0,
  'ALTER TABLE t_crm_opportunity ADD UNIQUE KEY uk_opportunity_tenant_lead (tenant_id_, lead_id_)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

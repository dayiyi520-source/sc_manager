ALTER TABLE t_product_work_item ADD COLUMN expected_complete_date_ DATE NULL AFTER planned_end_date_;

-- Preserve the date previously displayed as expected completion for historical records.
UPDATE t_product_work_item SET expected_complete_date_=planned_end_date_ WHERE planned_end_date_ IS NOT NULL;

-- Rebind local assistance demo tasks to active team members by business type.
-- Missing members are intentionally skipped; this migration must not create fake employees.
UPDATE t_product_work_item w
JOIN t_sys_user u ON u.tenant_id_ = w.tenant_id_ AND u.name_ = CASE w.work_order_type_
  WHEN '客户诉求' THEN '范恒宾'
  WHEN '线上问题' THEN '陈宇璋'
  WHEN '售前支持' THEN '研发主管（测试）'
  WHEN '交付支持' THEN '刘震剑'
  WHEN '其他问题' THEN '毛景强'
END AND u.status_ = 'enabled' AND u.delete_flag_ = 0
SET w.assignee_id_ = u.id_,
    w.assignee_name_ = u.name_,
    w.assistance_owner_id_ = u.id_,
    w.update_by_ = 'system-assistance-reassignment',
    w.update_time_ = NOW(6),
    w.version_ = w.version_ + 1
WHERE w.tenant_id_ = 'local-tenant'
  AND w.source_type_ = 'WORK_ORDER'
  AND w.request_id_ LIKE 'local-assistance-20260922-%'
  AND w.delete_flag_ = 0;

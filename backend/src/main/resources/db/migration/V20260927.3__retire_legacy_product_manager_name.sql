-- Product-domain member names must come from the team directory. Keep the
-- existing user id because OKR and historical records still reference it.
UPDATE t_sys_user
SET name_ = '陈宇璋',
    update_by_ = 'system-product-member-migration',
    update_time_ = NOW(6)
WHERE tenant_id_ = 'local-tenant'
  AND id_ = 'user-product'
  AND name_ = '张瑞'
  AND delete_flag_ = 0;

UPDATE t_product_line_member
SET member_name_ = '陈宇璋',
    update_by_ = 'system-product-member-migration',
    update_time_ = NOW(6)
WHERE tenant_id_ = 'local-tenant'
  AND user_id_ = 'user-product'
  AND delete_flag_ = 0;

UPDATE t_product_line
SET owner_name_ = CASE WHEN owner_user_id_ = 'user-product' THEN '陈宇璋' ELSE owner_name_ END,
    requirement_owner_ = CASE WHEN requirement_owner_user_id_ = 'user-product' THEN '陈宇璋' ELSE requirement_owner_ END,
    tech_owner_ = CASE WHEN tech_owner_user_id_ = 'user-product' THEN '陈宇璋' ELSE tech_owner_ END,
    test_owner_ = CASE WHEN test_owner_user_id_ = 'user-product' THEN '陈宇璋' ELSE test_owner_ END,
    update_by_ = 'system-product-member-migration',
    update_time_ = NOW(6)
WHERE tenant_id_ = 'local-tenant'
  AND delete_flag_ = 0
  AND (owner_user_id_ = 'user-product' OR requirement_owner_user_id_ = 'user-product'
       OR tech_owner_user_id_ = 'user-product' OR test_owner_user_id_ = 'user-product');

UPDATE t_product_work_item
SET assignee_name_ = '陈宇璋',
    update_by_ = 'system-product-member-migration',
    update_time_ = NOW(6)
WHERE tenant_id_ = 'local-tenant'
  AND assignee_id_ = 'user-product'
  AND delete_flag_ = 0;

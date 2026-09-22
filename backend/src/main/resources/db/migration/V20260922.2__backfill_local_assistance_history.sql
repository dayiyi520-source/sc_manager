-- Backfill local acceptance history and leave one item ready for initiator closure.
INSERT INTO t_product_work_item_activity
  (id_, tenant_id_, product_line_id_, subject_id_, event_type_, content_, create_by_, create_time_)
SELECT UUID(), w.tenant_id_, w.product_line_id_, w.id_, '创建事项',
       JSON_OBJECT('fromStatus', '', 'toStatus', '待处理', 'reason', '协助事项已创建'),
       COALESCE(w.create_by_, 'user-admin'), w.create_time_
FROM t_product_work_item w
WHERE w.tenant_id_ = 'local-tenant'
  AND w.category_ = 'requirement'
  AND w.source_type_ = 'WORK_ORDER'
  AND w.request_id_ LIKE 'local-assistance-20260922-%'
  AND w.delete_flag_ = 0
  AND NOT EXISTS (
    SELECT 1 FROM t_product_work_item_activity a
    WHERE a.tenant_id_ = w.tenant_id_ AND a.subject_id_ = w.id_
      AND a.event_type_ = '创建事项'
  );

INSERT INTO t_product_work_item_activity
  (id_, tenant_id_, product_line_id_, subject_id_, event_type_, content_, create_by_, create_time_)
SELECT UUID(), w.tenant_id_, w.product_line_id_, w.id_, '受理事项',
       JSON_OBJECT('fromStatus', '待处理', 'toStatus', '处理中', 'reason', '负责人已受理协助事项'),
       COALESCE(w.assignee_id_, 'user-product'), DATE_ADD(w.create_time_, INTERVAL 1 MINUTE)
FROM t_product_work_item w
WHERE w.tenant_id_ = 'local-tenant'
  AND w.category_ = 'requirement'
  AND w.source_type_ = 'WORK_ORDER'
  AND w.request_id_ LIKE 'local-assistance-20260922-%'
  AND w.delete_flag_ = 0
  AND w.status_name_ <> '待处理'
  AND NOT EXISTS (
    SELECT 1 FROM t_product_work_item_activity a
    WHERE a.tenant_id_ = w.tenant_id_ AND a.subject_id_ = w.id_
      AND a.event_type_ = '受理事项'
  );

INSERT INTO t_product_work_item_activity
  (id_, tenant_id_, product_line_id_, subject_id_, event_type_, content_, create_by_, create_time_)
SELECT UUID(), w.tenant_id_, w.product_line_id_, w.id_, '完成反馈',
       JSON_OBJECT('fromStatus', '处理中', 'toStatus', '待验收', 'reason', '处理结果已反馈，等待发起人验收'),
       COALESCE(w.assignee_id_, 'user-product'), DATE_ADD(w.create_time_, INTERVAL 2 MINUTE)
FROM t_product_work_item w
WHERE w.tenant_id_ = 'local-tenant'
  AND w.category_ = 'requirement'
  AND w.source_type_ = 'WORK_ORDER'
  AND w.request_id_ LIKE 'local-assistance-20260922-%'
  AND w.delete_flag_ = 0
  AND w.status_name_ IN ('已完成', '待负责人关闭')
  AND NOT EXISTS (
    SELECT 1 FROM t_product_work_item_activity a
    WHERE a.tenant_id_ = w.tenant_id_ AND a.subject_id_ = w.id_
      AND a.event_type_ = '完成反馈'
  );

INSERT INTO t_product_work_item_activity
  (id_, tenant_id_, product_line_id_, subject_id_, event_type_, content_, create_by_, create_time_)
SELECT UUID(), w.tenant_id_, w.product_line_id_, w.id_, '验收通过',
       JSON_OBJECT('fromStatus', '待验收', 'toStatus', CASE WHEN w.request_id_ LIKE '%customer-need-3' THEN '待负责人关闭' ELSE '已完成' END, 'reason', '发起人已确认处理结果'),
       COALESCE(w.create_by_, 'user-admin'), DATE_ADD(w.create_time_, INTERVAL 3 MINUTE)
FROM t_product_work_item w
WHERE w.tenant_id_ = 'local-tenant'
  AND w.category_ = 'requirement'
  AND w.source_type_ = 'WORK_ORDER'
  AND w.request_id_ LIKE 'local-assistance-20260922-%'
  AND w.delete_flag_ = 0
  AND w.status_name_ IN ('已完成', '待负责人关闭')
  AND NOT EXISTS (
    SELECT 1 FROM t_product_work_item_activity a
    WHERE a.tenant_id_ = w.tenant_id_ AND a.subject_id_ = w.id_
      AND a.event_type_ = '验收通过'
  );

UPDATE t_product_work_item
SET assistance_status_ = '待负责人关闭',
    status_name_ = '待负责人关闭',
    status_key_ = 'status_pending_owner_close',
    status_group_ = 'IN_PROGRESS',
    status_color_ = 'orange',
    successful_ = 1,
    version_ = version_ + 1,
    update_by_ = 'system-assistance-demo',
    update_time_ = NOW(6)
WHERE tenant_id_ = 'local-tenant'
  AND category_ = 'requirement'
  AND source_type_ = 'WORK_ORDER'
  AND request_id_ = 'local-assistance-20260922-customer-need-3'
  AND delete_flag_ = 0
  AND assistance_status_ <> '已关闭';

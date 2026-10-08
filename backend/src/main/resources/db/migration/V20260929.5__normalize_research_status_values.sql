UPDATE t_product_line_version v
LEFT JOIN t_research_status_template s
  ON s.tenant_id_=v.tenant_id_ AND s.scope_='ITERATION' AND s.delete_flag_=0
  AND s.phase_ = CASE
    WHEN v.status_ IN ('已完成','已发布') THEN '已完成'
    WHEN v.status_ IN ('进行中','迭代中','封版测试') THEN '处理中'
    WHEN v.status_ IN ('已结束','已取消') THEN '已结束'
    ELSE '待开始'
  END
SET v.status_ = COALESCE(s.name_, v.status_), v.update_time_ = NOW(6)
WHERE v.delete_flag_=0
  AND v.status_ IN ('未开始','进行中','已完成','已发布','迭代中','封版测试','已结束','已取消');

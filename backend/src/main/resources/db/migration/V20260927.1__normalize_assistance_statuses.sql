UPDATE t_product_work_item
SET assistance_status_ = CASE assistance_status_
  WHEN '待受理' THEN '待处理'
  WHEN '验收未通过' THEN '处理中'
  WHEN '待负责人关闭' THEN '待关闭'
  WHEN '已完成' THEN '已关闭'
  ELSE assistance_status_
END
WHERE category_ = 'requirement'
  AND assistance_status_ IN ('待受理', '验收未通过', '待负责人关闭', '已完成');

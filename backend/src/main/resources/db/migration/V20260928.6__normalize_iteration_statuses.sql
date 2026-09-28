UPDATE t_product_line_version
SET status_ = CASE
  WHEN status_ IN ('已完成', '已发布') THEN '已完成'
  WHEN status_ IN ('进行中', '迭代中', '封版测试') THEN '进行中'
  ELSE '未开始'
END,
update_time_ = NOW(6)
WHERE delete_flag_ = 0
  AND status_ NOT IN ('未开始', '进行中', '已完成');

ALTER TABLE t_product_line_version
  MODIFY COLUMN status_ VARCHAR(16) NOT NULL DEFAULT '未开始';

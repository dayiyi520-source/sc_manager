UPDATE t_product_line_member duplicate_member
JOIN t_sys_user duplicate_user
  ON duplicate_user.tenant_id_ = duplicate_member.tenant_id_
  AND duplicate_user.name_ = duplicate_member.member_name_
  AND duplicate_user.status_ = 'enabled'
  AND duplicate_user.delete_flag_ = 0
JOIN t_product_line_member retained_member
  ON retained_member.tenant_id_ = duplicate_member.tenant_id_
  AND retained_member.product_line_id_ = duplicate_member.product_line_id_
  AND retained_member.delete_flag_ = 0
  AND retained_member.id_ < duplicate_member.id_
JOIN t_sys_user retained_user
  ON retained_user.tenant_id_ = retained_member.tenant_id_
  AND retained_user.name_ = retained_member.member_name_
  AND retained_user.id_ = duplicate_user.id_
  AND retained_user.status_ = 'enabled'
  AND retained_user.delete_flag_ = 0
SET duplicate_member.delete_flag_ = 1,
    duplicate_member.update_time_ = NOW()
WHERE duplicate_member.delete_flag_ = 0;

UPDATE t_product_line_member member_record
JOIN t_sys_user user_record
  ON user_record.tenant_id_ = member_record.tenant_id_
  AND user_record.name_ = member_record.member_name_
  AND user_record.status_ = 'enabled'
  AND user_record.delete_flag_ = 0
SET member_record.user_id_ = user_record.id_,
    member_record.update_time_ = NOW()
WHERE member_record.delete_flag_ = 0
  AND (member_record.user_id_ IS NULL OR member_record.user_id_ = '');

-- Local development fixture only. Reuse the current technical role and department.
INSERT INTO t_sys_user
  (id_,tenant_id_,username_,name_,avatar_,department_,role_,role_title_,status_,create_by_,update_by_,create_time_,update_time_)
SELECT 'user-okr-supervisor',tenant_id_,'tech-supervisor','研发主管（测试）','',department_,role_,'研发主管（上下级验证）','enabled','user-admin','user-admin',NOW(),NOW()
FROM t_sys_user employee
WHERE employee.id_='user-tech' AND employee.tenant_id_='local-tenant' AND employee.delete_flag_=0
  AND NOT EXISTS (SELECT 1 FROM t_sys_user existing WHERE existing.tenant_id_=employee.tenant_id_ AND existing.username_='tech-supervisor');

INSERT INTO t_sys_user_role (id_,tenant_id_,user_id_,role_id_,create_time_)
SELECT UUID(),r.tenant_id_,'user-okr-supervisor',r.role_id_,NOW()
FROM t_sys_user_role r
WHERE r.user_id_='user-tech' AND r.tenant_id_='local-tenant'
  AND NOT EXISTS (SELECT 1 FROM t_sys_user_role existing WHERE existing.tenant_id_=r.tenant_id_ AND existing.user_id_='user-okr-supervisor' AND existing.role_id_=r.role_id_);

-- Keep the local acceptance organization as one reporting tree.
INSERT INTO t_okr_reporting
  (id_, tenant_id_, employee_id_, supervisor_id_, root_flag_, create_by_, update_by_, create_time_, update_time_, delete_flag_)
SELECT UUID(), u.tenant_id_, u.id_, CASE WHEN u.id_ = 'user-admin' THEN NULL ELSE 'user-admin' END,
       CASE WHEN u.id_ = 'user-admin' THEN 1 ELSE 0 END, 'system', 'system', NOW(6), NOW(6), 0
FROM t_sys_user u
WHERE u.tenant_id_ = 'local-tenant' AND u.delete_flag_ = 0 AND u.status_ = 'enabled'
ON DUPLICATE KEY UPDATE
  supervisor_id_ = VALUES(supervisor_id_), root_flag_ = VALUES(root_flag_),
  update_by_ = 'system', update_time_ = NOW(6), delete_flag_ = 0;

-- Department heads report directly to the single organization root.
UPDATE t_okr_reporting
SET supervisor_id_ = 'user-admin', root_flag_ = 0, update_by_ = 'system', update_time_ = NOW(6)
WHERE tenant_id_ = 'local-tenant' AND employee_id_ IN
  ('user-okr-supervisor', 'user-product', 'user-sales',
   '9a35d30f-2952-41ca-9ae0-7a2685556f7f',
   '77387263-6110-4ea7-a6db-f0c3e5c75f7d',
   '55b5604b-e203-49e3-ab90-059eb8fae9c9',
   '1629cfd2-3d41-4cc2-b415-6aa9b3ee6b31',
   '674012ec-1573-47db-9170-12190e23a036');

-- Members of a department report to that department's configured head.
UPDATE t_okr_reporting r JOIN t_sys_user u ON u.tenant_id_ = r.tenant_id_ AND u.id_ = r.employee_id_
SET r.supervisor_id_ = 'user-product', r.root_flag_ = 0, r.update_by_ = 'system', r.update_time_ = NOW(6)
WHERE r.tenant_id_ = 'local-tenant' AND u.department_ = '产品规划部' AND u.id_ <> 'user-product';
UPDATE t_okr_reporting r JOIN t_sys_user u ON u.tenant_id_ = r.tenant_id_ AND u.id_ = r.employee_id_
SET r.supervisor_id_ = 'user-sales', r.root_flag_ = 0, r.update_by_ = 'system', r.update_time_ = NOW(6)
WHERE r.tenant_id_ = 'local-tenant' AND u.department_ = '市场运营部' AND u.id_ <> 'user-sales';
UPDATE t_okr_reporting r JOIN t_sys_user u ON u.tenant_id_ = r.tenant_id_ AND u.id_ = r.employee_id_
SET r.supervisor_id_ = 'user-tech', r.root_flag_ = 0, r.update_by_ = 'system', r.update_time_ = NOW(6)
WHERE r.tenant_id_ = 'local-tenant' AND u.department_ = '软件研发部' AND u.id_ <> 'user-tech';
UPDATE t_okr_reporting r JOIN t_sys_user u ON u.tenant_id_ = r.tenant_id_ AND u.id_ = r.employee_id_
SET r.supervisor_id_ = '9a35d30f-2952-41ca-9ae0-7a2685556f7f', r.root_flag_ = 0, r.update_by_ = 'system', r.update_time_ = NOW(6)
WHERE r.tenant_id_ = 'local-tenant' AND u.department_ = '交互设计部' AND u.id_ <> '9a35d30f-2952-41ca-9ae0-7a2685556f7f';
UPDATE t_okr_reporting r JOIN t_sys_user u ON u.tenant_id_ = r.tenant_id_ AND u.id_ = r.employee_id_
SET r.supervisor_id_ = '77387263-6110-4ea7-a6db-f0c3e5c75f7d', r.root_flag_ = 0, r.update_by_ = 'system', r.update_time_ = NOW(6)
WHERE r.tenant_id_ = 'local-tenant' AND u.department_ = '售前方案部' AND u.id_ <> '77387263-6110-4ea7-a6db-f0c3e5c75f7d';
UPDATE t_okr_reporting r JOIN t_sys_user u ON u.tenant_id_ = r.tenant_id_ AND u.id_ = r.employee_id_
SET r.supervisor_id_ = '55b5604b-e203-49e3-ab90-059eb8fae9c9', r.root_flag_ = 0, r.update_by_ = 'system', r.update_time_ = NOW(6)
WHERE r.tenant_id_ = 'local-tenant' AND u.department_ = '师生服务交付中心' AND u.id_ <> '55b5604b-e203-49e3-ab90-059eb8fae9c9';
UPDATE t_okr_reporting r JOIN t_sys_user u ON u.tenant_id_ = r.tenant_id_ AND u.id_ = r.employee_id_
SET r.supervisor_id_ = '1629cfd2-3d41-4cc2-b415-6aa9b3ee6b31', r.root_flag_ = 0, r.update_by_ = 'system', r.update_time_ = NOW(6)
WHERE r.tenant_id_ = 'local-tenant' AND u.department_ = '数据应用部' AND u.id_ <> '1629cfd2-3d41-4cc2-b415-6aa9b3ee6b31';
UPDATE t_okr_reporting r JOIN t_sys_user u ON u.tenant_id_ = r.tenant_id_ AND u.id_ = r.employee_id_
SET r.supervisor_id_ = '674012ec-1573-47db-9170-12190e23a036', r.root_flag_ = 0, r.update_by_ = 'system', r.update_time_ = NOW(6)
WHERE r.tenant_id_ = 'local-tenant' AND u.department_ = '项目管理交付中心' AND u.id_ <> '674012ec-1573-47db-9170-12190e23a036';

-- Departments without a configured head remain direct children of the root.
UPDATE t_okr_reporting r JOIN t_sys_user u ON u.tenant_id_ = r.tenant_id_ AND u.id_ = r.employee_id_
SET r.supervisor_id_ = 'user-admin', r.root_flag_ = 0, r.update_by_ = 'system', r.update_time_ = NOW(6)
WHERE r.tenant_id_ = 'local-tenant' AND u.id_ <> 'user-admin'
  AND u.department_ NOT IN ('产品规划部', '市场运营部', '软件研发部', '交互设计部', '售前方案部', '师生服务交付中心', '数据应用部', '项目管理交付中心', '研发一组');

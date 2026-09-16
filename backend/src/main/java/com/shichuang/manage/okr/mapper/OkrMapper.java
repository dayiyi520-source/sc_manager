package com.shichuang.manage.okr.mapper;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class OkrMapper {
    private final JdbcTemplate jdbc;
    public OkrMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public List<Map<String,Object>> people(String tenant) {
        return jdbc.queryForList("SELECT u.id_ AS id,u.name_ AS name,u.department_ AS department,r.supervisor_id_ AS supervisorId,COALESCE(r.root_flag_,0) AS rootFlag,COALESCE(r.version_,-1) AS version FROM t_sys_user u LEFT JOIN t_okr_reporting r ON r.tenant_id_=u.tenant_id_ AND r.employee_id_=u.id_ AND r.delete_flag_=0 WHERE u.tenant_id_=? AND u.delete_flag_=0 AND u.status_='enabled' ORDER BY u.name_",tenant);
    }
    public List<Map<String,Object>> records(String tenant) {
        return jdbc.queryForList("SELECT id_ AS id,kind_ AS kind,owner_id_ AS ownerId,period_key_ AS periodKey,status_ AS status,payload_ AS payload,version_ AS version,create_time_ AS createdAt FROM t_okr_record WHERE tenant_id_=? AND delete_flag_=0 ORDER BY create_time_ DESC",tenant);
    }
    public void insert(String tenant,String id,String kind,String owner,String period,String status,String payload) {
        jdbc.update("INSERT INTO t_okr_record (id_,tenant_id_,kind_,owner_id_,period_key_,status_,payload_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))",id,tenant,kind,owner,period,status,payload,owner,owner);
    }
    public int update(String tenant,String id,int version,String status,String payload,String operator) {
        return jdbc.update("UPDATE t_okr_record SET status_=?,payload_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0",status,payload,operator,tenant,id,version);
    }
    public void event(String tenant,String id,String action,String operator,String detail) {
        jdbc.update("INSERT INTO t_okr_event (id_,tenant_id_,record_id_,action_,operator_id_,detail_,create_time_) VALUES (?,?,?,?,?,?,NOW(6))",UUID.randomUUID().toString(),tenant,id,action,operator,detail);
    }
    public List<Map<String,Object>> events(String tenant,String id) {
        return jdbc.queryForList("SELECT e.action_ AS action,u.name_ AS operator,e.detail_ AS detail,e.create_time_ AS createdAt FROM t_okr_event e LEFT JOIN t_sys_user u ON u.id_=e.operator_id_ AND u.tenant_id_=e.tenant_id_ WHERE e.tenant_id_=? AND e.record_id_=? ORDER BY e.create_time_",tenant,id);
    }
    public int reporting(String tenant,String employee,String supervisor,boolean root,int version,String operator) {
        if(version == -1) return jdbc.update("INSERT INTO t_okr_reporting (id_,tenant_id_,employee_id_,supervisor_id_,root_flag_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,NOW(6),NOW(6))",UUID.randomUUID().toString(),tenant,employee,supervisor,root,operator,operator);
        return jdbc.update("UPDATE t_okr_reporting SET supervisor_id_=?,root_flag_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND employee_id_=? AND version_=?",supervisor,root,operator,tenant,employee,version);
    }
    public void lockOrganization(String tenant) {
        jdbc.queryForList("SELECT id_ FROM t_sys_user WHERE tenant_id_=? ORDER BY id_ FOR UPDATE",tenant);
    }
    public List<Map<String,Object>> work(String tenant,String ownerName) {
        var result = new ArrayList<Map<String,Object>>();
        // Names are a legacy work-item contract. The service rejects ambiguous names.
        for (String table : List.of("t_product_requirement","t_product_design_task","t_product_dev_task","t_product_bug","t_crm_presales_task","t_project_delivery_task","t_project_ops_task")) {
            String kind = table.substring(2);
            String sources = Set.of("t_product_requirement","t_product_dev_task","t_product_bug").contains(table) ? "source_work_order_ids_" : "JSON_ARRAY(requirement_id_)";
            result.addAll(jdbc.queryForList("SELECT CONCAT(?,':',id_) AS id,id_ AS sourceId,? AS kind,title_ AS title,status_ AS status,owner_name_ AS ownerName,creator_name_ AS creatorName,actual_hours_ AS actualHours,estimated_hours_ AS estimatedHours,due_date_ AS dueDate,create_time_ AS createdAt,update_time_ AS updatedAt," + sources + " AS sourceWorkOrderIds FROM " + table + " WHERE tenant_id_=? AND owner_name_=? AND delete_flag_=0 ORDER BY update_time_ DESC",kind,kind,tenant,ownerName));
        }
        result.addAll(jdbc.queryForList("""
            SELECT CONCAT('core:',w.id_) AS id,w.id_ AS sourceId,w.category_ AS kind,w.title_ AS title,
                   w.status_name_ AS status,w.assignee_name_ AS ownerName,COALESCE(u.name_,w.create_by_) AS creatorName,w.actual_hours_ AS actualHours,
                   w.estimated_hours_ AS estimatedHours,w.planned_end_date_ AS dueDate,w.create_time_ AS createdAt,
                   w.update_time_ AS updatedAt,
                   CASE WHEN w.requirement_id_ IS NULL THEN JSON_ARRAY() ELSE JSON_ARRAY(w.requirement_id_) END AS sourceWorkOrderIds
            FROM t_product_work_item w LEFT JOIN t_sys_user u ON u.id_=w.create_by_ AND u.tenant_id_=w.tenant_id_
            WHERE w.tenant_id_=? AND w.assignee_name_=? AND w.delete_flag_=0
            ORDER BY w.update_time_ DESC
            """,tenant,ownerName));
        return result;
    }
    public List<Map<String,Object>> links(String tenant,String owner){
        return jdbc.queryForList("SELECT work_id_ AS workId,objective_id_ AS objectiveId,key_result_id_ AS keyResultId,version_ AS linkVersion FROM t_okr_work_link WHERE tenant_id_=? AND owner_id_=? AND delete_flag_=0",tenant,owner);
    }
    public int link(String tenant,String owner,String workId,String objective,String kr,int version){
        if(version==-1)return jdbc.update("INSERT INTO t_okr_work_link (id_,tenant_id_,owner_id_,work_id_,objective_id_,key_result_id_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,NOW(6),NOW(6))",UUID.randomUUID().toString(),tenant,owner,workId,objective,kr,owner,owner);
        return jdbc.update("UPDATE t_okr_work_link SET objective_id_=?,key_result_id_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND owner_id_=? AND work_id_=? AND version_=? AND delete_flag_=0",objective,kr,owner,tenant,owner,workId,version);
    }
}

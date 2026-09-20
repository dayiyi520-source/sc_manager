package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class RequirementMapper {
    private final JdbcTemplate jdbc;

    public RequirementMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    long count(String where, Object... args) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM (" + sourceSql() + ") t WHERE " + qualify(where), Long.class, args);
    }

    List<Map<String,Object>> list(String where,Object[] args,int size,int offset) {
        return jdbc.queryForList(selectSql()+" WHERE "+qualify(where)+" ORDER BY t.create_time_ DESC LIMIT ? OFFSET ?",concat(args,size,offset));
    }

    List<Map<String,Object>> listFiltered(String where,Object[] args,int size,int offset) { return list(where,args,size,offset); }

    List<Map<String,Object>> groups(String where,Object[] args,String expression) {
        return jdbc.queryForList("SELECT "+qualifyExpression(expression)+" AS label,COUNT(*) AS count FROM ("+sourceSql()+") t WHERE "+qualify(where)+" GROUP BY "+qualifyExpression(expression)+" ORDER BY count DESC,label",args);
    }

    List<Map<String,Object>> departments(String tenantId) {
        return jdbc.queryForList("SELECT department_ AS id,department_ AS name,MAX(CASE WHEN role_ IN ('admin','product_manager','tech_lead','sales_director') THEN name_ ELSE '' END) AS managerName FROM t_sys_user WHERE tenant_id_=? AND status_='enabled' AND delete_flag_=0 GROUP BY department_ ORDER BY department_",tenantId);
    }

    List<Map<String,Object>> find(String tenantId,String id) {
        return jdbc.queryForList(selectSql()+" WHERE t.id_=? AND t.tenant_id_=? AND t.category_='requirement' AND t.delete_flag_=0",id,tenantId);
    }

    List<Map<String,Object>> events(String tenantId,String id) { return events(tenantId,id,"",""); }

    List<Map<String,Object>> events(String tenantId,String id,String eventType,String operatorName) {
        return jdbc.queryForList("""
            SELECT a.id_ AS id,a.event_type_ AS eventType,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.fromStatus')),JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.from')),'') AS fromStatus,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.toStatus')),JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.to')),'') AS toStatus,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.reason')),JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.content')),'') AS reason,
              COALESCE(u.name_,a.create_by_) AS operatorName,a.content_ AS metadata,a.create_time_ AS createdAt
            FROM t_product_work_item_activity a LEFT JOIN t_sys_user u ON u.id_=a.create_by_ AND u.tenant_id_=a.tenant_id_
            WHERE a.subject_id_=? AND a.tenant_id_=? AND (?='' OR a.event_type_=?) AND (?='' OR COALESCE(u.name_,a.create_by_)=?) ORDER BY a.create_time_
            """,id,tenantId,eventType,eventType,operatorName,operatorName);
    }

    long auditCount(String tenantId,String requirementId,String eventType,String operatorName,LocalDateTime from,LocalDateTime to) {
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM t_product_work_item_activity a JOIN t_product_work_item w ON w.id_=a.subject_id_ AND w.tenant_id_=a.tenant_id_ AND w.category_='requirement' AND w.delete_flag_=0
            LEFT JOIN t_sys_user u ON u.id_=a.create_by_ AND u.tenant_id_=a.tenant_id_
            WHERE a.tenant_id_=? AND (?='' OR a.subject_id_=?) AND (?='' OR a.event_type_=?) AND (?='' OR COALESCE(u.name_,a.create_by_)=?) AND (? IS NULL OR a.create_time_>=?) AND (? IS NULL OR a.create_time_<?)
            """,Long.class,tenantId,requirementId,requirementId,eventType,eventType,operatorName,operatorName,from,from,to,to);
    }

    List<Map<String,Object>> auditEvents(String tenantId,String requirementId,String eventType,String operatorName,LocalDateTime from,LocalDateTime to,int size,int offset) {
        return jdbc.queryForList("""
            SELECT a.id_ AS id,a.subject_id_ AS requirementId,w.code_ AS requirementCode,w.title_ AS requirementTitle,a.event_type_ AS eventType,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.fromStatus')),JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.from')),'') AS fromStatus,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.toStatus')),JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.to')),'') AS toStatus,
              COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.reason')),JSON_UNQUOTE(JSON_EXTRACT(a.content_,'$.content')),'') AS reason,
              COALESCE(u.name_,a.create_by_) AS operatorName,a.content_ AS metadata,a.create_time_ AS createdAt
            FROM t_product_work_item_activity a JOIN t_product_work_item w ON w.id_=a.subject_id_ AND w.tenant_id_=a.tenant_id_ AND w.category_='requirement' AND w.delete_flag_=0
            LEFT JOIN t_sys_user u ON u.id_=a.create_by_ AND u.tenant_id_=a.tenant_id_
            WHERE a.tenant_id_=? AND (?='' OR a.subject_id_=?) AND (?='' OR a.event_type_=?) AND (?='' OR COALESCE(u.name_,a.create_by_)=?) AND (? IS NULL OR a.create_time_>=?) AND (? IS NULL OR a.create_time_<?)
            ORDER BY a.create_time_ DESC LIMIT ? OFFSET ?
            """,tenantId,requirementId,requirementId,eventType,eventType,operatorName,operatorName,from,from,to,to,size,offset);
    }

    List<Map<String,Object>> workItems(String tenantId,String id) {
        return jdbc.queryForList(workItemSql()+" AND w.requirement_id_=? ORDER BY w.create_time_ DESC",tenantId,id);
    }

    List<Map<String,Object>> workOrderCandidates(String tenantId,String keyword,String type,String requirementId,int limit) {
        String like="%"+keyword+"%";
        return jdbc.queryForList("""
            SELECT w.id_ AS id,CASE WHEN w.category_='bug' THEN 'bug' WHEN w.category_='requirement' THEN 'requirement' ELSE 'task' END AS type,
              CASE w.category_ WHEN 'requirement' THEN '需求' WHEN 'bug' THEN '缺陷' WHEN 'design' THEN '设计任务' WHEN 'dev' THEN '研发任务' ELSE '测试任务' END AS typeLabel,
              w.title_ AS title,w.code_ AS code,w.assignee_name_ AS ownerName,p.name_ AS productLineName,w.status_name_ AS status,w.description_ AS summary
            FROM t_product_work_item w JOIN t_product_line p ON p.id_=w.product_line_id_ AND p.tenant_id_=w.tenant_id_ AND p.delete_flag_=0
            WHERE w.tenant_id_=? AND w.delete_flag_=0 AND w.id_<>? AND (?='' OR (?='requirement' AND w.category_='requirement') OR (?='bug' AND w.category_='bug') OR (?='task' AND w.category_ IN ('design','dev','test')))
              AND (w.title_ LIKE ? OR w.code_ LIKE ? OR w.assignee_name_ LIKE ?) ORDER BY w.title_ LIMIT ?
            """,tenantId,requirementId,type,type,type,type,like,like,like,limit);
    }

    int customerExists(String tenantId,String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_customer WHERE id_=? AND tenant_id_=? AND delete_flag_=0",Integer.class,id,tenantId);
    }

    void notifyOwner(String tenantId,String owner,String title,String id) {
        jdbc.update("INSERT INTO t_sys_notification(id_,tenant_id_,recipient_name_,title_,content_,related_type_,related_id_,create_time_) VALUES(?,?,?,?,?,?,?,NOW())",UUID.randomUUID().toString(),tenantId,owner,"新需求提醒","需求【"+title+"】已提交，请及时处理","requirement",id);
    }

    int activeWorkItems(String tenantId,String id) {
        Number count=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE requirement_id_=? AND tenant_id_=? AND delete_flag_=0 AND status_group_ NOT IN ('COMPLETED','CANCELLED')",Number.class,id,tenantId);
        return count==null?0:count.intValue();
    }

    int reassign(String tenantId,String id,int revision,String assigneeId,String assigneeName,String user) {
        return jdbc.update("UPDATE t_product_work_item SET assignee_id_=?,assignee_name_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND category_='requirement' AND version_=? AND delete_flag_=0",assigneeId,assigneeName,user,tenantId,id,revision);
    }

    void markWorkOrder(String tenantId,String id,String taskType,String requirementId,String sourceTitle,String note,String user) {
        jdbc.update("UPDATE t_product_work_item child JOIN t_product_work_item source ON source.id_=? AND source.tenant_id_=child.tenant_id_ AND source.category_='requirement' AND source.delete_flag_=0 SET child.source_type_='WORK_ORDER',child.work_order_type_=?,child.source_work_order_ids_=JSON_ARRAY(?),child.source_work_order_titles_=JSON_ARRAY(?),child.special_fields_=JSON_OBJECT('note',?),child.customer_id_=source.customer_id_,child.customer_name_=source.customer_name_,child.update_by_=?,child.update_time_=NOW(6) WHERE child.tenant_id_=? AND child.id_=? AND child.delete_flag_=0",requirementId,taskType,requirementId,sourceTitle,note,user,tenantId,id);
    }

    void event(String tenantId,String requirementId,String type,String from,String to,String reason,String operatorName,String operatorId,String metadata) {
        jdbc.update("""
            INSERT INTO t_product_work_item_activity(id_,tenant_id_,product_line_id_,subject_id_,event_type_,content_,create_by_,create_time_)
            SELECT ?,w.tenant_id_,w.product_line_id_,w.id_,?,JSON_MERGE_PATCH(COALESCE(CAST(? AS JSON),JSON_OBJECT()),JSON_OBJECT('fromStatus',?,'toStatus',?,'reason',?,'operatorName',?)),?,NOW(6)
            FROM t_product_work_item w WHERE w.id_=? AND w.tenant_id_=? AND w.category_='requirement' AND w.delete_flag_=0
            """,UUID.randomUUID().toString(),type,metadata,from,to,reason,operatorName,operatorId,requirementId,tenantId);
    }

    static String selectSql() {
        return "SELECT t.id_ AS id,t.code_ AS code,t.title_ AS title,t.description_ AS description,t.description_html_ AS descriptionHtml,t.expected_goal_ AS expectedGoal,t.status_ AS status,t.priority_ AS priority,t.owner_name_ AS ownerName,t.creator_name_ AS creatorName,t.department_ AS department,t.version_id_ AS versionId,t.version_name_ AS versionName,t.product_line_id_ AS productLineId,t.product_line_name_ AS productLineName,t.customer_id_ AS customerId,t.customer_name_ AS customerName,t.estimated_hours_ AS estimatedHours,t.actual_hours_ AS actualHours,t.due_date_ AS dueDate,t.requirement_type_ AS requirementType,t.cc_names_ AS ccNames,t.planned_start_date_ AS plannedStartDate,t.due_date_ AS expectedCompleteDate,t.source_work_order_ids_ AS sourceWorkOrderIds,t.source_work_order_titles_ AS sourceWorkOrderTitles,t.media_ AS media,t.work_order_type_ AS workOrderType,t.special_fields_ AS specialFields,'requirement' AS workItemKind,t.task_type_id_ AS workItemTypeId,t.create_time_ AS createdAt,t.version_ AS version,t.version_ AS revision FROM ("+sourceSql()+") t";
    }

    static String workItemSql() {
        return "SELECT w.id_ AS id,w.requirement_id_ AS requirementId,r.code_ AS requirementCode,r.title_ AS requirementTitle,w.work_order_type_ AS taskType,w.title_ AS title,w.assignee_name_ AS assigneeName,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(w.special_fields_,'$.note')),'') AS note,w.status_name_ AS status,'SUCCESS' AS syncStatus,0 AS retryCount,NULL AS lastError,NULL AS nextRetryAt,w.update_time_ AS lastSyncAt,w.create_time_ AS createdAt FROM t_product_work_item w JOIN t_product_work_item r ON r.id_=w.requirement_id_ AND r.tenant_id_=w.tenant_id_ AND r.category_='requirement' AND r.delete_flag_=0 WHERE w.tenant_id_=? AND w.delete_flag_=0 AND w.source_type_='WORK_ORDER'";
    }

    private static String sourceSql() {
        return "SELECT w.id_,w.tenant_id_,w.product_line_id_,w.category_,w.task_type_id_,w.code_,w.title_,w.description_,w.description_html_,w.expected_goal_,w.version_id_,w.status_name_ AS status_,w.assignee_name_ AS owner_name_,COALESCE(w.creator_name_,cu.name_,w.create_by_) AS creator_name_,w.department_,w.customer_id_,w.customer_name_,w.requirement_type_,w.cc_names_,w.media_,w.source_work_order_ids_,w.source_work_order_titles_,w.work_order_type_,w.special_fields_,w.priority_,w.planned_start_date_,w.planned_end_date_ AS due_date_,w.estimated_hours_,w.actual_hours_,w.create_time_,w.version_,w.delete_flag_,p.name_ AS product_line_name_,COALESCE(v.name_,'') AS version_name_ FROM t_product_work_item w JOIN t_product_line p ON p.id_=w.product_line_id_ AND p.tenant_id_=w.tenant_id_ AND p.delete_flag_=0 LEFT JOIN t_product_line_version v ON v.id_=w.version_id_ AND v.tenant_id_=w.tenant_id_ AND v.delete_flag_=0 LEFT JOIN t_sys_user cu ON cu.id_=w.create_by_ AND cu.tenant_id_=w.tenant_id_";
    }

    private static String qualify(String sql) {
        return sql.replace("tenant_id_","t.tenant_id_").replace("delete_flag_","t.delete_flag_").replace("work_item_kind_","category_").replace("owner_name_","t.owner_name_").replace("product_line_name_","t.product_line_name_").replace("department_","t.department_").replace("priority_","t.priority_").replace("status_","t.status_").replace("title_","t.title_").replace("description_","t.description_").replace("creator_name_","t.creator_name_").replace("customer_name_","t.customer_name_").replace("version_name_","t.version_name_").replace("create_time_","t.create_time_").replace("planned_start_date_","t.planned_start_date_").replace("cc_names_","t.cc_names_");
    }

    private static String qualifyExpression(String value) { return qualify(value); }
    static Object[] concat(Object[] first,Object...second){Object[] result=Arrays.copyOf(first,first.length+second.length);System.arraycopy(second,0,result,first.length,second.length);return result;}
}

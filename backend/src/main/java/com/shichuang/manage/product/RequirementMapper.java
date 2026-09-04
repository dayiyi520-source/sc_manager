package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.time.LocalDateTime;

@Repository
public class RequirementMapper {
    private final JdbcTemplate jdbc;

    public RequirementMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    long count(String where, Object... args) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_product_requirement WHERE " + where, Long.class, args);
    }

    List<Map<String, Object>> list(String where, Object[] args, int size, int offset) {
        return jdbc.queryForList(selectSql() + " FROM t_product_requirement WHERE " + where + " ORDER BY create_time_ DESC LIMIT ? OFFSET ?", concat(args, size, offset));
    }

    List<Map<String, Object>> departments(String tenantId) {
        return jdbc.queryForList("SELECT department_ AS id, department_ AS name, MAX(CASE WHEN role_ IN ('admin','product_manager','tech_lead','sales_director') THEN name_ ELSE '' END) AS managerName FROM t_sys_user WHERE tenant_id_=? AND status_='enabled' AND delete_flag_=0 GROUP BY department_ ORDER BY department_", tenantId);
    }

    String employeeDepartment(String tenantId, String name) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT department_ FROM t_sys_user WHERE tenant_id_=? AND name_=? AND status_='enabled' AND delete_flag_=0 LIMIT 1", tenantId, name);
        return rows.isEmpty() ? "" : String.valueOf(rows.get(0).get("department_"));
    }

    List<Map<String, Object>> find(String tenantId, String id) {
        return jdbc.queryForList(selectSql() + " FROM t_product_requirement WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, tenantId);
    }

    List<Map<String, Object>> events(String tenantId, String id) {
        return events(tenantId, id, "", "");
    }

    List<Map<String, Object>> events(String tenantId, String id, String eventType, String operatorName) {
        return jdbc.queryForList("SELECT id_ AS id,event_type_ AS eventType,from_status_ AS fromStatus,to_status_ AS toStatus,reason_ AS reason,operator_name_ AS operatorName,metadata_ AS metadata,create_time_ AS createdAt FROM t_product_requirement_event WHERE requirement_id_=? AND tenant_id_=? AND (?='' OR event_type_=?) AND (?='' OR operator_name_=?) ORDER BY create_time_ ASC", id, tenantId, eventType, eventType, operatorName, operatorName);
    }

    long auditCount(String tenantId, String requirementId, String eventType, String operatorName, LocalDateTime from, LocalDateTime to) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_product_requirement_event e JOIN t_product_requirement r ON r.id_=e.requirement_id_ AND r.tenant_id_=e.tenant_id_ AND r.delete_flag_=0 WHERE e.tenant_id_=? AND (?='' OR e.requirement_id_=?) AND (?='' OR e.event_type_=?) AND (?='' OR e.operator_name_=?) AND (? IS NULL OR e.create_time_>=?) AND (? IS NULL OR e.create_time_<?)", Long.class, tenantId, requirementId, requirementId, eventType, eventType, operatorName, operatorName, from, from, to, to);
    }

    List<Map<String, Object>> auditEvents(String tenantId, String requirementId, String eventType, String operatorName, LocalDateTime from, LocalDateTime to, int size, int offset) {
        return jdbc.queryForList("SELECT e.id_ AS id,e.requirement_id_ AS requirementId,r.code_ AS requirementCode,r.title_ AS requirementTitle,e.event_type_ AS eventType,e.from_status_ AS fromStatus,e.to_status_ AS toStatus,e.reason_ AS reason,e.operator_name_ AS operatorName,e.metadata_ AS metadata,e.create_time_ AS createdAt FROM t_product_requirement_event e JOIN t_product_requirement r ON r.id_=e.requirement_id_ AND r.tenant_id_=e.tenant_id_ AND r.delete_flag_=0 WHERE e.tenant_id_=? AND (?='' OR e.requirement_id_=?) AND (?='' OR e.event_type_=?) AND (?='' OR e.operator_name_=?) AND (? IS NULL OR e.create_time_>=?) AND (? IS NULL OR e.create_time_<?) ORDER BY e.create_time_ DESC LIMIT ? OFFSET ?", tenantId, requirementId, requirementId, eventType, eventType, operatorName, operatorName, from, from, to, to, size, offset);
    }

    List<Map<String, Object>> workItems(String tenantId, String id) {
        return jdbc.queryForList(workItemSql() + " AND w.requirement_id_=? ORDER BY w.create_time_ DESC", tenantId, id);
    }

    int customerExists(String tenantId, String id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_customer WHERE id_=? AND tenant_id_=? AND delete_flag_=0", Integer.class, id, tenantId);
    }

    int nextCode(String tenantId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM t_product_requirement WHERE tenant_id_=?", Integer.class, tenantId);
        return (count == null ? 0 : count) + 1;
    }

    String manager(String tenantId, String department) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT name_ FROM t_sys_user WHERE tenant_id_=? AND department_=? AND status_='enabled' AND delete_flag_=0 ORDER BY CASE WHEN role_ IN ('admin','product_manager','tech_lead','sales_director') THEN 0 ELSE 1 END, create_time_ LIMIT 1", tenantId, department);
        return rows.isEmpty() ? "" : String.valueOf(rows.get(0).get("name_"));
    }

    void notifyOwner(String tenantId, String owner, String title, String id) {
        jdbc.update("INSERT INTO t_sys_notification (id_,tenant_id_,recipient_name_,title_,content_,related_type_,related_id_,create_time_) VALUES (?,?,?,?,?,?,?,NOW())", UUID.randomUUID().toString(), tenantId, owner, "新需求提醒", "需求【" + title + "】已提交，请及时处理", "requirement", id);
    }

    void insert(String tenantId, String id, String code, Map<String, Object> body, String creator, String operatorId, String due, String media) {
        jdbc.update("INSERT INTO t_product_requirement (id_,tenant_id_,code_,title_,description_,description_html_,expected_goal_,status_,priority_,owner_name_,creator_name_,department_,version_id_,version_name_,product_line_id_,product_line_name_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,media_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,NOW(),NOW())", id, tenantId, code, body.get("title"), text(body, "description"), text(body, "descriptionHtml"), text(body, "expectedGoal"), "待处理", defaultText(body, "priority", "P1-高优"), text(body, "ownerName"), creator, text(body, "department"), "", "", text(body, "productLineId"), text(body, "productLineName"), text(body, "customerId"), text(body, "customerName"), number(body.get("estimatedHours")), number(body.get("actualHours")), due, media, operatorId, operatorId);
    }

    int update(String tenantId, String operatorId, String id, Map<String, Object> body, String media) {
        return jdbc.update("UPDATE t_product_requirement SET title_=COALESCE(?,title_),description_=COALESCE(?,description_),description_html_=COALESCE(?,description_html_),media_=COALESCE(CAST(? AS JSON),media_),priority_=COALESCE(?,priority_),department_=COALESCE(?,department_),product_line_name_=COALESCE(?,product_line_name_),customer_id_=COALESCE(?,customer_id_),customer_name_=COALESCE(?,customer_name_),update_by_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND version_=COALESCE(?,version_)", nullable(body, "title"), nullable(body, "description"), nullable(body, "descriptionHtml"), media, nullable(body, "priority"), nullable(body, "department"), nullable(body, "productLineName"), nullable(body, "customerId"), nullable(body, "customerName"), operatorId, id, tenantId, body.get("version"));
    }

    Map<String, Object> lock(String tenantId, String id) {
        List<Map<String, Object>> rows = jdbc.queryForList(selectSql() + " FROM t_product_requirement WHERE id_=? AND tenant_id_=? AND delete_flag_=0 FOR UPDATE", id, tenantId);
        if (rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "需求不存在");
        return rows.get(0);
    }

    int transition(String tenantId, String operatorId, String id, String from, String to) {
        return jdbc.update("UPDATE t_product_requirement SET status_=?,update_by_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND status_=?", to, operatorId, id, tenantId, from);
    }

    int assignWorkItem(String tenantId, String operatorId, String id, String from, String type, String workId, String assignee, String note) {
        return jdbc.update("UPDATE t_product_requirement SET status_='处理中',task_type_=?,task_id_=?,assigned_owner_name_=?,assigned_note_=?,owner_name_=?,update_by_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND status_=?", type, workId, assignee, note, assignee, operatorId, id, tenantId, from);
    }

    int activeWorkItems(String tenantId, String id) {
        Number count = jdbc.queryForObject("SELECT COUNT(*) FROM t_requirement_work_item WHERE requirement_id_=? AND tenant_id_=? AND delete_flag_=0 AND status_ NOT IN ('已完成','已取消')", Number.class, id, tenantId);
        return count == null ? 0 : count.intValue();
    }

    void insertWorkItem(String tenantId, String id, String requirementId, String type, String title, String assignee, String note, String operatorId) {
        jdbc.update("INSERT INTO t_requirement_work_item (id_,tenant_id_,requirement_id_,task_type_,title_,assignee_name_,note_,status_,sync_status_,retry_count_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,'待处理','PENDING',0,?,?,NOW(),NOW())", id, tenantId, requirementId, type, title, assignee, note, operatorId, operatorId);
    }

    void event(String tenantId, String requirementId, String type, String from, String to, String reason, String operatorName, String operatorId, String metadata) {
        jdbc.update("INSERT INTO t_product_requirement_event (id_,tenant_id_,requirement_id_,event_type_,from_status_,to_status_,reason_,operator_name_,metadata_,create_by_,update_by_,create_time_) VALUES (?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,NOW(6))", UUID.randomUUID().toString(), tenantId, requirementId, type, from, to, reason, operatorName, metadata, operatorId, operatorId);
    }

    static String selectSql() {
        return "SELECT id_ AS id,code_ AS code,title_ AS title,description_ AS description,description_html_ AS descriptionHtml,expected_goal_ AS expectedGoal,status_ AS status,priority_ AS priority,owner_name_ AS ownerName,creator_name_ AS creatorName,department_ AS department,product_line_id_ AS productLineId,product_line_name_ AS productLineName,customer_id_ AS customerId,customer_name_ AS customerName,estimated_hours_ AS estimatedHours,actual_hours_ AS actualHours,due_date_ AS dueDate,media_ AS media,task_type_ AS taskType,task_id_ AS taskId,assigned_owner_name_ AS assignedOwnerName,assigned_note_ AS assignedNote,create_time_ AS createdAt,version_ AS version";
    }

    static String workItemSql() {
        return "SELECT w.id_ AS id,w.requirement_id_ AS requirementId,r.code_ AS requirementCode,r.title_ AS requirementTitle,w.task_type_ AS taskType,w.title_ AS title,w.assignee_name_ AS assigneeName,w.note_ AS note,w.status_ AS status,w.sync_status_ AS syncStatus,w.retry_count_ AS retryCount,w.last_error_ AS lastError,w.next_retry_time_ AS nextRetryAt,w.last_sync_time_ AS lastSyncAt,w.create_time_ AS createdAt FROM t_requirement_work_item w JOIN t_product_requirement r ON r.id_=w.requirement_id_ AND r.tenant_id_=w.tenant_id_ AND r.delete_flag_=0 WHERE w.tenant_id_=? AND w.delete_flag_=0";
    }

    static Object[] concat(Object[] first, Object... second) {
        Object[] result = Arrays.copyOf(first, first.length + second.length);
        System.arraycopy(second, 0, result, first.length, second.length);
        return result;
    }

    static String text(Map<String, Object> body, String key) { return Objects.toString(body.get(key), "").trim(); }
    static String defaultText(Map<String, Object> body, String key, String fallback) { String value = text(body, key); return value.isBlank() ? fallback : value; }
    static Object nullable(Map<String, Object> body, String key) { String value = text(body, key); return value.isBlank() ? null : value; }
    static Number number(Object value) { return value instanceof Number number ? number : 0; }
}

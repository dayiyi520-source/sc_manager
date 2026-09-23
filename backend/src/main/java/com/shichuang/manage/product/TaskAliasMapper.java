package com.shichuang.manage.product;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Repository
public class TaskAliasMapper {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public TaskAliasMapper(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public List<Map<String,Object>> listUnified(String category, TaskListFilter filter, int limit, int offset) {
        TaskListPredicate predicate = TaskListPredicate.build(RequestContext.tenantId(), "t", "owner_name_", filter, true);
        return jdbc.queryForList(unifiedSelect() + " WHERE " + predicate.sql() + " AND t.category_=? ORDER BY t.create_time_ DESC LIMIT ? OFFSET ?", concat(predicate.args(), category, limit, offset));
    }

    public long countUnified(String category, TaskListFilter filter) {
        TaskListPredicate predicate = TaskListPredicate.build(RequestContext.tenantId(), "t", "owner_name_", filter, true);
        return jdbc.queryForObject("SELECT COUNT(*) FROM (" + unifiedSource() + ") t WHERE " + predicate.sql() + " AND t.category_=?", Long.class, concat(predicate.args(), category));
    }

    public List<Map<String,Object>> groupsUnified(String category, TaskListFilter filter) {
        String expression = TaskListPredicate.groupExpression("t.", "owner_name_", filter.groupBy(), true);
        if (expression == null) return List.of();
        TaskListPredicate predicate = TaskListPredicate.build(RequestContext.tenantId(), "t", "owner_name_", filter.withoutGroupValue(), true);
        return jdbc.queryForList("SELECT " + expression + " AS label,COUNT(*) AS count FROM (" + unifiedSource() + ") t WHERE " + predicate.sql() + " AND t.category_=? GROUP BY " + expression + " ORDER BY count DESC,label", concat(predicate.args(), category));
    }

    public Map<String,Object> detailUnified(String category, String id) {
        List<Map<String,Object>> rows = jdbc.queryForList(unifiedSelect() + " WHERE t.id_=? AND t.tenant_id_=? AND t.category_=? AND t.delete_flag_=0", id, RequestContext.tenantId(), category);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public String defaultType(String productLineId, String category) {
        List<String> rows = jdbc.queryForList("SELECT id_ FROM t_product_line_work_item_type WHERE tenant_id_=? AND product_line_id_=? AND category_=? AND enabled_=1 AND delete_flag_=0 ORDER BY create_time_ LIMIT 1", String.class, RequestContext.tenantId(), productLineId, category);
        if (rows.isEmpty()) rows = jdbc.queryForList("SELECT id_ FROM t_product_line_work_item_type WHERE tenant_id_=? AND product_line_id_=? AND category_=? AND enabled_=1 AND delete_flag_=0 ORDER BY create_time_ LIMIT 1", String.class, RequestContext.tenantId(), productLineId, WorkItemDefinition.CATEGORIES.get(category));
        return rows.isEmpty() ? null : rows.get(0);
    }

    public String userId(String name) {
        List<String> rows = jdbc.queryForList("SELECT id_ FROM t_sys_user WHERE tenant_id_=? AND name_=? AND status_='enabled' AND delete_flag_=0 ORDER BY create_time_ LIMIT 1", String.class, RequestContext.tenantId(), name);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public String defaultProductLine() {
        List<String> rows = jdbc.queryForList("SELECT id_ FROM t_product_line WHERE tenant_id_=? AND status_='启用中' AND delete_flag_=0 ORDER BY create_time_ LIMIT 1", String.class, RequestContext.tenantId());
        if (rows.isEmpty()) rows = jdbc.queryForList("SELECT id_ FROM t_product_line WHERE tenant_id_=? AND delete_flag_=0 ORDER BY create_time_ LIMIT 1", String.class, RequestContext.tenantId());
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String,Object> activeUser(String id) {
        List<Map<String,Object>> rows=jdbc.queryForList("SELECT id_ AS id,name_ AS name FROM t_sys_user WHERE tenant_id_=? AND id_=? AND status_='enabled' AND delete_flag_=0",RequestContext.tenantId(),id);
        return rows.isEmpty()?null:rows.get(0);
    }

    public void updateExtended(String id, Map<String,Object> body) {
        jdbc.update("""
            UPDATE t_product_work_item SET description_html_=COALESCE(?,description_html_),creator_name_=COALESCE(?,creator_name_),
              department_=COALESCE(?,department_),customer_id_=COALESCE(?,customer_id_),customer_name_=COALESCE(?,customer_name_),
              requirement_type_=COALESCE(?,requirement_type_),cc_names_=COALESCE(CAST(? AS JSON),cc_names_),work_order_type_=COALESCE(?,work_order_type_),
              media_=COALESCE(CAST(? AS JSON),media_),source_work_order_ids_=COALESCE(CAST(? AS JSON),source_work_order_ids_),
              source_work_order_titles_=COALESCE(CAST(? AS JSON),source_work_order_titles_),special_fields_=COALESCE(CAST(? AS JSON),special_fields_),
              update_by_=?,update_time_=NOW(6)
            WHERE id_=? AND tenant_id_=? AND delete_flag_=0
            """, value(body,"descriptionHtml"), RequestContext.operatorName(), value(body,"department"), value(body,"customerId"), value(body,"customerName"), value(body,"requirementType"), jsonValue(body,"ccNames"), value(body,"workOrderType"), jsonValue(body,"media"), jsonValue(body,"sourceWorkOrderIds"), jsonValue(body,"sourceWorkOrderTitles"), jsonValue(body,"specialFields"), RequestContext.userId(), id, RequestContext.tenantId());
    }

    public List<Map<String,Object>> listLegacy(String table, String owner, TaskListFilter filter, int limit, int offset) {
        TaskListPredicate predicate = TaskListPredicate.build(RequestContext.tenantId(), "t", owner, filter, true);
        return jdbc.queryForList(legacySelect(table, owner) + " WHERE " + predicate.sql() + " ORDER BY t.create_time_ DESC LIMIT ? OFFSET ?", concat(predicate.args(), limit, offset));
    }

    public long countLegacy(String table, String owner, TaskListFilter filter) {
        TaskListPredicate predicate = TaskListPredicate.build(RequestContext.tenantId(), "", owner, filter, true);
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE " + predicate.sql(), Long.class, predicate.args());
    }

    public List<Map<String,Object>> groupsLegacy(String table, String owner, TaskListFilter filter) {
        String expression = TaskListPredicate.groupExpression("", owner, filter.groupBy(), true);
        if (expression == null) return List.of();
        TaskListPredicate predicate = TaskListPredicate.build(RequestContext.tenantId(), "", owner, filter.withoutGroupValue(), true);
        return jdbc.queryForList("SELECT " + expression + " AS label,COUNT(*) AS count FROM " + table + " WHERE " + predicate.sql() + " GROUP BY " + expression + " ORDER BY count DESC,label", predicate.args());
    }

    public Map<String,Object> detailLegacy(String table, String owner, String id) {
        List<Map<String,Object>> rows = jdbc.queryForList(legacySelect(table, owner) + " WHERE t.id_=? AND t.tenant_id_=? AND t.delete_flag_=0", id, RequestContext.tenantId());
        return rows.isEmpty() ? null : rows.get(0);
    }

    public int updateLegacy(String table, String id, Map<String,Object> body) {
        return jdbc.update("UPDATE " + table + " SET title_=COALESCE(?,title_),description_=COALESCE(?,description_),expected_goal_=COALESCE(?,expected_goal_),priority_=COALESCE(?,priority_),status_=COALESCE(?,status_),estimated_hours_=COALESCE(?,estimated_hours_),actual_hours_=COALESCE(?,actual_hours_),due_date_=COALESCE(?,due_date_),update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND delete_flag_=0", body.get("title"),body.get("description"),body.get("expectedGoal"),body.get("priority"),body.get("status"),body.get("estimatedHours"),body.get("actualHours"),body.get("dueDate"),RequestContext.userId(),id,RequestContext.tenantId());
    }

    public Map<String,Object> createLegacy(String type, Map<String,Object> body) {
        String title = Objects.toString(body.get("title"), "").trim();
        if (title.isBlank()) throw new IllegalArgumentException("任务标题不能为空");
        String table = TaskAliasService.table(type);
        String prefix = switch (type) { case "presales" -> "PRESALES"; case "delivery" -> "DELIVERY"; case "ops" -> "OPS"; default -> throw new IllegalArgumentException("任务类型无效"); };
        String id=UUID.randomUUID().toString(), code=prefix+"-"+System.currentTimeMillis();
        jdbc.update("INSERT INTO " + table + " (id_,tenant_id_,requirement_id_,code_,title_,description_,expected_goal_,status_,priority_,owner_name_,creator_name_,department_,version_id_,version_name_,product_line_id_,product_line_name_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,create_by_,update_by_,create_time_,update_time_,delete_flag_,version_,work_item_kind_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),0,0,?)", id,RequestContext.tenantId(),body.get("requirementId"),code,title,body.get("description"),body.get("expectedGoal"),body.getOrDefault("status","待处理"),body.getOrDefault("priority","中"),body.get("ownerName"),RequestContext.operatorName(),body.get("department"),body.get("versionId"),Objects.toString(body.get("versionName"),""),body.get("productLineId"),Objects.toString(body.get("productLineName"),""),body.get("customerId"),Objects.toString(body.get("customerName"),""),body.getOrDefault("estimatedHours",0),body.getOrDefault("actualHours",0),body.getOrDefault("dueDate",java.time.LocalDate.now().toString()),RequestContext.userId(),RequestContext.userId(),type);
        return Map.of("id",id,"code",code);
    }

    private static String unifiedSource() {
        return "SELECT w.id_,w.tenant_id_,w.product_line_id_,w.category_,w.task_type_id_,w.code_,w.title_,w.description_,w.description_html_,w.expected_goal_,w.requirement_id_,w.version_id_,w.status_name_ AS status_,w.assignee_name_ AS owner_name_,w.creator_name_,w.create_by_,w.department_,w.customer_id_,w.customer_name_,w.requirement_type_,w.cc_names_,w.media_,w.source_work_order_ids_,w.source_work_order_titles_,w.special_fields_,w.priority_,w.planned_start_date_,w.planned_end_date_ AS due_date_,w.estimated_hours_,w.actual_hours_,w.create_time_,w.version_,w.delete_flag_,p.name_ AS product_line_name_,COALESCE(v.name_,'') AS version_name_ FROM t_product_work_item w JOIN t_product_line p ON p.id_=w.product_line_id_ AND p.tenant_id_=w.tenant_id_ AND p.delete_flag_=0 LEFT JOIN t_product_line_version v ON v.id_=w.version_id_ AND v.tenant_id_=w.tenant_id_ AND v.delete_flag_=0";
    }

    private static String unifiedSelect() {
        return "SELECT t.id_ AS id,t.code_ AS code,t.requirement_id_ AS requirementId,t.title_ AS title,t.description_ AS description,t.description_html_ AS descriptionHtml,t.expected_goal_ AS expectedGoal,t.priority_ AS priority,t.product_line_id_ AS productLineId,t.product_line_name_ AS productLineName,t.version_name_ AS versionName,t.status_ AS status,t.owner_name_ AS ownerName,t.owner_name_ AS assigneeName,t.estimated_hours_ AS estimatedHours,t.actual_hours_ AS actualHours,t.due_date_ AS dueDate,t.task_type_id_ AS workItemTypeId,COALESCE(t.source_work_order_ids_,JSON_ARRAY()) AS sourceWorkOrderIds,COALESCE(t.source_work_order_titles_,JSON_ARRAY()) AS sourceWorkOrderTitles,COALESCE(t.creator_name_,t.create_by_) AS creatorName,t.department_ AS department,t.customer_id_ AS customerId,t.customer_name_ AS customerName,t.media_ AS media,t.create_time_ AS createdAt,t.version_ AS version FROM (" + unifiedSource() + ") t";
    }

    private static String legacySelect(String table,String owner) {
        return "SELECT t.id_ AS id,t.code_ AS code,t.requirement_id_ AS requirementId,t.title_ AS title,t.description_ AS description,t.expected_goal_ AS expectedGoal,t.priority_ AS priority,t.product_line_id_ AS productLineId,t.product_line_name_ AS productLineName,t.version_name_ AS versionName,t.status_ AS status,t."+owner+" AS ownerName,t."+owner+" AS assigneeName,t.estimated_hours_ AS estimatedHours,t.actual_hours_ AS actualHours,t.due_date_ AS dueDate,NULL AS workItemTypeId,CASE WHEN t.requirement_id_ IS NULL THEN JSON_ARRAY() ELSE JSON_ARRAY(t.requirement_id_) END AS sourceWorkOrderIds,JSON_ARRAY() AS sourceWorkOrderTitles,t.creator_name_ AS creatorName,t.create_time_ AS createdAt FROM " + table + " t";
    }

    private String jsonValue(Map<String,Object> body,String key) {
        if (!body.containsKey(key) || body.get(key)==null) return null;
        Object value=body.get(key);
        if (value instanceof String string) return string.isBlank()?null:string;
        try { return json.writeValueAsString(value); }
        catch (Exception error) { throw new IllegalArgumentException(key+"格式无效"); }
    }

    private static Object value(Map<String,Object> body,String key) { return body.containsKey(key) ? body.get(key) : null; }
    private static Object[] concat(Object[] first, Object... second) {
        Object[] result = Arrays.copyOf(first, first.length + second.length);
        System.arraycopy(second, 0, result, first.length, second.length);
        return result;
    }
}

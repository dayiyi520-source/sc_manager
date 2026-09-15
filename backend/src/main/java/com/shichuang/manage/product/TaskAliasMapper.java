package com.shichuang.manage.product;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class TaskAliasMapper {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public TaskAliasMapper(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }
    public List<Map<String,Object>> list(String table, String owner, TaskListFilter filter, int limit, int offset) {
        TaskListPredicate predicate = TaskListPredicate.build(RequestContext.tenantId(), "t", owner, filter, hasExtendedFields(table));
        return jdbc.queryForList(select(table, owner) + " FROM " + table + " t LEFT JOIN t_product_requirement r ON r.id_=t.requirement_id_ AND r.tenant_id_=t.tenant_id_ AND r.delete_flag_=0 WHERE " + predicate.sql() + " ORDER BY t.create_time_ DESC LIMIT ? OFFSET ?", concat(predicate.args(), limit, offset));
    }
    public long count(String table, String owner, TaskListFilter filter) {
        TaskListPredicate predicate = TaskListPredicate.build(RequestContext.tenantId(), "", owner, filter, hasExtendedFields(table));
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE " + predicate.sql(), Long.class, predicate.args());
    }
    public List<Map<String,Object>> groups(String table, String owner, TaskListFilter filter) {
        boolean extended = hasExtendedFields(table);
        String expression = TaskListPredicate.groupExpression("", owner, filter.groupBy(), extended);
        if (expression == null) return List.of();
        TaskListPredicate predicate = TaskListPredicate.build(RequestContext.tenantId(), "", owner, filter.withoutGroupValue(), extended);
        return jdbc.queryForList("SELECT " + expression + " AS label,COUNT(*) AS count FROM " + table + " WHERE " + predicate.sql() + " GROUP BY " + expression + " ORDER BY count DESC,label", predicate.args());
    }
    private static boolean hasExtendedFields(String table) {
        return !"t_product_bug".equals(table) && !"t_product_dev_task".equals(table);
    }
    private static Object[] concat(Object[] first, Object... second) {
        Object[] result = java.util.Arrays.copyOf(first, first.length + second.length);
        System.arraycopy(second, 0, result, first.length, second.length);
        return result;
    }
    public Map<String,Object> detail(String table, String owner, String id) {
        List<Map<String,Object>> rows = jdbc.queryForList(select(table, owner) + " FROM " + table + " t LEFT JOIN t_product_requirement r ON r.id_=t.requirement_id_ AND r.tenant_id_=t.tenant_id_ AND r.delete_flag_=0 WHERE t.id_=? AND t.tenant_id_=? AND t.delete_flag_=0", id, RequestContext.tenantId());
        return rows.isEmpty() ? null : rows.get(0);
    }
    public int update(String table, String id, Map<String,Object> b) {
        return jdbc.update("UPDATE " + table + " SET title_=COALESCE(?,title_),description_=COALESCE(?,description_),expected_goal_=COALESCE(?,expected_goal_),priority_=COALESCE(?,priority_),status_=COALESCE(?,status_),estimated_hours_=COALESCE(?,estimated_hours_),actual_hours_=COALESCE(?,actual_hours_),due_date_=COALESCE(?,due_date_),update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND delete_flag_=0", b.get("title"),b.get("description"),b.get("expectedGoal"),b.get("priority"),b.get("status"),b.get("estimatedHours"),b.get("actualHours"),b.get("dueDate"),RequestContext.userId(),id,RequestContext.tenantId());
    }
    public Map<String,Object> create(String type, Map<String,Object> b) {
        String title = Objects.toString(b.get("title"), "").trim();
        if (title.isBlank()) throw new IllegalArgumentException("任务标题不能为空");
        String prefix = switch (type) { case "bug" -> "BUG"; case "dev" -> "DEV"; case "design" -> "DESIGN"; case "presales" -> "PRESALES"; case "delivery" -> "DELIVERY"; case "ops" -> "OPS"; default -> throw new IllegalArgumentException("任务类型无效"); };
        String id=UUID.randomUUID().toString(), code=prefix+"-"+System.currentTimeMillis(), source=Objects.toString(b.getOrDefault("sourceWorkOrderIds","[]"));
        String sourceTitles=jsonValue(b,"sourceWorkOrderTitles","[]"), media=jsonValue(b,"media","[]"), tenant=RequestContext.tenantId(); Object req=b.get("requirementId");
        if("bug".equals(type)) jdbc.update("INSERT INTO t_product_bug(id_,tenant_id_,requirement_id_,code_,title_,description_,description_html_,expected_goal_,priority_,product_line_id_,product_line_name_,version_name_,type_,severity_,assignee_name_,owner_name_,creator_name_,department_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,media_,status_,source_work_order_ids_,source_work_order_titles_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,CAST(? AS JSON),CAST(? AS JSON),?,?,NOW(),NOW())",id,tenant,req,code,title,b.get("description"),b.get("descriptionHtml"),b.get("expectedGoal"),b.get("priority"),b.get("productLineId"),b.get("productLineName"),b.get("versionName"),b.get("type"),b.get("severity"),b.get("assigneeName"),b.get("assigneeName"),RequestContext.operatorName(),b.get("department"),b.get("customerId"),b.get("customerName"),b.getOrDefault("estimatedHours",0),b.getOrDefault("actualHours",0),b.get("dueDate"),media,b.getOrDefault("status","待修复"),source,sourceTitles,RequestContext.userId(),RequestContext.userId());
        else if ("dev".equals(type)) jdbc.update("INSERT INTO t_product_dev_task(id_,tenant_id_,requirement_id_,code_,title_,description_,description_html_,expected_goal_,priority_,product_line_id_,product_line_name_,version_name_,repo_,branch_,developer_name_,owner_name_,creator_name_,department_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,media_,status_,source_work_order_ids_,source_work_order_titles_,create_by_,update_by_,create_time_,update_time_,version_) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,CAST(? AS JSON),CAST(? AS JSON),?,?,NOW(),NOW(),0)",id,tenant,req,code,title,b.get("description"),b.get("descriptionHtml"),b.get("expectedGoal"),b.get("priority"),b.get("productLineId"),b.get("productLineName"),b.get("versionName"),b.get("repo"),b.get("branch"),b.get("developer"),b.get("developer"),RequestContext.operatorName(),b.get("department"),b.get("customerId"),b.get("customerName"),b.getOrDefault("estimatedHours",0),b.getOrDefault("actualHours",0),b.get("dueDate"),media,b.getOrDefault("status","开发中"),source,sourceTitles,RequestContext.userId(),RequestContext.userId());
        else {
            String table = "design".equals(type) ? "t_product_design_task" : TaskAliasService.table(type);
            jdbc.update("INSERT INTO " + table + " (id_,tenant_id_,requirement_id_,code_,title_,description_,expected_goal_,status_,priority_,owner_name_,creator_name_,department_,version_id_,version_name_,product_line_id_,product_line_name_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,create_by_,update_by_,create_time_,update_time_,delete_flag_,version_,work_item_kind_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),0,0,?)", id,tenant,req,code,title,b.get("description"),b.get("expectedGoal"),b.getOrDefault("status","待处理"),b.getOrDefault("priority","中"),b.get("ownerName"),RequestContext.operatorName(),b.get("department"),b.get("versionId"),Objects.toString(b.get("versionName"),""),b.get("productLineId"),Objects.toString(b.get("productLineName"),""),b.get("customerId"),Objects.toString(b.get("customerName"),""),b.getOrDefault("estimatedHours",0),b.getOrDefault("actualHours",0),b.getOrDefault("dueDate",java.time.LocalDate.now().toString()),RequestContext.userId(),RequestContext.userId(),type);
        }
        Object typeId = b.get("workItemTypeId");
        if (typeId != null && !String.valueOf(typeId).isBlank()) {
            String typeTable = switch (type) { case "bug" -> "t_product_bug"; case "dev" -> "t_product_dev_task"; case "design" -> "t_product_design_task"; default -> null; };
            if (typeTable != null) jdbc.update("UPDATE " + typeTable + " SET work_item_type_id_=? WHERE id_=? AND tenant_id_=?", typeId, id, tenant);
        }
        return Map.of("id",id,"code",code);
    }
    private String select(String table,String owner){String html=(table.equals("t_product_bug")||table.equals("t_product_dev_task"))?"t.description_html_ AS descriptionHtml,":"";String source=(table.equals("t_product_bug")||table.equals("t_product_dev_task"))?"t.source_work_order_ids_ AS sourceWorkOrderIds,t.source_work_order_titles_ AS sourceWorkOrderTitles,":"CASE WHEN t.requirement_id_ IS NULL THEN JSON_ARRAY() ELSE JSON_ARRAY(t.requirement_id_) END AS sourceWorkOrderIds,CASE WHEN r.id_ IS NULL THEN JSON_ARRAY() ELSE JSON_ARRAY(r.title_) END AS sourceWorkOrderTitles,";String typeId=(table.equals("t_product_bug")||table.equals("t_product_dev_task")||table.equals("t_product_design_task"))?"t.work_item_type_id_ AS workItemTypeId,":"NULL AS workItemTypeId,";return "SELECT t.id_ AS id,t.code_ AS code,t.requirement_id_ AS requirementId,t.title_ AS title,t.description_ AS description,"+html+"t.expected_goal_ AS expectedGoal,t.priority_ AS priority,t.product_line_id_ AS productLineId,t.product_line_name_ AS productLineName,t.version_name_ AS versionName,t.status_ AS status,t."+owner+" AS ownerName,t."+owner+" AS assigneeName,t.estimated_hours_ AS estimatedHours,t.actual_hours_ AS actualHours,t.due_date_ AS dueDate,"+typeId+source+"t.create_by_ AS creatorName,t.create_time_ AS createdAt";}
    private String jsonValue(Map<String,Object>b,String key,String fallback){Object v=b.get(key);if(v==null)return fallback;if(v instanceof String s)return s.isBlank()?fallback:s;try{return json.writeValueAsString(v);}catch(Exception e){throw new IllegalArgumentException(key+"格式无效");}}
}

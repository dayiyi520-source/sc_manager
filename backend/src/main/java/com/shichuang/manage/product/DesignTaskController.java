package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/design-tasks")
@Profile("local")
public class DesignTaskController {
    private final JdbcTemplate jdbc;

    public DesignTaskController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(defaultValue = "") String keyword) {
        String like = "%" + keyword.trim() + "%";
        return ApiResponse.ok(jdbc.queryForList(selectSql() + " FROM t_product_design_task t LEFT JOIN t_product_requirement r ON r.id_=t.requirement_id_ AND r.tenant_id_=t.tenant_id_ AND r.delete_flag_=0 WHERE t.tenant_id_=? AND t.delete_flag_=0 AND (t.title_ LIKE ? OR t.description_ LIKE ? OR t.owner_name_ LIKE ?) ORDER BY t.create_time_ DESC", RequestContext.tenantId(), like, like, like));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@PathVariable String id) {
        List<Map<String, Object>> rows = jdbc.queryForList(selectSql() + " FROM t_product_design_task t LEFT JOIN t_product_requirement r ON r.id_=t.requirement_id_ AND r.tenant_id_=t.tenant_id_ AND r.delete_flag_=0 WHERE t.id_=? AND t.tenant_id_=? AND t.delete_flag_=0", id, RequestContext.tenantId());
        if (rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "设计任务不存在");
        return ApiResponse.ok(rows.get(0));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        String title = text(body, "title");
        if (title.isBlank()) throw new IllegalArgumentException("设计任务名称不能为空");
        String tenant = RequestContext.tenantId();
        String id = UUID.randomUUID().toString();
        String code = "DESIGN-" + LocalDate.now().getYear() + "-" + System.currentTimeMillis();
        jdbc.update("INSERT INTO t_product_design_task (id_,tenant_id_,requirement_id_,code_,title_,description_,expected_goal_,status_,priority_,owner_name_,creator_name_,department_,version_id_,version_name_,product_line_id_,product_line_name_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,create_by_,update_by_,create_time_,update_time_,delete_flag_,version_,work_item_kind_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),0,0,'design')", id, tenant, text(body, "requirementId"), code, title, text(body, "description"), text(body, "expectedGoal"), defaultText(body, "status", "待处理"), defaultText(body, "priority", "中"), text(body, "ownerName"), RequestContext.operatorName(), text(body, "department"), text(body, "versionId"), text(body, "versionName"), text(body, "productLineId"), text(body, "productLineName"), text(body, "customerId"), text(body, "customerName"), body.getOrDefault("estimatedHours", 0), body.getOrDefault("actualHours", 0), defaultText(body, "dueDate", LocalDate.now().toString()), RequestContext.userId(), RequestContext.userId());
        return ApiResponse.ok(Map.of("id", id, "code", code));
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        int updated = jdbc.update("UPDATE t_product_design_task SET requirement_id_=COALESCE(NULLIF(?,''),requirement_id_),title_=COALESCE(?,title_),description_=COALESCE(?,description_),expected_goal_=COALESCE(?,expected_goal_),status_=COALESCE(?,status_),priority_=COALESCE(?,priority_),owner_name_=COALESCE(?,owner_name_),product_line_id_=COALESCE(?,product_line_id_),product_line_name_=COALESCE(?,product_line_name_),version_name_=COALESCE(?,version_name_),estimated_hours_=COALESCE(?,estimated_hours_),actual_hours_=COALESCE(?,actual_hours_),due_date_=COALESCE(?,due_date_),source_work_order_ids_=COALESCE(CAST(? AS JSON),source_work_order_ids_),source_work_order_titles_=COALESCE(CAST(? AS JSON),source_work_order_titles_),update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND delete_flag_=0", nullable(body, "requirementId"), nullable(body, "title"), nullable(body, "description"), nullable(body, "expectedGoal"), nullable(body, "status"), nullable(body, "priority"), nullable(body, "ownerName"), nullable(body, "productLineId"), nullable(body, "productLineName"), nullable(body, "versionName"), nullable(body, "estimatedHours"), nullable(body, "dueDate"), json(body, "sourceWorkOrderIds", null), json(body, "sourceWorkOrderTitles", null), RequestContext.userId(), id, RequestContext.tenantId());
        if (updated == 0) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "设计任务不存在");
        return ApiResponse.ok(null);
    }

    private static String selectSql() {
        return "SELECT t.id_ AS id,t.code_ AS code,t.title_ AS title,t.description_ AS description,t.expected_goal_ AS expectedGoal,t.status_ AS status,t.priority_ AS priority,t.owner_name_ AS ownerName,t.creator_name_ AS creatorName,t.department_ AS department,t.version_id_ AS versionId,t.version_name_ AS versionName,t.product_line_id_ AS productLineId,t.product_line_name_ AS productLineName,t.customer_id_ AS customerId,t.customer_name_ AS customerName,t.estimated_hours_ AS estimatedHours,t.actual_hours_ AS actualHours,t.due_date_ AS dueDate,t.create_time_ AS createdAt,t.version_ AS version,t.work_item_kind_ AS workItemKind,t.requirement_id_ AS requirementId,CASE WHEN t.requirement_id_ IS NULL THEN JSON_ARRAY() ELSE JSON_ARRAY(t.requirement_id_) END AS sourceWorkOrderIds,CASE WHEN r.id_ IS NULL THEN JSON_ARRAY() ELSE JSON_ARRAY(r.title_) END AS sourceWorkOrderTitles";
    }
    private static String text(Map<String, Object> body, String key) { return Objects.toString(body.get(key), "").trim(); }
    private static String defaultText(Map<String, Object> body, String key, String fallback) { String value = text(body, key); return value.isBlank() ? fallback : value; }
    private static Object nullable(Map<String, Object> body, String key) { return body.containsKey(key) ? body.get(key) : null; }
    private static String json(Map<String, Object> body, String key, String fallback) { Object value = body.get(key); if (value == null) return fallback; if (value instanceof String text) return text.isBlank() ? fallback : text; try { return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(value); } catch (Exception error) { throw new IllegalArgumentException(key + "格式无效"); } }
}

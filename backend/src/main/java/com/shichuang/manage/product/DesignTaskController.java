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
        return ApiResponse.ok(jdbc.queryForList(selectSql() + " FROM t_product_design_task WHERE tenant_id_=? AND delete_flag_=0 AND (title_ LIKE ? OR description_ LIKE ? OR owner_name_ LIKE ?) ORDER BY create_time_ DESC", RequestContext.tenantId(), like, like, like));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@PathVariable String id) {
        List<Map<String, Object>> rows = jdbc.queryForList(selectSql() + " FROM t_product_design_task WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, RequestContext.tenantId());
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
        jdbc.update("INSERT INTO t_product_design_task (id_,tenant_id_,code_,title_,description_,expected_goal_,status_,priority_,owner_name_,creator_name_,department_,version_id_,version_name_,product_line_id_,product_line_name_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,create_by_,update_by_,create_time_,update_time_,delete_flag_,version_,work_item_kind_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),0,0,'design')", id, tenant, code, title, text(body, "description"), text(body, "expectedGoal"), defaultText(body, "status", "待处理"), defaultText(body, "priority", "中"), text(body, "ownerName"), RequestContext.operatorName(), text(body, "department"), text(body, "versionId"), text(body, "versionName"), text(body, "productLineId"), text(body, "productLineName"), text(body, "customerId"), text(body, "customerName"), body.getOrDefault("estimatedHours", 0), body.getOrDefault("actualHours", 0), defaultText(body, "dueDate", LocalDate.now().toString()), RequestContext.userId(), RequestContext.userId());
        return ApiResponse.ok(Map.of("id", id, "code", code));
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        int updated = jdbc.update("UPDATE t_product_design_task SET title_=COALESCE(?,title_),description_=COALESCE(?,description_),expected_goal_=COALESCE(?,expected_goal_),status_=COALESCE(?,status_),priority_=COALESCE(?,priority_),owner_name_=COALESCE(?,owner_name_),product_line_id_=COALESCE(?,product_line_id_),product_line_name_=COALESCE(?,product_line_name_),version_name_=COALESCE(?,version_name_),update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND delete_flag_=0", nullable(body, "title"), nullable(body, "description"), nullable(body, "expectedGoal"), nullable(body, "status"), nullable(body, "priority"), nullable(body, "ownerName"), nullable(body, "productLineId"), nullable(body, "productLineName"), nullable(body, "versionName"), RequestContext.userId(), id, RequestContext.tenantId());
        if (updated == 0) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "设计任务不存在");
        return ApiResponse.ok(null);
    }

    private static String selectSql() {
        return "SELECT id_ AS id,code_ AS code,title_ AS title,description_ AS description,expected_goal_ AS expectedGoal,status_ AS status,priority_ AS priority,owner_name_ AS ownerName,creator_name_ AS creatorName,department_ AS department,version_id_ AS versionId,version_name_ AS versionName,product_line_id_ AS productLineId,product_line_name_ AS productLineName,customer_id_ AS customerId,customer_name_ AS customerName,estimated_hours_ AS estimatedHours,actual_hours_ AS actualHours,due_date_ AS dueDate,create_time_ AS createdAt,version_ AS version,work_item_kind_ AS workItemKind";
    }
    private static String text(Map<String, Object> body, String key) { return Objects.toString(body.get(key), "").trim(); }
    private static String defaultText(Map<String, Object> body, String key, String fallback) { String value = text(body, key); return value.isBlank() ? fallback : value; }
    private static Object nullable(Map<String, Object> body, String key) { return body.containsKey(key) ? body.get(key) : null; }
}

package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import com.shichuang.manage.auth.RequestContext;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.*;

@RestController
@Profile("local")
@Tag(name = "缺陷与研发任务", description = "缺陷管理和研发任务独立接口")
public class TaskAliasController {
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    public TaskAliasController(JdbcTemplate jdbc, ObjectMapper objectMapper) { this.jdbc = jdbc; this.objectMapper = objectMapper; }

    @Operation(summary = "查询缺陷列表") @GetMapping("/api/bugs") public ApiResponse<List<Map<String,Object>>> bugs() { return list("t_product_bug", "assignee_name_"); }
    @Operation(summary = "查询研发任务列表") @GetMapping("/api/dev-tasks") public ApiResponse<List<Map<String,Object>>> devTasks() { return list("t_product_dev_task", "developer_name_"); }
    @Operation(summary = "查询缺陷详情") @GetMapping("/api/bugs/{id}") public ApiResponse<Map<String,Object>> bug(@PathVariable String id) { return detail("t_product_bug", "assignee_name_", id); }
    @Operation(summary = "查询研发任务详情") @GetMapping("/api/dev-tasks/{id}") public ApiResponse<Map<String,Object>> dev(@PathVariable String id) { return detail("t_product_dev_task", "developer_name_", id); }
    @Operation(summary = "新建缺陷") @PostMapping("/api/bugs") @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> createBug(@RequestBody Map<String,Object> body) { return create("bug", body); }
    @Operation(summary = "新建研发任务") @PostMapping("/api/dev-tasks") @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> createDev(@RequestBody Map<String,Object> body) { return create("dev", body); }
    @Operation(summary = "更新缺陷") @PutMapping("/api/bugs/{id}") public ApiResponse<Void> updateBug(@PathVariable String id,@RequestBody Map<String,Object> body) { return update("t_product_bug", id, body); }
    @Operation(summary = "更新研发任务") @PutMapping("/api/dev-tasks/{id}") public ApiResponse<Void> updateDev(@PathVariable String id,@RequestBody Map<String,Object> body) { return update("t_product_dev_task", id, body); }

    private ApiResponse<List<Map<String,Object>>> list(String table, String ownerColumn) {
        return ApiResponse.ok(jdbc.queryForList("SELECT id_ AS id,code_ AS code,title_ AS title,description_ AS description,description_html_ AS descriptionHtml,expected_goal_ AS expectedGoal,priority_ AS priority,product_line_id_ AS productLineId,product_line_name_ AS productLineName,version_name_ AS versionName,status_ AS status," + ownerColumn + " AS ownerName," + ownerColumn + " AS assigneeName,estimated_hours_ AS estimatedHours,actual_hours_ AS actualHours,due_date_ AS dueDate,source_work_order_ids_ AS sourceWorkOrderIds,source_work_order_titles_ AS sourceWorkOrderTitles,create_by_ AS creatorName,create_time_ AS createdAt FROM " + table + " WHERE tenant_id_=? AND delete_flag_=0 ORDER BY create_time_ DESC", RequestContext.tenantId()));
    }
    private ApiResponse<Map<String,Object>> detail(String table, String ownerColumn, String id) {
        List<Map<String,Object>> rows = jdbc.queryForList("SELECT id_ AS id,code_ AS code,title_ AS title,description_ AS description,description_html_ AS descriptionHtml,expected_goal_ AS expectedGoal,priority_ AS priority,product_line_id_ AS productLineId,product_line_name_ AS productLineName,version_name_ AS versionName,status_ AS status," + ownerColumn + " AS ownerName," + ownerColumn + " AS assigneeName,estimated_hours_ AS estimatedHours,actual_hours_ AS actualHours,due_date_ AS dueDate,source_work_order_ids_ AS sourceWorkOrderIds,source_work_order_titles_ AS sourceWorkOrderTitles,create_by_ AS creatorName,create_time_ AS createdAt FROM " + table + " WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, RequestContext.tenantId());
        if (rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "工作项不存在");
        return ApiResponse.ok(rows.get(0));
    }
    private ApiResponse<Map<String,Object>> create(String type, Map<String,Object> body) {
        String title = body.get("title") == null ? "" : String.valueOf(body.get("title")).trim();
        if (title.isBlank()) throw new IllegalArgumentException("任务标题不能为空");
        String table = "bug".equals(type) ? "t_product_bug" : "t_product_dev_task";
        String id = UUID.randomUUID().toString(); String code = ("bug".equals(type) ? "BUG-" : "DEV-") + System.currentTimeMillis(); String source = String.valueOf(body.getOrDefault("sourceWorkOrderIds", "[]"));
        String sourceTitles = json(body, "sourceWorkOrderTitles", "[]");
        String media = json(body, "media", "[]");
        Object requirementId = body.get("requirementId");
        if ("bug".equals(type)) jdbc.update("INSERT INTO t_product_bug(id_,tenant_id_,requirement_id_,code_,title_,description_,description_html_,expected_goal_,priority_,product_line_id_,product_line_name_,version_name_,type_,severity_,assignee_name_,owner_name_,creator_name_,department_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,media_,status_,source_work_order_ids_,source_work_order_titles_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,CAST(? AS JSON),CAST(? AS JSON),?,?,NOW(),NOW())", id,RequestContext.tenantId(),requirementId,code,title,body.get("description"),body.get("descriptionHtml"),body.get("expectedGoal"),body.get("priority"),body.get("productLineId"),body.get("productLineName"),body.get("versionName"),body.get("type"),body.get("severity"),body.get("assigneeName"),body.get("assigneeName"),RequestContext.operatorName(),body.get("department"),body.get("customerId"),body.get("customerName"),body.getOrDefault("estimatedHours",0),body.getOrDefault("actualHours",0),body.get("dueDate"),media,body.getOrDefault("status","待修复"),source,sourceTitles,RequestContext.userId(),RequestContext.userId());
        else jdbc.update("INSERT INTO t_product_dev_task(id_,tenant_id_,requirement_id_,code_,title_,description_,description_html_,expected_goal_,priority_,product_line_id_,product_line_name_,version_name_,repo_,branch_,developer_name_,owner_name_,creator_name_,department_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,media_,status_,source_work_order_ids_,source_work_order_titles_,create_by_,update_by_,create_time_,update_time_,version_) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,CAST(? AS JSON),CAST(? AS JSON),?,?,NOW(),NOW(),0)", id,RequestContext.tenantId(),requirementId,code,title,body.get("description"),body.get("descriptionHtml"),body.get("expectedGoal"),body.get("priority"),body.get("productLineId"),body.get("productLineName"),body.get("versionName"),body.get("repo"),body.get("branch"),body.get("developer"),body.get("developer"),RequestContext.operatorName(),body.get("department"),body.get("customerId"),body.get("customerName"),body.getOrDefault("estimatedHours",0),body.getOrDefault("actualHours",0),body.get("dueDate"),media,body.getOrDefault("status","开发中"),source,sourceTitles,RequestContext.userId(),RequestContext.userId());
        return ApiResponse.ok(Map.of("id", id, "code", code));
    }

    private String json(Map<String,Object> body, String key, String fallback) {
        Object value = body.get(key);
        if (value == null) return fallback;
        if (value instanceof String string) return string.isBlank() ? fallback : string;
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException error) { throw new IllegalArgumentException(key + "格式无效"); }
    }
    private ApiResponse<Void> update(String table, String id, Map<String,Object> body) {
        int count = jdbc.update("UPDATE " + table + " SET title_=COALESCE(?,title_),description_=COALESCE(?,description_),expected_goal_=COALESCE(?,expected_goal_),priority_=COALESCE(?,priority_),status_=COALESCE(?,status_),estimated_hours_=COALESCE(?,estimated_hours_),actual_hours_=COALESCE(?,actual_hours_),due_date_=COALESCE(?,due_date_),update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND delete_flag_=0", body.get("title"),body.get("description"),body.get("expectedGoal"),body.get("priority"),body.get("status"),body.get("estimatedHours"),body.get("actualHours"),body.get("dueDate"),RequestContext.userId(),id,RequestContext.tenantId());
        if (count == 0) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "工作项不存在");
        return ApiResponse.ok(null);
    }
}

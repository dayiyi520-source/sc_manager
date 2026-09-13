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
@RequestMapping("/api/work-items")
@Profile("local")
public class UnifiedWorkItemController {
    private static final Set<String> TYPES = Set.of("requirement", "design", "development", "bug", "test");
    private final JdbcTemplate jdbc;
    public UnifiedWorkItemController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping
    public ApiResponse<Map<String, Object>> list(@RequestParam(defaultValue = "") String type, @RequestParam(defaultValue = "") String keyword) {
        String like = "%" + keyword.trim() + "%";
        List<Map<String, Object>> items = jdbc.queryForList(selectSql() + " WHERE tenant_id_=? AND delete_flag_=0 AND (?='' OR type_=?) AND (?='' OR title_ LIKE ? OR code_ LIKE ? OR owner_name_ LIKE ?) ORDER BY create_time_ DESC", RequestContext.tenantId(), type, type, keyword.trim(), like, like, like);
        return ApiResponse.ok(Map.of("items", items, "total", items.size(), "page", 1, "pageSize", items.size()));
    }

    @GetMapping("/{id}")
    public ApiResponse<Map<String, Object>> detail(@PathVariable String id) {
        List<Map<String, Object>> rows = jdbc.queryForList(selectSql() + " WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, RequestContext.tenantId());
        if (rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "工作项不存在");
        return ApiResponse.ok(rows.get(0));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        String type = text(body, "type");
        if (!TYPES.contains(type)) throw new IllegalArgumentException("请选择有效工作项类型");
        String title = text(body, "title");
        if (title.isBlank()) throw new IllegalArgumentException("工作项标题不能为空");
        String id = UUID.randomUUID().toString();
        String code = type.toUpperCase(Locale.ROOT) + "-" + System.currentTimeMillis();
        String operator = RequestContext.userId();
        jdbc.update("INSERT INTO t_product_work_item (id_,tenant_id_,code_,title_,type_,product_line_id_,product_line_name_,iteration_id_,iteration_name_,parent_id_,owner_name_,creator_name_,priority_,status_,due_date_,description_,description_html_,source_id_,source_table_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())",
            id, RequestContext.tenantId(), code, title, type, text(body,"productLineId"), text(body,"productLineName"), text(body,"iterationId"), text(body,"iterationName"), nullable(body,"parentId"), text(body,"ownerName"), RequestContext.operatorName(), defaultText(body,"priority","中"), defaultText(body,"status", "待排期"), nullable(body,"dueDate"), text(body,"description"), text(body,"descriptionHtml"), nullable(body,"sourceId"), "unified", operator, operator);
        event(id, "CREATED", null, defaultText(body,"status", "待排期"), "创建工作项");
        return ApiResponse.ok(Map.of("id", id, "code", code));
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Map<String,Object> old = jdbc.queryForMap("SELECT status_ FROM t_product_work_item WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, RequestContext.tenantId());
        int count = jdbc.update("UPDATE t_product_work_item SET title_=COALESCE(?,title_),type_=COALESCE(?,type_),product_line_id_=COALESCE(?,product_line_id_),product_line_name_=COALESCE(?,product_line_name_),iteration_id_=COALESCE(?,iteration_id_),iteration_name_=COALESCE(?,iteration_name_),parent_id_=COALESCE(?,parent_id_),owner_name_=COALESCE(?,owner_name_),priority_=COALESCE(?,priority_),status_=COALESCE(?,status_),due_date_=COALESCE(?,due_date_),description_=COALESCE(?,description_),description_html_=COALESCE(?,description_html_),update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND delete_flag_=0", nullable(body,"title"), nullable(body,"type"), nullable(body,"productLineId"), nullable(body,"productLineName"), nullable(body,"iterationId"), nullable(body,"iterationName"), nullable(body,"parentId"), nullable(body,"ownerName"), nullable(body,"priority"), nullable(body,"status"), nullable(body,"dueDate"), nullable(body,"description"), nullable(body,"descriptionHtml"), RequestContext.userId(), id, RequestContext.tenantId());
        if (count == 0) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "工作项不存在");
        String next = text(body,"status"); if (!next.isBlank() && !next.equals(String.valueOf(old.get("status_")))) event(id, "STATUS_CHANGED", String.valueOf(old.get("status_")), next, "状态更新");
        return ApiResponse.ok(null);
    }

    @GetMapping("/{id}/events")
    public ApiResponse<List<Map<String,Object>>> events(@PathVariable String id) { return ApiResponse.ok(jdbc.queryForList("SELECT id_ AS id,event_type_ AS eventType,from_status_ AS fromStatus,to_status_ AS toStatus,content_,operator_name_ AS operatorName,create_time_ AS createdAt FROM t_product_work_item_event WHERE work_item_id_=? AND tenant_id_=? ORDER BY create_time_ ASC", id, RequestContext.tenantId())); }

    @PostMapping("/{id}/relations")
    public ApiResponse<Void> relation(@PathVariable String id, @RequestBody Map<String,String> body) { String to = Objects.toString(body.get("toId"), ""); String kind = Objects.toString(body.get("relationType"), "INFORMS"); if (to.isBlank()) throw new IllegalArgumentException("关联工作项不能为空"); jdbc.update("INSERT IGNORE INTO t_product_work_item_relation (id_,tenant_id_,from_id_,to_id_,relation_type_,create_by_,create_time_) VALUES (?,?,?,?,?,?,NOW())", UUID.randomUUID().toString(), RequestContext.tenantId(), id, to, kind, RequestContext.userId()); return ApiResponse.ok(null); }

    private void event(String id, String type, String from, String to, String content) { jdbc.update("INSERT INTO t_product_work_item_event (id_,tenant_id_,work_item_id_,event_type_,from_status_,to_status_,content_,operator_name_,create_by_,create_time_) VALUES (?,?,?,?,?,?,?,?,?,NOW())", UUID.randomUUID().toString(), RequestContext.tenantId(), id, type, from, to, content, RequestContext.operatorName(), RequestContext.userId()); }
    private static String selectSql() { return "SELECT id_ AS id,code_ AS code,title_ AS title,type_ AS type,product_line_id_ AS productLineId,product_line_name_ AS productLineName,iteration_id_ AS iterationId,iteration_name_ AS iterationName,parent_id_ AS parentId,owner_name_ AS ownerName,creator_name_ AS creatorName,priority_ AS priority,status_ AS status,due_date_ AS dueDate,description_ AS description,description_html_ AS descriptionHtml,source_id_ AS sourceId,create_time_ AS createdAt,update_time_ AS updatedAt,version_ AS version FROM t_product_work_item"; }
    private static String text(Map<String,Object> body,String key){return Objects.toString(body.get(key),"").trim();}
    private static String defaultText(Map<String,Object> body,String key,String fallback){String v=text(body,key);return v.isBlank()?fallback:v;}
    private static Object nullable(Map<String,Object> body,String key){String v=text(body,key);return v.isBlank()?null:v;}
}

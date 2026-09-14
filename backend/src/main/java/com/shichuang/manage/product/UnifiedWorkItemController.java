package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/work-items")
@Profile("local")
public class UnifiedWorkItemController {
    private static final Set<String> TYPES = Set.of("requirement", "design", "development", "bug", "test");
    private static final Set<String> RELATIONS = Set.of("BLOCKS", "SOFT_DEPENDS", "INFORMS", "FULFILLMENT");
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
        String status = defaultText(body, "status", "待排期");
        if (!allowedStatus(type, status)) throw new IllegalArgumentException("当前工作项类型不支持该状态");
        String id = UUID.randomUUID().toString();
        String code = type.toUpperCase(Locale.ROOT) + "-" + System.currentTimeMillis();
        String operator = RequestContext.userId();
        jdbc.update("INSERT INTO t_product_work_item (id_,tenant_id_,code_,title_,type_,product_line_id_,product_line_name_,iteration_id_,iteration_name_,parent_id_,owner_name_,creator_name_,priority_,status_,due_date_,description_,description_html_,source_id_,source_table_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())",
            id, RequestContext.tenantId(), code, title, type, text(body,"productLineId"), text(body,"productLineName"), text(body,"iterationId"), text(body,"iterationName"), nullable(body,"parentId"), text(body,"ownerName"), RequestContext.operatorName(), defaultText(body,"priority","中"), status, nullable(body,"dueDate"), text(body,"description"), text(body,"descriptionHtml"), nullable(body,"sourceId"), "unified", operator, operator);
        event(id, "CREATED", null, status, "创建工作项");
        return ApiResponse.ok(Map.of("id", id, "code", code));
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        List<Map<String,Object>> existing = jdbc.queryForList("SELECT type_,status_ FROM t_product_work_item WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, RequestContext.tenantId());
        if (existing.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "工作项不存在");
        Map<String,Object> old = existing.get(0);
        String next = text(body,"status");
        String nextType = text(body, "type");
        if (!nextType.isBlank() && !TYPES.contains(nextType)) throw new IllegalArgumentException("请选择有效工作项类型");
        if (!next.isBlank() && !allowedStatus(nextType.isBlank() ? text(existing.get(0), "type_") : nextType, next)) throw new IllegalArgumentException("当前工作项类型不支持该状态");
        int count = jdbc.update("UPDATE t_product_work_item SET title_=COALESCE(?,title_),type_=COALESCE(?,type_),product_line_id_=COALESCE(?,product_line_id_),product_line_name_=COALESCE(?,product_line_name_),iteration_id_=COALESCE(?,iteration_id_),iteration_name_=COALESCE(?,iteration_name_),parent_id_=COALESCE(?,parent_id_),owner_name_=COALESCE(?,owner_name_),priority_=COALESCE(?,priority_),status_=COALESCE(?,status_),due_date_=COALESCE(?,due_date_),description_=COALESCE(?,description_),description_html_=COALESCE(?,description_html_),update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND delete_flag_=0", nullable(body,"title"), nullable(body,"type"), nullable(body,"productLineId"), nullable(body,"productLineName"), nullable(body,"iterationId"), nullable(body,"iterationName"), nullable(body,"parentId"), nullable(body,"ownerName"), nullable(body,"priority"), nullable(body,"status"), nullable(body,"dueDate"), nullable(body,"description"), nullable(body,"descriptionHtml"), RequestContext.userId(), id, RequestContext.tenantId());
        if (count == 0) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "工作项不存在");
        if (!next.isBlank() && !next.equals(String.valueOf(old.get("status_")))) { event(id, "STATUS_CHANGED", String.valueOf(old.get("status_")), next, "状态更新"); aggregateParent(id); aggregateBlockedRequirements(id); }
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/acceptance")
    public ApiResponse<Void> acceptance(@PathVariable String id, @RequestBody Map<String, String> body) {
        String status = Objects.toString(body.get("status"), "");
        if (!Set.of("已通过", "已驳回").contains(status)) throw new IllegalArgumentException("验收状态无效");
        String note = Objects.toString(body.get("note"), "").trim();
        int count = jdbc.update("UPDATE t_product_work_item SET acceptance_status_=?,acceptance_note_=?,accepted_by_=CASE WHEN ?='已通过' THEN ? ELSE NULL END,accepted_at_=CASE WHEN ?='已通过' THEN NOW() ELSE NULL END,update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND type_='requirement' AND delete_flag_=0", status, note, status, RequestContext.operatorName(), status, RequestContext.userId(), id, RequestContext.tenantId());
        if (count == 0) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "需求不存在");
        event(id, "ACCEPTANCE_" + ("已通过".equals(status) ? "PASSED" : "REJECTED"), null, status, note.isBlank() ? "产品验收" : note);
        aggregateParent(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/children")
    @Transactional
    public ApiResponse<List<Map<String,Object>>> createChildren(@PathVariable String id, @RequestBody List<Map<String,Object>> children) {
        if (children == null || children.isEmpty()) throw new IllegalArgumentException("至少需要一个子工作项");
        if (jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE id_=? AND tenant_id_=? AND type_='requirement' AND delete_flag_=0", Integer.class, id, RequestContext.tenantId()) == 0) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "父需求不存在");
        List<Map<String,Object>> result = new ArrayList<>();
        for (Map<String,Object> child : children) {
            String type = text(child,"type"); if (!Set.of("design","development","test").contains(type)) throw new IllegalArgumentException("需求子项类型只能是 design、development 或 test");
            String title = text(child,"title"); if (title.isBlank()) throw new IllegalArgumentException("子工作项标题不能为空");
            String childId = UUID.randomUUID().toString(); String code = type.toUpperCase(Locale.ROOT) + "-" + System.currentTimeMillis() + "-" + result.size();
            jdbc.update("INSERT INTO t_product_work_item (id_,tenant_id_,code_,title_,type_,parent_id_,product_line_id_,product_line_name_,owner_name_,creator_name_,priority_,status_,due_date_,description_,source_id_,source_table_,create_by_,update_by_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())", childId, RequestContext.tenantId(), code, title, type, id, nullable(child,"productLineId"), text(child,"productLineName"), text(child,"ownerName"), RequestContext.operatorName(), defaultText(child,"priority","中"), defaultText(child,"status","待排期"), nullable(child,"dueDate"), text(child,"description"), id, "unified", RequestContext.userId(), RequestContext.userId());
            event(childId, "CREATED", null, defaultText(child,"status","待排期"), "需求审核通过后创建子项"); result.add(Map.of("id", childId, "code", code, "type", type));
        }
        jdbc.update("UPDATE t_product_work_item SET status_='已排期',update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND status_ IN ('待转化','待排期')", RequestContext.userId(), id, RequestContext.tenantId());
        return ApiResponse.ok(result);
    }

    @GetMapping("/{id}/children")
    public ApiResponse<List<Map<String,Object>>> children(@PathVariable String id) { return ApiResponse.ok(jdbc.queryForList(selectSql() + " WHERE parent_id_=? AND tenant_id_=? AND delete_flag_=0 ORDER BY create_time_ ASC", id, RequestContext.tenantId())); }

    @GetMapping("/{id}/events")
    public ApiResponse<List<Map<String,Object>>> events(@PathVariable String id) { return ApiResponse.ok(jdbc.queryForList("SELECT id_ AS id,event_type_ AS eventType,from_status_ AS fromStatus,to_status_ AS toStatus,content_,operator_name_ AS operatorName,create_time_ AS createdAt FROM t_product_work_item_event WHERE work_item_id_=? AND tenant_id_=? ORDER BY create_time_ ASC", id, RequestContext.tenantId())); }

    @PostMapping("/{id}/relations")
    public ApiResponse<Void> relation(@PathVariable String id, @RequestBody Map<String,String> body) { String to = Objects.toString(body.get("toId"), ""); String kind = Objects.toString(body.get("relationType"), "INFORMS"); if (to.isBlank() || id.equals(to)) throw new IllegalArgumentException("关联工作项不能为空且不能关联自身"); if (!RELATIONS.contains(kind)) throw new IllegalArgumentException("关联类型无效"); Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE id_ IN (?,?) AND tenant_id_=? AND delete_flag_=0", Integer.class, id, to, RequestContext.tenantId()); if (count == null || count != 2) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "关联工作项不存在"); jdbc.update("INSERT IGNORE INTO t_product_work_item_relation (id_,tenant_id_,from_id_,to_id_,relation_type_,create_by_,create_time_) VALUES (?,?,?,?,?,?,NOW())", UUID.randomUUID().toString(), RequestContext.tenantId(), id, to, kind, RequestContext.userId()); if ("BLOCKS".equals(kind)) aggregateParent(to); return ApiResponse.ok(null); }

    @GetMapping("/{id}/relations")
    public ApiResponse<List<Map<String,Object>>> relations(@PathVariable String id) { return ApiResponse.ok(jdbc.queryForList("SELECT relation_type_ AS relationType,from_id_ AS fromId,to_id_ AS toId,create_time_ AS createdAt FROM t_product_work_item_relation WHERE tenant_id_=? AND (from_id_=? OR to_id_=?) ORDER BY create_time_ ASC", RequestContext.tenantId(), id, id)); }

    private void event(String id, String type, String from, String to, String content) { jdbc.update("INSERT INTO t_product_work_item_event (id_,tenant_id_,work_item_id_,event_type_,from_status_,to_status_,content_,operator_name_,create_by_,create_time_) VALUES (?,?,?,?,?,?,?,?,?,NOW())", UUID.randomUUID().toString(), RequestContext.tenantId(), id, type, from, to, content, RequestContext.operatorName(), RequestContext.userId()); }
    private void aggregateParent(String childId) {
        List<Map<String,Object>> targets = jdbc.queryForList("SELECT id_,type_,parent_id_,acceptance_status_ FROM t_product_work_item WHERE id_=? AND tenant_id_=? AND delete_flag_=0", childId, RequestContext.tenantId());
        if (targets.isEmpty()) return;
        Map<String,Object> target = targets.get(0);
        String parentId = "requirement".equals(String.valueOf(target.get("type_"))) ? childId : Objects.toString(target.get("parent_id_"), "");
        if (parentId.isBlank()) return;
        Integer blocking=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item c JOIN t_product_work_item_relation rel ON rel.from_id_=c.id_ AND rel.tenant_id_=c.tenant_id_ AND rel.relation_type_='BLOCKS' WHERE rel.to_id_=? AND rel.tenant_id_=? AND c.type_='bug' AND c.status_ NOT IN ('已关闭','已完成') AND c.delete_flag_=0", Integer.class, parentId, RequestContext.tenantId());
        Integer incomplete=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE parent_id_=? AND tenant_id_=? AND delete_flag_=0 AND status_ NOT IN ('已完成','已关闭','已验收','已发布')", Integer.class, parentId, RequestContext.tenantId());
        String acceptance = Objects.toString(target.get("acceptance_status_"), "待验收");
        String status=(blocking!=null&&blocking>0)?"阻塞":(incomplete==null||incomplete==0 && "已通过".equals(acceptance)?"已完成":"部分完成");
        jdbc.update("UPDATE t_product_work_item SET status_=?,update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND type_='requirement' AND status_<>?", status, RequestContext.userId(), parentId, RequestContext.tenantId(), status);
    }
    private void aggregateBlockedRequirements(String workItemId) {
        jdbc.queryForList("SELECT to_id_ FROM t_product_work_item_relation WHERE from_id_=? AND tenant_id_=? AND relation_type_='BLOCKS'", workItemId, RequestContext.tenantId()).forEach(row -> aggregateParent(String.valueOf(row.get("to_id_"))));
    }
    private static boolean allowedStatus(String type, String status) { return switch (type) { case "development" -> Set.of("待转化","待排期","已排期","待开发","开发中","待测试","测试中","待验收","已验收","待发布","已发布","处理中","阻塞","部分完成","已完成").contains(status); case "bug" -> Set.of("待转化","待排期","已排期","待修复","修复中","待验证","已关闭","处理中","阻塞","部分完成","已完成").contains(status); default -> Set.of("待转化","待排期","已排期","处理中","阻塞","部分完成","已完成","已验收","已发布").contains(status); }; }
    private static String selectSql() { return "SELECT id_ AS id,code_ AS code,title_ AS title,type_ AS type,product_line_id_ AS productLineId,product_line_name_ AS productLineName,iteration_id_ AS iterationId,iteration_name_ AS iterationName,parent_id_ AS parentId,owner_name_ AS ownerName,creator_name_ AS creatorName,priority_ AS priority,status_ AS status,acceptance_status_ AS acceptanceStatus,acceptance_note_ AS acceptanceNote,accepted_by_ AS acceptedBy,accepted_at_ AS acceptedAt,due_date_ AS dueDate,description_ AS description,description_html_ AS descriptionHtml,source_id_ AS sourceId,create_time_ AS createdAt,update_time_ AS updatedAt,version_ AS version FROM t_product_work_item"; }
    private static String text(Map<String,Object> body,String key){return Objects.toString(body.get(key),"").trim();}
    private static String defaultText(Map<String,Object> body,String key,String fallback){String v=text(body,key);return v.isBlank()?fallback:v;}
    private static Object nullable(Map<String,Object> body,String key){String v=text(body,key);return v.isBlank()?null:v;}
}

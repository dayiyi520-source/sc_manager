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
@Profile("local")
public class BusinessTaskController {
    private final JdbcTemplate jdbc;
    public BusinessTaskController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping({"/api/presales-tasks", "/api/delivery-tasks", "/api/ops-tasks"})
    public ApiResponse<List<Map<String,Object>>> list(@RequestHeader(value="X-Task-Type", required=false) String header, jakarta.servlet.http.HttpServletRequest request) {
        return ApiResponse.ok(jdbc.queryForList(selectSql() + " FROM " + table(request.getRequestURI()) + " WHERE tenant_id_=? AND delete_flag_=0 ORDER BY create_time_ DESC", RequestContext.tenantId()));
    }

    @GetMapping({"/api/presales-tasks/{id}", "/api/delivery-tasks/{id}", "/api/ops-tasks/{id}"})
    public ApiResponse<Map<String,Object>> detail(@PathVariable String id, jakarta.servlet.http.HttpServletRequest request) {
        List<Map<String,Object>> rows = jdbc.queryForList(selectSql() + " FROM " + table(request.getRequestURI()) + " WHERE id_=? AND tenant_id_=? AND delete_flag_=0", id, RequestContext.tenantId());
        if (rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "任务不存在");
        return ApiResponse.ok(rows.get(0));
    }

    @PostMapping({"/api/presales-tasks", "/api/delivery-tasks", "/api/ops-tasks"})
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String,Object>> create(@RequestBody Map<String,Object> body, jakarta.servlet.http.HttpServletRequest request) {
        String title = Objects.toString(body.get("title"), "").trim();
        if (title.isBlank()) throw new IllegalArgumentException("任务名称不能为空");
        String id = UUID.randomUUID().toString();
        String code = prefix(request.getRequestURI()) + "-" + LocalDate.now().getYear() + "-" + System.currentTimeMillis();
        jdbc.update("INSERT INTO " + table(request.getRequestURI()) + " (id_,tenant_id_,code_,title_,description_,expected_goal_,status_,priority_,owner_name_,creator_name_,department_,version_id_,version_name_,product_line_id_,product_line_name_,customer_id_,customer_name_,estimated_hours_,actual_hours_,due_date_,create_by_,update_by_,create_time_,update_time_,delete_flag_,version_,work_item_kind_) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),0,0,?)", id, RequestContext.tenantId(), code, title, text(body,"description"), text(body,"expectedGoal"), textOr(body,"status","待处理"), textOr(body,"priority","中"), text(body,"ownerName"), RequestContext.operatorName(), text(body,"department"), text(body,"versionId"), text(body,"versionName"), text(body,"productLineId"), text(body,"productLineName"), text(body,"customerId"), text(body,"customerName"), body.getOrDefault("estimatedHours",0), body.getOrDefault("actualHours",0), textOr(body,"dueDate",LocalDate.now().toString()), RequestContext.userId(), RequestContext.userId(), prefix(request.getRequestURI()));
        return ApiResponse.ok(Map.of("id", id, "code", code));
    }

    @PutMapping({"/api/presales-tasks/{id}", "/api/delivery-tasks/{id}", "/api/ops-tasks/{id}"})
    public ApiResponse<Void> update(@PathVariable String id, @RequestBody Map<String,Object> body, jakarta.servlet.http.HttpServletRequest request) {
        int count = jdbc.update("UPDATE " + table(request.getRequestURI()) + " SET title_=COALESCE(?,title_),description_=COALESCE(?,description_),expected_goal_=COALESCE(?,expected_goal_),status_=COALESCE(?,status_),priority_=COALESCE(?,priority_),owner_name_=COALESCE(?,owner_name_),product_line_id_=COALESCE(?,product_line_id_),product_line_name_=COALESCE(?,product_line_name_),version_id_=COALESCE(?,version_id_),version_name_=COALESCE(?,version_name_),customer_id_=COALESCE(?,customer_id_),customer_name_=COALESCE(?,customer_name_),estimated_hours_=COALESCE(?,estimated_hours_),actual_hours_=COALESCE(?,actual_hours_),due_date_=COALESCE(?,due_date_),update_by_=?,update_time_=NOW(),version_=version_+1 WHERE id_=? AND tenant_id_=? AND delete_flag_=0", body.get("title"), body.get("description"), body.get("expectedGoal"), body.get("status"), body.get("priority"), body.get("ownerName"), body.get("productLineId"), body.get("productLineName"), body.get("versionId"), body.get("versionName"), body.get("customerId"), body.get("customerName"), body.get("estimatedHours"), body.get("actualHours"), body.get("dueDate"), RequestContext.userId(), id, RequestContext.tenantId());
        if (count == 0) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "任务不存在");
        return ApiResponse.ok(null);
    }
    private static String table(String uri) { if (uri.startsWith("/api/presales")) return "t_crm_presales_task"; if (uri.startsWith("/api/delivery")) return "t_project_delivery_task"; return "t_project_ops_task"; }
    private static String prefix(String uri) { if (uri.startsWith("/api/presales")) return "PRESALES"; if (uri.startsWith("/api/delivery")) return "DELIVERY"; return "OPS"; }
    private static String selectSql() { return "SELECT id_ AS id,code_ AS code,title_ AS title,description_ AS description,expected_goal_ AS expectedGoal,status_ AS status,priority_ AS priority,owner_name_ AS ownerName,creator_name_ AS creatorName,department_ AS department,version_id_ AS versionId,version_name_ AS versionName,product_line_id_ AS productLineId,product_line_name_ AS productLineName,customer_id_ AS customerId,customer_name_ AS customerName,estimated_hours_ AS estimatedHours,actual_hours_ AS actualHours,due_date_ AS dueDate,create_time_ AS createdAt,version_ AS version,work_item_kind_ AS workItemKind"; }
    private static String text(Map<String,Object> b,String k){return Objects.toString(b.get(k),"").trim();}
    private static String textOr(Map<String,Object> b,String k,String d){String v=text(b,k);return v.isBlank()?d:v;}
}

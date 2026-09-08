package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/product-work-items") @Profile("local")
public class ProductWorkItemController {
  private final JdbcTemplate jdbc;
  public ProductWorkItemController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
  @GetMapping public ApiResponse<List<Map<String,Object>>> list(@RequestParam String taskType) {
    String table = table(taskType); String tenant = RequestContext.tenantId();
    return ApiResponse.ok(jdbc.queryForList("SELECT id_ AS id,code_ AS code,title_ AS title,description_ AS description,product_line_id_ AS productLineId,product_line_name_ AS productLineName,version_name_ AS versionName,status_ AS status,create_time_ AS createdAt FROM " + table + " WHERE tenant_id_=? AND delete_flag_=0 ORDER BY create_time_ DESC", tenant));
  }
  @PostMapping @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> create(@RequestParam String taskType, @RequestBody Map<String,Object> body) {
    String table = table(taskType); String tenant = RequestContext.tenantId(); String id = UUID.randomUUID().toString(); String code = ("bug".equals(taskType) ? "BUG-" : "DEV-") + System.currentTimeMillis();
    String source = String.valueOf(body.getOrDefault("sourceWorkOrderIds", "[]"));
    if ("bug".equals(taskType)) jdbc.update("INSERT INTO t_product_bug(id_,tenant_id_,code_,title_,description_,product_line_id_,product_line_name_,version_name_,type_,severity_,assignee_name_,status_,source_work_order_ids_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,NOW(),NOW())", id,tenant,code,body.get("title"),body.get("description"),body.get("productLineId"),body.get("productLineName"),body.get("versionName"),body.get("type"),body.get("severity"),body.get("assigneeName"),body.getOrDefault("status","待修复"),source,RequestContext.userId(),RequestContext.userId());
    else jdbc.update("INSERT INTO t_product_dev_task(id_,tenant_id_,code_,title_,description_,product_line_id_,product_line_name_,version_name_,repo_,branch_,developer_name_,estimated_hours_,status_,source_work_order_ids_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,NOW(),NOW())", id,tenant,code,body.get("title"),body.get("description"),body.get("productLineId"),body.get("productLineName"),body.get("versionName"),body.get("repo"),body.get("branch"),body.get("developer"),body.getOrDefault("estimatedHours",0),body.getOrDefault("status","开发中"),source,RequestContext.userId(),RequestContext.userId());
    return ApiResponse.ok(Map.of("id",id,"code",code));
  }
  @PutMapping("/{id}") public ApiResponse<Void> update(@PathVariable String id,@RequestParam String taskType,@RequestBody Map<String,Object> body) {
    String table=table(taskType); jdbc.update("UPDATE "+table+" SET title_=COALESCE(?,title_),description_=COALESCE(?,description_),status_=COALESCE(?,status_),update_by_=?,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0",body.get("title"),body.get("description"),body.get("status"),RequestContext.userId(),id,RequestContext.tenantId()); return ApiResponse.ok(null);
  }
  private String table(String type) { if ("bug".equalsIgnoreCase(type)) return "t_product_bug"; if ("dev".equalsIgnoreCase(type)) return "t_product_dev_task"; throw new IllegalArgumentException("taskType must be bug or dev"); }
}

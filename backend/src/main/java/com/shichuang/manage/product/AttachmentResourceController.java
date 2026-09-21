package com.shichuang.manage.product;
import com.shichuang.manage.api.ApiResponse;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/attachments")
public class AttachmentResourceController {
  private final JdbcTemplate jdbc;
  public AttachmentResourceController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
  @PostMapping("/stage") public ApiResponse<Map<String,Object>> stage(@RequestBody Map<String,Object> body) {
    String name=Objects.toString(body.get("name"),"").trim(), mime=Objects.toString(body.get("mimeType"),"application/octet-stream");
    long size=body.get("size") instanceof Number n?n.longValue():0; if(name.isBlank()||size<=0||size>50*1024*1024) throw new IllegalArgumentException("附件名称或大小无效");
    String id=UUID.randomUUID().toString(); String key=Objects.toString(body.get("storageKey"),id);
    jdbc.update("INSERT INTO t_product_attachment_resource(id_,tenant_id_,name_,mime_type_,size_,storage_key_,scan_status_,create_by_,create_time_) VALUES(?,?,?,?,?,?, 'PENDING',?,NOW(6))",id,RequestContext.tenantId(),name,mime,size,key,RequestContext.userId());
    return ApiResponse.ok(Map.of("id",id,"name",name,"mimeType",mime,"size",size,"storageKey",key,"scanStatus","PENDING"));
  }
  @PostMapping("/{id}/bind") public ApiResponse<Map<String,Object>> bind(@PathVariable String id,@RequestBody Map<String,Object> body) {
    String visibility=Objects.toString(body.getOrDefault("visibility","SHARED"),"SHARED");
    jdbc.update("UPDATE t_product_attachment_resource SET subject_type_=?,subject_id_=?,visibility_=? WHERE tenant_id_=? AND id_=? AND delete_flag_=0",body.get("subjectType"),body.get("subjectId"),visibility,RequestContext.tenantId(),id);
    return ApiResponse.ok(Map.of("id",id,"visibility",visibility));
  }
}

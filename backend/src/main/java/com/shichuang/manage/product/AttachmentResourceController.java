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
  private final AttachmentResourceService attachments;
  public AttachmentResourceController(JdbcTemplate jdbc, AttachmentResourceService attachments) { this.jdbc = jdbc; this.attachments = attachments; }
  @PostMapping("/stage") public ApiResponse<Map<String,Object>> stage(@RequestBody Map<String,Object> body) {
    String name=Objects.toString(body.get("name"),"").trim(), mime=Objects.toString(body.get("mimeType"),"application/octet-stream");
    long size=body.get("size") instanceof Number n?n.longValue():0; if(name.isBlank()||size<=0||size>50*1024*1024) throw new IllegalArgumentException("附件名称或大小无效");
    String dataUrl=Objects.toString(body.get("dataUrl"),"");
    if(!dataUrl.startsWith("data:"+mime+";base64,")) throw new IllegalArgumentException("附件内容格式无效");
    String id=UUID.randomUUID().toString(); String key="db://attachment/"+id;
    jdbc.update("INSERT INTO t_product_attachment_resource(id_,tenant_id_,name_,mime_type_,size_,storage_key_,data_url_,scan_status_,create_by_,create_time_) VALUES(?,?,?,?,?,?,?, 'PASSED',?,NOW(6))",id,RequestContext.tenantId(),name,mime,size,key,dataUrl,RequestContext.userId());
    return ApiResponse.ok(Map.of("id",id,"name",name,"mimeType",mime,"size",size,"storageKey",key,"scanStatus","PASSED","dataUrl",dataUrl));
  }
  @PostMapping("/{id}/bind") public ApiResponse<Map<String,Object>> bind(@PathVariable String id,@RequestBody Map<String,Object> body) {
    String visibility=Objects.toString(body.getOrDefault("visibility","SHARED"),"SHARED");
    attachments.bindAll(List.of(id), Objects.toString(body.get("subjectType"), ""), Objects.toString(body.get("subjectId"), ""), visibility);
    return ApiResponse.ok(Map.of("id",id,"visibility",visibility));
  }
}

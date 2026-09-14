package com.shichuang.manage.okr.controller;
import com.shichuang.manage.api.ApiResponse;
import com.shichuang.manage.okr.service.OkrService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @Profile("local") @RequestMapping("/api/okr") @Tag(name="目标与绩效")
public class OkrController {
 private final OkrService service; public OkrController(OkrService service){this.service=service;}
 @GetMapping("/people") @Operation(summary="查询目标承接关系") public ApiResponse<List<Map<String,Object>>> people(){return ApiResponse.ok(service.people());}
 @GetMapping("/records") @Operation(summary="查询权限范围内目标与复盘") public ApiResponse<List<Map<String,Object>>> records(){return ApiResponse.ok(service.records());}
 @GetMapping("/{id}/events") @Operation(summary="查询目标与复盘操作记录") public ApiResponse<List<Map<String,Object>>> events(@PathVariable String id){return ApiResponse.ok(service.events(id));}
 @PostMapping("/records") @Operation(summary="创建目标或复盘草稿") public ApiResponse<Map<String,Object>> create(@RequestBody Map<String,Object> body){return ApiResponse.ok(service.create(body));}
 @PatchMapping("/records/{id}") @Operation(summary="保存或流转目标与复盘") public ApiResponse<Void> update(@PathVariable String id,@RequestBody Map<String,Object> body){service.update(id,body);return ApiResponse.ok(null);}
 @GetMapping("/work") @Operation(summary="归集本人或直属下属工作项") public ApiResponse<List<Map<String,Object>>> work(@RequestParam String ownerId){return ApiResponse.ok(service.work(ownerId));}
 @PutMapping("/work/link") @Operation(summary="关联工作项至本人 KR") public ApiResponse<Void> link(@RequestBody Map<String,Object> body){service.link(body);return ApiResponse.ok(null);}
 @PutMapping("/people/{id}") @Operation(summary="配置直属上级或组织根负责人") public ApiResponse<Void> reporting(@PathVariable String id,@RequestBody Map<String,Object> body){service.reporting(id,body);return ApiResponse.ok(null);}
}

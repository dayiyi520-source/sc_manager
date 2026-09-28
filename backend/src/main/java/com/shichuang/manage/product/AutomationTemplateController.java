package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/automation-template")
@Tag(name="全局自动化模板")
public class AutomationTemplateController {
 private final AutomationTemplateService service;
 public AutomationTemplateController(AutomationTemplateService service){this.service=service;}
 @GetMapping("/rules") @Operation(summary="查询自动化模板") public ApiResponse<Map<String,Object>> list(){return ApiResponse.ok(service.overview());}
 @PostMapping("/rules") @Operation(summary="创建自动化模板规则") public ApiResponse<Map<String,Object>> create(@RequestBody Map<String,Object> body){return ApiResponse.ok(service.save(null,body));}
 @PutMapping("/rules/{id}") @Operation(summary="更新自动化模板规则") public ApiResponse<Map<String,Object>> update(@PathVariable String id,@RequestBody Map<String,Object> body){return ApiResponse.ok(service.save(id,body));}
 @DeleteMapping("/rules/{id}") @Operation(summary="删除自动化模板规则") public ApiResponse<Void> delete(@PathVariable String id){service.delete(id);return ApiResponse.ok(null);}
 @PutMapping("/setting") @Operation(summary="更新自动化模板总开关") public ApiResponse<Map<String,Object>> setting(@RequestBody Map<String,Boolean> body){return ApiResponse.ok(service.setting(Boolean.TRUE.equals(body.get("enabled"))));}
}

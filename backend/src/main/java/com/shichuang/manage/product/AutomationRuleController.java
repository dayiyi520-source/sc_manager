package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/product-lines/{lineId}/automation-rules")
@Tag(name="工作项自动化规则")
public class AutomationRuleController {
    private final AutomationRuleService service;
    public AutomationRuleController(AutomationRuleService service){this.service=service;}
    @GetMapping public ApiResponse<Map<String,Object>> list(@PathVariable String lineId,@RequestParam(defaultValue="") String keyword){return ApiResponse.ok(service.overview(lineId,keyword));}
    @PostMapping @Operation(summary="创建自动化规则") public ApiResponse<Map<String,Object>> create(@PathVariable String lineId,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.save(lineId,null,b));}
    @PutMapping("/{id}") @Operation(summary="更新自动化规则") public ApiResponse<Map<String,Object>> update(@PathVariable String lineId,@PathVariable String id,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.save(lineId,id,b));}
    @DeleteMapping("/{id}") public ApiResponse<Void> delete(@PathVariable String lineId,@PathVariable String id){service.delete(lineId,id);return ApiResponse.ok(null);}
    @PutMapping("/setting") public ApiResponse<Map<String,Object>> setting(@PathVariable String lineId,@RequestBody Map<String,Boolean>b){return ApiResponse.ok(service.setting(lineId,Boolean.TRUE.equals(b.get("enabled"))));}
    @GetMapping("/logs") public ApiResponse<List<Map<String,Object>>> logs(@PathVariable String lineId){return ApiResponse.ok(service.logs(lineId));}
}

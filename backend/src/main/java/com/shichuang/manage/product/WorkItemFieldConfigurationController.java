package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/work-item-field-configurations")
@Tag(name="工作项字段配置")
public class WorkItemFieldConfigurationController {
    private final WorkItemFieldConfigurationService service;
    public WorkItemFieldConfigurationController(WorkItemFieldConfigurationService service) { this.service=service; }
    @GetMapping @Operation(summary="查询分类字段配置") public ApiResponse<Map<String,Object>> list(@RequestParam String categoryCode) { return ApiResponse.ok(service.list(categoryCode)); }
    @PutMapping("/{categoryCode}/{scene}") @Operation(summary="保存分类场景字段配置") public ApiResponse<Map<String,Object>> save(@PathVariable String categoryCode,@PathVariable String scene,@RequestBody Map<String,Object> body) { return ApiResponse.ok(service.save(categoryCode,scene,body)); }
}

package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/work-items")
@Tag(name="统一工作项存储")
public class WorkItemStorageController {
    private final WorkItemStorageService service;
    public WorkItemStorageController(WorkItemStorageService service) { this.service=service; }
    @PostMapping @Operation(summary="创建统一工作项，含测试及类型化子任务")
    public ApiResponse<Map<String,Object>> create(@RequestBody WorkItemDefinition.CreateItem body) { return ApiResponse.ok(service.create(body)); }
    @GetMapping("/{id}") @Operation(summary="读取统一核心工作项详情")
    public ApiResponse<Map<String,Object>> detail(@PathVariable String id,@RequestParam String productLineId) { return ApiResponse.ok(service.detail(productLineId,id)); }
    @GetMapping("/{id}/activities") @Operation(summary="读取工作项活动记录")
    public ApiResponse<List<Map<String,Object>>> activities(@PathVariable String id,@RequestParam String productLineId) { return ApiResponse.ok(service.activities(productLineId,id)); }
}

package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@Profile("local")
@RequestMapping("/api/work-items/{id}/relations")
@Tag(name="统一工作项关系与阻塞")
public class WorkItemRelationController {
    private final WorkItemRelationService service;
    public WorkItemRelationController(WorkItemRelationService service) { this.service=service; }
    @GetMapping @Operation(summary="读取关联、阻塞来源和限制范围")
    public ApiResponse<WorkItemRelationService.View> list(@PathVariable String id,@RequestParam String productLineId) { return ApiResponse.ok(service.list(productLineId,id)); }
    @PostMapping @Operation(summary="建立依赖、普通关联或测试发现缺陷关系")
    public ApiResponse<Map<String,Object>> create(@PathVariable String id,@RequestParam String productLineId,@RequestBody WorkItemRelationService.CreateRelation input) { return ApiResponse.ok(service.create(productLineId,id,input)); }
    @DeleteMapping("/{relationId}") @Operation(summary="按关系版本移除关联并重算阻塞")
    public ApiResponse<Void> delete(@PathVariable String id,@PathVariable String relationId,@RequestParam String productLineId,@RequestParam int revision) { service.delete(productLineId,id,relationId,revision); return ApiResponse.ok(null); }
}

package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "统一工作项", description = "兼容读取与汇总，不执行状态流转或数据迁移")
public class UnifiedWorkItemController {
    private final UnifiedWorkItemService service;
    public UnifiedWorkItemController(UnifiedWorkItemService service) { this.service = service; }

    @GetMapping("/api/work-items")
    @Operation(summary = "按产品线查询统一工作项")
    public ApiResponse<UnifiedWorkItemService.Listing> list(@RequestParam String productLineId,
        @RequestParam(defaultValue = "") String versionId, @RequestParam(defaultValue = "") String category,
        @RequestParam(defaultValue = "") String keyword, @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(service.list(productLineId, versionId, category, keyword, page, pageSize));
    }

    @GetMapping("/api/product-lines/{lineId}/versions/{versionId}/summary")
    @Operation(summary = "读取版本需求完成度及汇总限制")
    public ApiResponse<UnifiedWorkItemService.VersionSummary> version(@PathVariable String lineId, @PathVariable String versionId) {
        return ApiResponse.ok(service.versionSummary(lineId, versionId));
    }

    @GetMapping("/api/requirements/{id}/summary")
    @Operation(summary = "读取需求关联任务与当前处理人")
    public ApiResponse<UnifiedWorkItemService.RequirementSummary> requirement(@PathVariable String id, @RequestParam String productLineId) {
        return ApiResponse.ok(service.requirementSummary(productLineId, id));
    }
}

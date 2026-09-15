package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/work-items")
@Tag(name="线上问题与回归测试")
public class WorkItemRegressionController {
    private final WorkItemRegressionService service;
    public WorkItemRegressionController(WorkItemRegressionService service) { this.service=service; }
    @PostMapping("/online-issues") @Operation(summary="记录线上缺陷并保留来源")
    public ApiResponse<Map<String,Object>> online(@RequestBody WorkItemDefinition.CreateItem input) { return ApiResponse.ok(service.onlineIssue(input)); }
    @PostMapping("/{id}/regression-tests") @Operation(summary="将缺陷原子转入回归测试任务")
    public ApiResponse<Map<String,Object>> regression(@PathVariable String id,@RequestParam String productLineId,@RequestBody WorkItemRegressionService.CreateRegression input) { return ApiResponse.ok(service.create(productLineId,id,input)); }
}

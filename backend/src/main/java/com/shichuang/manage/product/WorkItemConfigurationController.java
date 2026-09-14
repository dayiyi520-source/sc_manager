package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@Profile("local")
@RequestMapping("/api/product-lines/{lineId}")
@Tag(name="工作项分类配置")
public class WorkItemConfigurationController {
    private final WorkItemConfigurationService service;
    public WorkItemConfigurationController(WorkItemConfigurationService service) { this.service=service; }
    @GetMapping("/workflows") @Operation(summary="查询分类流程版本")
    public ApiResponse<List<Map<String,Object>>> list(@PathVariable String lineId) { return ApiResponse.ok(service.workflows(lineId)); }
    @PostMapping("/workflows") @Operation(summary="创建新流程版本草稿")
    public ApiResponse<Map<String,Object>> create(@PathVariable String lineId,@RequestBody WorkItemDefinition.SaveWorkflow body) { return ApiResponse.ok(service.save(lineId,null,body)); }
    @PutMapping("/workflows/{id}") @Operation(summary="更新流程草稿")
    public ApiResponse<Map<String,Object>> update(@PathVariable String lineId,@PathVariable String id,@RequestBody WorkItemDefinition.SaveWorkflow body) { return ApiResponse.ok(service.save(lineId,id,body)); }
    @PostMapping("/workflows/{id}/publish") @Operation(summary="发布不可变流程版本")
    public ApiResponse<Map<String,Object>> publish(@PathVariable String lineId,@PathVariable String id,@RequestBody WorkItemDefinition.Revision body) { return ApiResponse.ok(service.publish(lineId,id,body.revision())); }
    @GetMapping("/child-type-rules") @Operation(summary="查询子任务类型规则")
    public ApiResponse<List<Map<String,Object>>> rules(@PathVariable String lineId) { return ApiResponse.ok(service.childRules(lineId)); }
    @PutMapping("/child-type-rules") @Operation(summary="配置允许的父子任务类型")
    public ApiResponse<List<Map<String,Object>>> rule(@PathVariable String lineId,@RequestBody WorkItemDefinition.ChildRule body) { return ApiResponse.ok(service.childRule(lineId,body)); }
}

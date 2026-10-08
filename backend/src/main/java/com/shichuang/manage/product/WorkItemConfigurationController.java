package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/product-lines/{lineId}")
@Tag(name="工作项分类配置")
public class WorkItemConfigurationController {
    private final WorkItemConfigurationService service;
    public WorkItemConfigurationController(WorkItemConfigurationService service) { this.service=service; }
    @PostMapping("/workflows/{id}/publish") @Operation(summary="发布不可变流程版本")
    public ApiResponse<Map<String,Object>> publish(@PathVariable String lineId,@PathVariable String id,@RequestBody WorkItemDefinition.Revision body) { return ApiResponse.ok(service.publish(lineId,id,body.revision())); }
    @GetMapping("/work-item-types/{typeId}/workflows") @Operation(summary="查询子类型状态配置版本")
    public ApiResponse<List<Map<String,Object>>> typeWorkflows(@PathVariable String lineId,@PathVariable String typeId) { return ApiResponse.ok(service.workflows(lineId,typeId)); }
    @PostMapping("/work-item-types/{typeId}/workflows") @Operation(summary="创建子类型状态配置草稿")
    public ApiResponse<Map<String,Object>> createTypeWorkflow(@PathVariable String lineId,@PathVariable String typeId,@RequestBody WorkItemDefinition.SaveWorkflow body) { return ApiResponse.ok(service.save(lineId,typeId,null,body)); }
    @PutMapping("/work-item-types/{typeId}/workflows/{id}") @Operation(summary="更新子类型状态配置草稿")
    public ApiResponse<Map<String,Object>> updateTypeWorkflow(@PathVariable String lineId,@PathVariable String typeId,@PathVariable String id,@RequestBody WorkItemDefinition.SaveWorkflow body) { return ApiResponse.ok(service.save(lineId,typeId,id,body)); }
    @GetMapping("/child-type-rules") @Operation(summary="查询子任务类型规则")
    public ApiResponse<List<Map<String,Object>>> rules(@PathVariable String lineId) { return ApiResponse.ok(service.childRules(lineId)); }
    @PutMapping("/child-type-rules") @Operation(summary="配置允许的父子任务类型")
    public ApiResponse<List<Map<String,Object>>> rule(@PathVariable String lineId,@RequestBody WorkItemDefinition.ChildRule body) { return ApiResponse.ok(service.childRule(lineId,body)); }
}

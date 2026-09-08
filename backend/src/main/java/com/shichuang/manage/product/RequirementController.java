package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import com.shichuang.manage.api.PageResult;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/requirements")
@Profile("local")
@Tag(name = "需求池", description = "需求收集、流转、审计与下游同步")
public class RequirementController {
    private final RequirementService service;
    public RequirementController(RequirementService service) { this.service = service; }

    @Operation(summary = "分页查询需求")
    @GetMapping
    public ApiResponse<PageResult<Map<String,Object>>> list(@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="100") int pageSize,@RequestParam(defaultValue="") String keyword,@RequestParam(defaultValue="") String productLine,@RequestParam(defaultValue="") String department,@RequestParam(defaultValue="") String priority,@RequestParam(defaultValue="") String status,@RequestParam(defaultValue="requirement") String workItemKind){return ApiResponse.ok(service.list(page,pageSize,keyword,productLine,department,priority,status,workItemKind));}
    @GetMapping("/departments") public ApiResponse<List<Map<String,Object>>> departments(){return ApiResponse.ok(service.departments());}
    @Operation(summary = "查询需求详情及流转记录")
    @GetMapping("/{id}") public ApiResponse<Map<String,Object>> detail(@PathVariable String id){return ApiResponse.ok(service.detail(id));}
    @GetMapping("/{id}/events") public ApiResponse<List<Map<String,Object>>> events(@PathVariable String id,@RequestParam(defaultValue="") String eventType,@RequestParam(defaultValue="") String operatorName){return ApiResponse.ok(service.events(id,eventType,operatorName));}
    @Operation(summary = "分页查询需求审计事件")
    @GetMapping("/audit-events") public ApiResponse<PageResult<Map<String,Object>>> auditEvents(@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="50") int pageSize,@RequestParam(defaultValue="") String requirementId,@RequestParam(defaultValue="") String eventType,@RequestParam(defaultValue="") String operatorName,@RequestParam(defaultValue="") String from,@RequestParam(defaultValue="") String to){return ApiResponse.ok(service.auditEvents(page,pageSize,requirementId,eventType,operatorName,from,to));}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> create(@RequestBody Map<String,Object>b){return ApiResponse.ok(service.create(b));}
    @PutMapping("/{id}") public ApiResponse<Void> update(@PathVariable String id,@RequestBody Map<String,Object>b){service.update(id,b);return ApiResponse.ok(null);}
    @PostMapping("/{id}/comments") public ApiResponse<Void> comment(@PathVariable String id,@RequestBody Map<String,Object>b){service.comment(id,b);return ApiResponse.ok(null);}
    @PostMapping("/{id}/transition") public ApiResponse<Void> transition(@PathVariable String id,@RequestBody Map<String,Object>b){service.transition(id,b);return ApiResponse.ok(null);}
    @Operation(summary = "创建下游工作项并同步")
    @PostMapping("/{id}/work-items") @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> createWorkItem(@PathVariable String id,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.createWorkItem(id,b));}
    @GetMapping("/work-items") public ApiResponse<List<Map<String,Object>>> workItems(@RequestParam(defaultValue="") String taskType){return ApiResponse.ok(service.workItems(taskType));}
    @Operation(summary = "查询关联工单候选")
    @GetMapping("/work-order-candidates") public ApiResponse<List<Map<String,Object>>> workOrderCandidates(@RequestParam(defaultValue="") String keyword,@RequestParam(defaultValue="") String type,@RequestParam(defaultValue="") String requirementId,@RequestParam(defaultValue="100") int limit){return ApiResponse.ok(service.workOrderCandidates(keyword,type,requirementId,limit));}
    @Operation(summary = "分页查询下游同步状态")
    @GetMapping("/work-items/sync-status") public ApiResponse<PageResult<Map<String,Object>>> syncStatus(@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="50") int pageSize,@RequestParam(defaultValue="") String taskType,@RequestParam(defaultValue="") String syncStatus){return ApiResponse.ok(service.syncStatus(page,pageSize,taskType,syncStatus));}
    @PatchMapping("/work-items/{id}/status") public ApiResponse<Void> updateWorkItemStatus(@PathVariable String id,@RequestBody Map<String,Object>b,HttpServletRequest r){service.updateWorkItemStatus(id,b);return ApiResponse.ok(null);}
    @Operation(summary = "幂等重试下游同步")
    @PostMapping("/work-items/{id}/retry") public ApiResponse<Map<String,Object>> retryWorkItem(@PathVariable String id){return ApiResponse.ok(service.retryWorkItem(id));}
}

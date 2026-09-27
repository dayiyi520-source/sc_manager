package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/work-item-template")
@Tag(name="工作项模版")
public class WorkItemTemplateController {
    private final WorkItemTemplateService service;
    public WorkItemTemplateController(WorkItemTemplateService service) { this.service=service; }
    @GetMapping @Operation(summary="查询工作项模版") public ApiResponse<List<Map<String,Object>>> list() { return ApiResponse.ok(service.list()); }
    @PostMapping("/types") @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> create(@RequestBody WorkItemDefinition.CreateWorkItemType body) { return ApiResponse.ok(service.createType(body)); }
    @PutMapping("/types/{id}") public ApiResponse<Void> update(@PathVariable String id,@RequestBody Map<String,Object> body) { service.updateType(id,body); return ApiResponse.ok(null); }
    @DeleteMapping("/types/{id}") public ApiResponse<Void> delete(@PathVariable String id) { service.deleteType(id); return ApiResponse.ok(null); }
    @PutMapping("/types/{id}/workflow") @Operation(summary="编辑工作项模版状态") public ApiResponse<Void> workflow(@PathVariable String id,@RequestBody WorkItemDefinition.SaveWorkflow body) { service.saveWorkflow(id,body); return ApiResponse.ok(null); }
}

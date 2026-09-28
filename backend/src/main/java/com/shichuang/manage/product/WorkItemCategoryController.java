package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/work-item-categories")
@Tag(name="工作项分类")
public class WorkItemCategoryController {
    private final WorkItemCategoryService service;
    public WorkItemCategoryController(WorkItemCategoryService service) { this.service = service; }
    @GetMapping @Operation(summary="查询工作项分类") public ApiResponse<List<Map<String,Object>>> list() { return ApiResponse.ok(service.list()); }
    @PostMapping @Operation(summary="新增工作项分类") public ApiResponse<Map<String,Object>> create(@RequestBody Map<String,Object> body) { return ApiResponse.ok(service.create(body)); }
    @PutMapping("/{id}") @Operation(summary="更新工作项分类展示配置") public ApiResponse<Void> update(@PathVariable String id, @RequestBody Map<String,Object> body) { service.update(id, body); return ApiResponse.ok(null); }
    @DeleteMapping("/{id}") @Operation(summary="删除自定义工作项分类") public ApiResponse<Void> delete(@PathVariable String id) { service.delete(id); return ApiResponse.ok(null); }
}

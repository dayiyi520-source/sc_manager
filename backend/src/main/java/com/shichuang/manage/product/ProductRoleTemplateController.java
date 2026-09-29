package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/research-template/roles")
@Tag(name = "产品角色模板")
public class ProductRoleTemplateController {
    private final ProductRoleTemplateService service;

    public ProductRoleTemplateController(ProductRoleTemplateService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "查询产品角色模板")
    public ApiResponse<List<Map<String, Object>>> list() {
        return ApiResponse.ok(service.list());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "创建产品角色模板")
    public ApiResponse<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(service.create(body));
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新产品角色模板")
    public ApiResponse<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(service.update(id, body));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除产品角色模板")
    public ApiResponse<Void> delete(@PathVariable String id, @RequestParam int revision) {
        service.delete(id, revision);
        return ApiResponse.ok(null);
    }
}

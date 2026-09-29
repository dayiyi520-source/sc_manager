package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/research-template/statuses")
@Tag(name = "产研模板状态")
public class ResearchStatusTemplateController {
    private final ResearchStatusTemplateService service;
    public ResearchStatusTemplateController(ResearchStatusTemplateService service) { this.service = service; }
    @GetMapping
    @Operation(summary = "查询产品或迭代状态模板")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam String scope) { return ApiResponse.ok(service.list(scope)); }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> create(@RequestParam String scope, @RequestBody Map<String, Object> body) { return ApiResponse.ok(service.create(scope, body)); }
    @PutMapping("/{id}")
    public ApiResponse<Map<String, Object>> update(@PathVariable String id, @RequestBody Map<String, Object> body) { return ApiResponse.ok(service.update(id, body)); }
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id, @RequestParam int revision) { service.delete(id, revision); return ApiResponse.ok(null); }
}

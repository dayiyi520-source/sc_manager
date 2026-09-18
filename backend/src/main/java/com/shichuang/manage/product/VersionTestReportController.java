package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static com.shichuang.manage.product.VersionTestReportDefinition.SaveReport;

@RestController
@RequestMapping("/api/product-lines/{lineId}/versions/{versionId}/test-reports")
@Tag(name = "版本测试报告")
public class VersionTestReportController {
    private final VersionTestReportService service;

    public VersionTestReportController(VersionTestReportService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "读取版本测试报告列表")
    public ApiResponse<List<Map<String, Object>>> list(@PathVariable String lineId, @PathVariable String versionId) {
        return ApiResponse.ok(service.list(lineId, versionId));
    }

    @GetMapping("/plans")
    @Operation(summary = "读取版本可关联的测试计划")
    public ApiResponse<List<Map<String, Object>>> plans(@PathVariable String lineId, @PathVariable String versionId) {
        return ApiResponse.ok(service.availablePlans(lineId, versionId));
    }

    @GetMapping("/{reportId}")
    @Operation(summary = "读取版本测试报告详情与统计")
    public ApiResponse<Map<String, Object>> detail(@PathVariable String lineId, @PathVariable String versionId, @PathVariable String reportId) {
        return ApiResponse.ok(service.detail(lineId, versionId, reportId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "新建版本测试报告")
    public ApiResponse<Map<String, Object>> create(@PathVariable String lineId, @PathVariable String versionId, @RequestBody SaveReport input) {
        return ApiResponse.ok(service.create(lineId, versionId, input));
    }

    @PutMapping("/{reportId}")
    @Operation(summary = "修改版本测试报告")
    public ApiResponse<Map<String, Object>> update(@PathVariable String lineId, @PathVariable String versionId, @PathVariable String reportId, @RequestBody SaveReport input) {
        return ApiResponse.ok(service.update(lineId, versionId, reportId, input));
    }

    @DeleteMapping("/{reportId}")
    @Operation(summary = "删除版本测试报告")
    public ApiResponse<Void> delete(@PathVariable String lineId, @PathVariable String versionId, @PathVariable String reportId, @RequestParam int revision) {
        service.delete(lineId, versionId, reportId, revision);
        return ApiResponse.ok(null);
    }
}

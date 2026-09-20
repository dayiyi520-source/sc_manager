package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test-reports")
@Tag(name = "测试报告")
public class TestReportController {
    private final VersionTestReportService service;

    public TestReportController(VersionTestReportService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "读取可访问产品线的测试报告列表")
    public ApiResponse<List<Map<String, Object>>> list() { return ApiResponse.ok(service.listAll()); }
}

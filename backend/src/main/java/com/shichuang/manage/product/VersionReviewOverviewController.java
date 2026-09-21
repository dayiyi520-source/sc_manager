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
@RequestMapping("/api/version-reviews")
@Tag(name = "版本评审")
public class VersionReviewOverviewController {
    private final VersionReviewService service;

    public VersionReviewOverviewController(VersionReviewService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "读取有权访问的版本评审")
    public ApiResponse<List<Map<String, Object>>> list() {
        return ApiResponse.ok(service.listAll());
    }
}

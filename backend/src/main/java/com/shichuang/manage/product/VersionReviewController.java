package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static com.shichuang.manage.product.VersionReviewDefinition.Revision;
import static com.shichuang.manage.product.VersionReviewDefinition.SaveReview;

@RestController
@RequestMapping("/api/product-lines/{lineId}/versions/{versionId}/reviews")
@Tag(name = "版本评审")
public class VersionReviewController {
    private final VersionReviewService service;

    public VersionReviewController(VersionReviewService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "读取版本评审历史")
    public ApiResponse<List<Map<String, Object>>> list(@PathVariable String lineId, @PathVariable String versionId) {
        return ApiResponse.ok(service.list(lineId, versionId));
    }

    @GetMapping("/{reviewId}")
    @Operation(summary = "读取版本评审详情")
    public ApiResponse<Map<String, Object>> detail(@PathVariable String lineId, @PathVariable String versionId, @PathVariable String reviewId) {
        return ApiResponse.ok(service.detail(lineId, versionId, reviewId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "新建版本评审草稿")
    public ApiResponse<Map<String, Object>> create(@PathVariable String lineId, @PathVariable String versionId, @RequestBody SaveReview input) {
        return ApiResponse.ok(service.create(lineId, versionId, input));
    }

    @PostMapping("/submit")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "新建并提交版本评审")
    public ApiResponse<Map<String, Object>> createAndSubmit(@PathVariable String lineId, @PathVariable String versionId, @RequestBody SaveReview input) {
        return ApiResponse.ok(service.createAndSubmit(lineId, versionId, input));
    }

    @PutMapping("/{reviewId}")
    @Operation(summary = "保存版本评审草稿")
    public ApiResponse<Map<String, Object>> update(@PathVariable String lineId, @PathVariable String versionId, @PathVariable String reviewId, @RequestBody SaveReview input) {
        return ApiResponse.ok(service.update(lineId, versionId, reviewId, input));
    }

    @PutMapping("/{reviewId}/submit")
    @Operation(summary = "保存并提交版本评审")
    public ApiResponse<Map<String, Object>> updateAndSubmit(@PathVariable String lineId, @PathVariable String versionId, @PathVariable String reviewId, @RequestBody SaveReview input) {
        return ApiResponse.ok(service.updateAndSubmit(lineId, versionId, reviewId, input));
    }

    @PostMapping("/{reviewId}/submit")
    @Operation(summary = "提交版本评审")
    public ApiResponse<Map<String, Object>> submit(@PathVariable String lineId, @PathVariable String versionId, @PathVariable String reviewId, @RequestBody Revision input) {
        return ApiResponse.ok(service.submit(lineId, versionId, reviewId, input));
    }

    @DeleteMapping("/{reviewId}")
    @Operation(summary = "删除版本评审")
    public ApiResponse<Void> delete(@PathVariable String lineId, @PathVariable String versionId, @PathVariable String reviewId, @RequestBody Revision input) {
        service.delete(lineId, versionId, reviewId, input);
        return ApiResponse.ok(null);
    }
}

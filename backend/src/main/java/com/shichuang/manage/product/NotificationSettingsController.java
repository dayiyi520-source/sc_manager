package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@Tag(name="通知预设与产品通知设置")
public class NotificationSettingsController {
 private final NotificationSettingsService service;
 public NotificationSettingsController(NotificationSettingsService service){this.service=service;}
 @GetMapping("/api/notification-template") @Operation(summary="查询全局通知预设") public ApiResponse<Map<String,Object>> template(){return ApiResponse.ok(service.template());}
 @PutMapping("/api/notification-template") @Operation(summary="保存全局通知预设") public ApiResponse<Map<String,Object>> saveTemplate(@RequestBody Map<String,Object> body){return ApiResponse.ok(service.saveTemplate(body));}
 @GetMapping("/api/product-lines/{lineId}/notification-settings") @Operation(summary="查询产品通知设置") public ApiResponse<Map<String,Object>> product(@PathVariable String lineId){return ApiResponse.ok(service.product(lineId));}
 @PutMapping("/api/product-lines/{lineId}/notification-settings") @Operation(summary="保存产品通知设置") public ApiResponse<Map<String,Object>> saveProduct(@PathVariable String lineId,@RequestBody Map<String,Object> body){return ApiResponse.ok(service.saveProduct(lineId,body));}
}

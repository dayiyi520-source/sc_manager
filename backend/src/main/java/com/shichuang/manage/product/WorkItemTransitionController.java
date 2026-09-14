package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@Profile("local")
@RequestMapping("/api/work-items/{id}/transitions")
@Tag(name="统一工作项状态流转")
public class WorkItemTransitionController {
    private final WorkItemTransitionService service;
    public WorkItemTransitionController(WorkItemTransitionService service) { this.service=service; }
    @GetMapping @Operation(summary="读取当前状态可执行的流转与限制")
    public ApiResponse<WorkItemTransitionService.Actions> actions(@PathVariable String id,@RequestParam String productLineId) {
        return ApiResponse.ok(service.available(productLineId,id));
    }
    @PostMapping @Operation(summary="按绑定流程执行状态流转")
    public ApiResponse<Map<String,Object>> execute(@PathVariable String id,@RequestParam String productLineId,@RequestBody WorkItemDefinition.Transition body) {
        return ApiResponse.ok(service.execute(productLineId,id,body));
    }
}

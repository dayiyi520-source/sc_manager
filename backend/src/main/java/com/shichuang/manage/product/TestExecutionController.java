package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.shichuang.manage.product.TestExecutionDefinition.*;

@RestController @Tag(name="测试计划与执行")
public class TestExecutionController {
    private final TestExecutionService service;public TestExecutionController(TestExecutionService service){this.service=service;}
    @GetMapping("/api/work-items/{id}/test-plan") @Operation(summary="读取测试子任务的测试计划") public ApiResponse<Map<String,Object>> plan(@PathVariable String id){return ApiResponse.ok(service.plan(id));}
    @PutMapping("/api/work-items/{id}/test-plan") @Operation(summary="保存测试计划与用例范围") public ApiResponse<Map<String,Object>> savePlan(@PathVariable String id,@RequestBody SavePlan input){return ApiResponse.ok(service.savePlan(id,input));}
    @GetMapping("/api/work-items/{id}/test-plans") @Operation(summary="读取测试任务的全部测试计划") public ApiResponse<List<Map<String,Object>>> plans(@PathVariable String id){return ApiResponse.ok(service.plans(id));}
    @PostMapping("/api/work-items/{id}/test-plans") @ResponseStatus(HttpStatus.CREATED) @Operation(summary="创建测试计划") public ApiResponse<Map<String,Object>> createPlan(@PathVariable String id,@RequestBody SavePlan input){return ApiResponse.ok(service.createPlan(id,input));}
    @PutMapping("/api/work-items/{id}/test-plans/{planId}") @Operation(summary="修改测试计划与用例范围") public ApiResponse<Map<String,Object>> updatePlan(@PathVariable String id,@PathVariable String planId,@RequestBody SavePlan input){return ApiResponse.ok(service.savePlan(id,planId,input));}
    @GetMapping("/api/work-items/{id}/test-executions") @Operation(summary="读取测试执行轮次") public ApiResponse<List<Map<String,Object>>> executions(@PathVariable String id){return ApiResponse.ok(service.executions(id));}
    @PostMapping("/api/work-items/{id}/test-executions") @ResponseStatus(HttpStatus.CREATED) @Operation(summary="创建人工测试执行轮次") public ApiResponse<Map<String,Object>> create(@PathVariable String id,@RequestBody CreateExecution input){return ApiResponse.ok(service.createExecution(id,input));}
    @GetMapping("/api/work-items/{id}/test-overview") @Operation(summary="读取测试主任务汇总") public ApiResponse<Map<String,Object>> overview(@PathVariable String id){return ApiResponse.ok(service.overview(id));}
    @GetMapping("/api/test-executions/{id}") @Operation(summary="读取测试执行和用例快照") public ApiResponse<Map<String,Object>> execution(@PathVariable String id){return ApiResponse.ok(service.execution(id));}
    @PostMapping("/api/test-executions/{id}/end") @Operation(summary="结束没有未执行用例的轮次") public ApiResponse<Map<String,Object>> end(@PathVariable String id,@RequestBody Revision input){return ApiResponse.ok(service.end(id,input.revision()));}
    @PutMapping("/api/test-execution-cases/{id}") @Operation(summary="保存单条用例执行结果") public ApiResponse<Map<String,Object>> result(@PathVariable String id,@RequestBody SaveResult input){return ApiResponse.ok(service.saveResult(id,input));}
    @PostMapping("/api/test-execution-cases/{id}/defects") @Operation(summary="为失败结果关联缺陷") public ApiResponse<Map<String,Object>> defect(@PathVariable String id,@RequestBody LinkDefect input){return ApiResponse.ok(service.linkDefect(id,input));}
    public record Revision(int revision){}
}

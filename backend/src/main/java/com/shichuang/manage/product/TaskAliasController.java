package com.shichuang.manage.product;
import com.shichuang.manage.api.*;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController public class TaskAliasController {
 private final TaskAliasService service; public TaskAliasController(TaskAliasService service){this.service=service;}
 @Operation(summary="查询缺陷列表") @GetMapping("/api/bugs") public ApiResponse<TaskPageResult<Map<String,Object>>> bugs(@RequestParam Map<String,String> params){return ApiResponse.ok(service.list("bug",integer(params,"page",1),integer(params,"pageSize",20),TaskListFilter.from(params)));}
 @Operation(summary="查询研发任务列表") @GetMapping("/api/dev-tasks") public ApiResponse<TaskPageResult<Map<String,Object>>> dev(@RequestParam Map<String,String> params){return ApiResponse.ok(service.list("dev",integer(params,"page",1),integer(params,"pageSize",20),TaskListFilter.from(params)));}
 @GetMapping("/api/bugs/{id}") public ApiResponse<Map<String,Object>> bug(@PathVariable String id){return ApiResponse.ok(service.detail("bug",id));}
 @GetMapping("/api/dev-tasks/{id}") public ApiResponse<Map<String,Object>> devDetail(@PathVariable String id){return ApiResponse.ok(service.detail("dev",id));}
 @PostMapping("/api/bugs") @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> createBug(@RequestBody Map<String,Object>b){return ApiResponse.ok(service.create("bug",b));}
 @PostMapping("/api/dev-tasks") @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> createDev(@RequestBody Map<String,Object>b){return ApiResponse.ok(service.create("dev",b));}
 @PutMapping("/api/bugs/{id}") public ApiResponse<Void> updateBug(@PathVariable String id,@RequestBody Map<String,Object>b){service.update("bug",id,b);return ApiResponse.ok(null);}
 @PutMapping("/api/dev-tasks/{id}") public ApiResponse<Void> updateDev(@PathVariable String id,@RequestBody Map<String,Object>b){service.update("dev",id,b);return ApiResponse.ok(null);}
 private int integer(Map<String,String> values,String key,int fallback){try{return Integer.parseInt(values.getOrDefault(key,String.valueOf(fallback)));}catch(NumberFormatException ignored){return fallback;}}
}

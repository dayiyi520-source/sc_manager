package com.shichuang.manage.product;
import com.shichuang.manage.api.*; import org.springframework.http.HttpStatus; import org.springframework.web.bind.annotation.*; import java.util.Map;
@RestController @RequestMapping("/api/design-tasks") public class DesignTaskController {
 private final TaskAliasService service; public DesignTaskController(TaskAliasService service){this.service=service;}
 @GetMapping public ApiResponse<TaskPageResult<Map<String,Object>>> list(@RequestParam Map<String,String> params){return ApiResponse.ok(service.list("design",integer(params,"page",1),integer(params,"pageSize",20),TaskListFilter.from(params)));}
 @GetMapping("/{id}") public ApiResponse<Map<String,Object>> detail(@PathVariable String id){return ApiResponse.ok(service.detail("design",id));}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> create(@RequestBody Map<String,Object>b){return ApiResponse.ok(service.create("design",b));}
 @PutMapping("/{id}") public ApiResponse<Void> update(@PathVariable String id,@RequestBody Map<String,Object>b){service.update("design",id,b);return ApiResponse.ok(null);}
 private int integer(Map<String,String> values,String key,int fallback){try{return Integer.parseInt(values.getOrDefault(key,String.valueOf(fallback)));}catch(NumberFormatException ignored){return fallback;}}
}

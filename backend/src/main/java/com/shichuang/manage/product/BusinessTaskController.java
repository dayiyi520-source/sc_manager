package com.shichuang.manage.product;
import com.shichuang.manage.api.*; import org.springframework.http.HttpStatus; import org.springframework.web.bind.annotation.*; import java.util.Map;
@RestController public class BusinessTaskController {
 private final TaskAliasService service; public BusinessTaskController(TaskAliasService service){this.service=service;}
 @GetMapping({"/api/presales-tasks","/api/delivery-tasks","/api/ops-tasks"}) public ApiResponse<TaskPageResult<Map<String,Object>>> list(@RequestParam Map<String,String> params,jakarta.servlet.http.HttpServletRequest r){return ApiResponse.ok(service.list(kind(r),integer(params,"page",1),integer(params,"pageSize",20),TaskListFilter.from(params)));}
 @GetMapping({"/api/presales-tasks/{id}","/api/delivery-tasks/{id}","/api/ops-tasks/{id}"}) public ApiResponse<Map<String,Object>> detail(@PathVariable String id,jakarta.servlet.http.HttpServletRequest r){return ApiResponse.ok(service.detail(kind(r),id));}
 @PostMapping({"/api/presales-tasks","/api/delivery-tasks","/api/ops-tasks"}) @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> create(@RequestBody Map<String,Object>b,jakarta.servlet.http.HttpServletRequest r){return ApiResponse.ok(service.create(kind(r),b));}
 @PutMapping({"/api/presales-tasks/{id}","/api/delivery-tasks/{id}","/api/ops-tasks/{id}"}) public ApiResponse<Void> update(@PathVariable String id,@RequestBody Map<String,Object>b,jakarta.servlet.http.HttpServletRequest r){service.update(kind(r),id,b);return ApiResponse.ok(null);}
 private String kind(jakarta.servlet.http.HttpServletRequest r){String u=r.getRequestURI();return u.startsWith("/api/presales")?"presales":u.startsWith("/api/delivery")?"delivery":"ops";}
 private int integer(Map<String,String> values,String key,int fallback){try{return Integer.parseInt(values.getOrDefault(key,String.valueOf(fallback)));}catch(NumberFormatException ignored){return fallback;}}
}

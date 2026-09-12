package com.shichuang.manage.product;
import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/product-lines") @Profile("local") @Tag(name="产品线管理")
public class ProductLineController {
 private final ProductLineService service; public ProductLineController(ProductLineService service){this.service=service;}
 @GetMapping public ApiResponse<List<Map<String,Object>>> list(@RequestParam(defaultValue="") String keyword){return ApiResponse.ok(service.list(keyword));}
 @GetMapping("/{id}") public ApiResponse<Map<String,Object>> detail(@PathVariable String id){return ApiResponse.ok(service.detail(id));}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> create(@RequestBody Map<String,Object>b){return ApiResponse.ok(service.create(b));}
 @PutMapping("/{id}") public ApiResponse<Void> update(@PathVariable String id,@RequestBody Map<String,Object>b){service.update(id,b);return ApiResponse.ok(null);}
 @PatchMapping("/{id}/status") public ApiResponse<Void> status(@PathVariable String id,@RequestBody Map<String,String>b){service.status(id,b.getOrDefault("status",""));return ApiResponse.ok(null);}
 @GetMapping("/{id}/members") public ApiResponse<List<Map<String,Object>>> members(@PathVariable String id){return ApiResponse.ok(service.members(id));}
 @PostMapping("/{id}/members") public ApiResponse<Void> addMember(@PathVariable String id,@RequestBody Map<String,Object>b){service.addMember(id,b);return ApiResponse.ok(null);}
 @PutMapping("/{id}/members/{memberId}") public ApiResponse<Void> updateMember(@PathVariable String id,@PathVariable String memberId,@RequestBody Map<String,Object>b){service.updateMember(id,memberId,b);return ApiResponse.ok(null);}
 @DeleteMapping("/{id}/members/{memberId}") public ApiResponse<Void> removeMember(@PathVariable String id,@PathVariable String memberId){service.removeMember(id,memberId);return ApiResponse.ok(null);}
 @GetMapping("/{id}/work-item-types") public ApiResponse<List<Map<String,Object>>> workItemTypes(@PathVariable String id,@RequestParam(required=false) String category){return ApiResponse.ok(service.workItemTypes(id,category));}
 @PostMapping("/{id}/work-item-types") @ResponseStatus(HttpStatus.CREATED) public ApiResponse<Map<String,Object>> addWorkItemType(@PathVariable String id,@RequestBody Map<String,Object>b){return ApiResponse.ok(service.addWorkItemType(id,b));}
 @PutMapping("/{id}/work-item-types/{typeId}") public ApiResponse<Void> updateWorkItemType(@PathVariable String id,@PathVariable String typeId,@RequestBody Map<String,Object>b){service.updateWorkItemType(id,typeId,b);return ApiResponse.ok(null);}
 @DeleteMapping("/{id}/work-item-types/{typeId}") public ApiResponse<Void> deleteWorkItemType(@PathVariable String id,@PathVariable String typeId){service.deleteWorkItemType(id,typeId);return ApiResponse.ok(null);}
 @GetMapping("/{id}/versions") public ApiResponse<List<Map<String,Object>>> versions(@PathVariable String id){return ApiResponse.ok(service.versions(id));}
 @PostMapping("/{id}/versions") public ApiResponse<Void> addVersion(@PathVariable String id,@RequestBody Map<String,Object>b){service.addVersion(id,b);return ApiResponse.ok(null);}
 @PutMapping("/{id}/versions/{versionId}") public ApiResponse<Void> updateVersion(@PathVariable String id,@PathVariable String versionId,@RequestBody Map<String,Object>b){service.updateVersion(id,versionId,b);return ApiResponse.ok(null);}
 @DeleteMapping("/{id}/versions/{versionId}") public ApiResponse<Void> deleteVersion(@PathVariable String id,@PathVariable String versionId){service.deleteVersion(id,versionId);return ApiResponse.ok(null);}
 @Operation(summary="将需求工作项规划至迭代版本") @PostMapping("/{id}/versions/{versionId}/requirements/{requirementId}") public ApiResponse<Void> assignRequirement(@PathVariable String id,@PathVariable String versionId,@PathVariable String requirementId){service.assignRequirement(id,versionId,requirementId);return ApiResponse.ok(null);}
 @Operation(summary="将工作项规划至迭代版本") @PostMapping("/{id}/versions/{versionId}/work-items/{kind}/{itemId}") public ApiResponse<Void> assignWorkItem(@PathVariable String id,@PathVariable String versionId,@PathVariable String kind,@PathVariable String itemId){service.assignWorkItem(id,versionId,kind,itemId);return ApiResponse.ok(null);}
 @Operation(summary="将工作项移出迭代版本") @DeleteMapping("/{id}/versions/{versionId}/work-items/{kind}/{itemId}") public ApiResponse<Void> unassignWorkItem(@PathVariable String id,@PathVariable String versionId,@PathVariable String kind,@PathVariable String itemId){service.unassignWorkItem(id,versionId,kind,itemId);return ApiResponse.ok(null);}
 @GetMapping("/{id}/activities") public ApiResponse<List<Map<String,Object>>> activities(@PathVariable String id){return ApiResponse.ok(service.activities(id));}
}

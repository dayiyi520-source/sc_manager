package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import static com.shichuang.manage.product.TestCaseDefinition.*;

@RestController
@RequestMapping("/api/product-lines/{lineId}")
@Tag(name="测试用例库")
public class TestCaseController {
    private final TestCaseService service;
    public TestCaseController(TestCaseService service){this.service=service;}
    @GetMapping("/test-case-directories") @Operation(summary="查询产品线测试用例目录")
    public ApiResponse<List<DirectoryView>> directories(@PathVariable String lineId){return ApiResponse.ok(service.directories(lineId));}
    @PostMapping("/test-case-directories") @ResponseStatus(HttpStatus.CREATED) @Operation(summary="创建测试用例目录")
    public ApiResponse<DirectoryView> createDirectory(@PathVariable String lineId,@RequestBody SaveDirectory input){return ApiResponse.ok(service.createDirectory(lineId,input));}
    @PutMapping("/test-case-directories/{directoryId}") public ApiResponse<DirectoryView> renameDirectory(@PathVariable String lineId,@PathVariable String directoryId,@RequestBody RenameDirectory input){return ApiResponse.ok(service.renameDirectory(lineId,directoryId,input));}
    @DeleteMapping("/test-case-directories/{directoryId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteDirectory(@PathVariable String lineId,@PathVariable String directoryId){service.deleteDirectory(lineId,directoryId);}
    @GetMapping("/test-cases") @Operation(summary="分页查询产品线测试用例")
    public ApiResponse<CasePage> list(@PathVariable String lineId,@RequestParam(required=false) String directoryId,@RequestParam(defaultValue="") String keyword,@RequestParam(required=false) String priority,@RequestParam(required=false) String ownerId,@RequestParam(required=false) Boolean enabled,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int pageSize){return ApiResponse.ok(service.list(lineId,new Query(directoryId,keyword,priority,ownerId,enabled,page,pageSize)));}
    @PostMapping("/test-cases") @ResponseStatus(HttpStatus.CREATED) @Operation(summary="创建产品线测试用例")
    public ApiResponse<CaseView> create(@PathVariable String lineId,@RequestBody SaveCase input){return ApiResponse.ok(service.create(lineId,input));}
    @GetMapping("/test-cases/{caseId}") @Operation(summary="读取测试用例详情")
    public ApiResponse<CaseView> detail(@PathVariable String lineId,@PathVariable String caseId){return ApiResponse.ok(service.detail(lineId,caseId));}
    @PutMapping("/test-cases/{caseId}") @Operation(summary="修改测试用例")
    public ApiResponse<CaseView> update(@PathVariable String lineId,@PathVariable String caseId,@RequestBody SaveCase input){return ApiResponse.ok(service.update(lineId,caseId,input));}
    @PutMapping("/test-cases/{caseId}/enabled") @Operation(summary="启用或停用测试用例")
    public ApiResponse<CaseView> enabled(@PathVariable String lineId,@PathVariable String caseId,@RequestBody EnabledInput input){return ApiResponse.ok(service.setEnabled(lineId,caseId,input.revision(),input.enabled()));}
    public record EnabledInput(int revision,boolean enabled){}
}

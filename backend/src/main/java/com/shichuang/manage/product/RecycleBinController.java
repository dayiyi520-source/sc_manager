package com.shichuang.manage.product;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/product-lines/{lineId}/recycle-bin")
@Tag(name="产品回收站")
public class RecycleBinController {
    private final RecycleBinService service;
    public RecycleBinController(RecycleBinService service){this.service=service;}
    @GetMapping @Operation(summary="查询产品已删除工作项") public ApiResponse<List<Map<String,Object>>> list(@PathVariable String lineId){return ApiResponse.ok(service.list(lineId));}
    @PostMapping("/{id}/restore") @Operation(summary="恢复工作项") public ApiResponse<Void> restore(@PathVariable String lineId,@PathVariable String id,@RequestBody Revision body){service.restore(lineId,id,body.revision());return ApiResponse.ok(null);}
    @DeleteMapping("/{id}") @Operation(summary="彻底删除工作项") public ApiResponse<Void> purge(@PathVariable String lineId,@PathVariable String id,@RequestParam int revision){service.purge(lineId,id,revision);return ApiResponse.ok(null);}
    public record Revision(int revision){}
}

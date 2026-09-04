package com.shichuang.manage.crm;

import com.shichuang.manage.api.ApiResponse;
import com.shichuang.manage.api.PageResult;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;

import java.util.Map;

@RestController
@RequestMapping("/api/crm")
public class CrmController {
    private final CrmService service;

    public CrmController(CrmService service) {
        this.service = service;
    }

    @GetMapping("/customers")
    public ApiResponse<PageResult<Map<String, Object>>> customers(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize, @RequestParam(defaultValue = "") String keyword, @RequestParam(defaultValue = "") String type, @RequestParam(defaultValue = "") String level) {
        return ApiResponse.ok(service.customers(page, pageSize, keyword, type, level));
    }

    @GetMapping("/customers/{id}")
    public ApiResponse<Map<String, Object>> customer(@PathVariable String id) {
        return ApiResponse.ok(service.customer(id));
    }

    @PostMapping("/customers")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> createCustomer(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(service.createCustomer(body));
    }

    @PutMapping("/customers/{id}")
    public ApiResponse<Void> updateCustomer(@PathVariable String id, @RequestBody Map<String, Object> body) {
        service.updateCustomer(id, body);
        return ApiResponse.ok(null);
    }

    @GetMapping("/journey")
    @Operation(summary = "查询客户及关联业务历程")
    public ApiResponse<PageResult<Map<String, Object>>> journey(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "100") int pageSize, @RequestParam(defaultValue = "") String customerId, @RequestParam(defaultValue = "") String leadId, @RequestParam(defaultValue = "") String opportunityId, @RequestParam(defaultValue = "") String requirementId, @RequestParam(defaultValue = "") String workItemId) {
        return ApiResponse.ok(service.journey(page, pageSize, customerId, leadId, opportunityId, requirementId, workItemId));
    }

    @GetMapping("/leads")
    @Operation(summary = "分页查询市场线索")
    public ApiResponse<PageResult<Map<String, Object>>> leads(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "100") int pageSize, @RequestParam(defaultValue = "") String keyword, @RequestParam(defaultValue = "") String status) {
        return ApiResponse.ok(service.leads(page, pageSize, keyword, status));
    }

    @PostMapping("/leads")
    @Operation(summary = "创建市场线索")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> createLead(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(service.createLead(body));
    }

    @PutMapping("/leads/{id}")
    @Operation(summary = "更新市场线索")
    public ApiResponse<Void> updateLead(@PathVariable String id, @RequestBody Map<String, Object> body) {
        service.updateLead(id, body);
        return ApiResponse.ok(null);
    }

    @PostMapping("/leads/{id}/convert")
    @Operation(summary = "将线索转换为商机")
    public ApiResponse<Map<String, Object>> convertLead(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return ApiResponse.ok(service.convertLead(id, body));
    }

    @GetMapping("/opportunities")
    public ApiResponse<PageResult<Map<String, Object>>> opportunities(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize, @RequestParam(defaultValue = "") String keyword, @RequestParam(defaultValue = "") String stage) {
        return ApiResponse.ok(service.opportunities(page, pageSize, keyword, stage));
    }

    @GetMapping("/opportunities/{id}")
    public ApiResponse<Map<String, Object>> opportunity(@PathVariable String id) {
        return ApiResponse.ok(service.opportunity(id));
    }

    @PostMapping("/opportunities")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> createOpportunity(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(service.createOpportunity(body));
    }

    @PutMapping("/opportunities/{id}")
    public ApiResponse<Void> updateOpportunity(@PathVariable String id, @RequestBody Map<String, Object> body) {
        service.updateOpportunity(id, body);
        return ApiResponse.ok(null);
    }

    @PostMapping("/opportunities/{id}/stage-transitions")
    public ApiResponse<Void> transition(@PathVariable String id, @RequestBody Map<String, Object> body) {
        service.transitionOpportunity(id, body);
        return ApiResponse.ok(null);
    }

    @GetMapping("/follow-ups")
    public ApiResponse<PageResult<Map<String, Object>>> followUps(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize, @RequestParam(defaultValue = "") String keyword, @RequestParam(defaultValue = "") String customerId, @RequestParam(defaultValue = "") String opportunityId, @RequestParam(defaultValue = "") String from, @RequestParam(defaultValue = "") String to) {
        return ApiResponse.ok(service.followUps(page, pageSize, keyword, customerId, opportunityId, from, to));
    }

    @GetMapping("/follow-ups/{id}")
    public ApiResponse<Map<String, Object>> followUp(@PathVariable String id) {
        return ApiResponse.ok(service.followUp(id));
    }

    @PostMapping("/follow-ups")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> createFollowUp(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(service.createFollowUp(body));
    }

    @GetMapping("/contracts")
    public ApiResponse<PageResult<Map<String, Object>>> contracts(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int pageSize, @RequestParam(defaultValue = "") String keyword, @RequestParam(defaultValue = "") String status) {
        return ApiResponse.ok(service.contracts(page, pageSize, keyword, status));
    }

    @GetMapping("/contracts/{id}")
    public ApiResponse<Map<String, Object>> contract(@PathVariable String id) {
        return ApiResponse.ok(service.contract(id));
    }

    @PostMapping("/contracts")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Map<String, Object>> createContract(@RequestBody Map<String, Object> body) {
        return ApiResponse.ok(service.createContract(body));
    }

    @PutMapping("/contracts/{id}")
    public ApiResponse<Void> updateContract(@PathVariable String id, @RequestBody Map<String, Object> body) {
        service.updateContract(id, body);
        return ApiResponse.ok(null);
    }

    @GetMapping("/dashboard/summary")
    public ApiResponse<Map<String, Object>> summary() {
        return ApiResponse.ok(service.dashboardSummary());
    }
}

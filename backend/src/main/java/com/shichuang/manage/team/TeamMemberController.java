package com.shichuang.manage.team;

import com.shichuang.manage.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/team-members")
@Tag(name = "团队组织")
public class TeamMemberController {
    private final TeamMemberService service;

    public TeamMemberController(TeamMemberService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "查询团队成员")
    public ApiResponse<List<TeamMemberContract.EmployeeView>> list(
        @RequestParam(defaultValue = "") String keyword,
        @RequestParam(defaultValue = "") String department,
        @RequestParam(defaultValue = "") String status
    ) {
        return ApiResponse.ok(service.list(keyword, department, status));
    }

    @GetMapping("/departments")
    @Operation(summary = "查询固定部门")
    public ApiResponse<List<String>> departments() {
        return ApiResponse.ok(service.departments());
    }

    @GetMapping("/options")
    @Operation(summary = "查询有效员工候选项")
    public ApiResponse<List<TeamMemberContract.EmployeeOption>> options() {
        return ApiResponse.ok(service.activeOptions());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "新增无登录账号的团队成员")
    public ApiResponse<TeamMemberContract.EmployeeView> create(@RequestBody TeamMemberContract.CreateEmployee input) {
        return ApiResponse.ok(service.create(input));
    }

    @PutMapping("/{id}")
    @Operation(summary = "修改团队成员")
    public ApiResponse<TeamMemberContract.EmployeeView> update(@PathVariable String id, @RequestBody TeamMemberContract.UpdateEmployee input) {
        return ApiResponse.ok(service.update(id, input));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "启用或停用团队成员")
    public ApiResponse<TeamMemberContract.EmployeeView> updateStatus(@PathVariable String id, @RequestBody TeamMemberContract.UpdateStatus input) {
        return ApiResponse.ok(service.updateStatus(id, input));
    }
}

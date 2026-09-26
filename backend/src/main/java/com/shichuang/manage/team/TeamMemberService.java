package com.shichuang.manage.team;

import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class TeamMemberService {
    public static final List<String> DEPARTMENTS = List.of(
        "专家顾问部", "市场运营部", "售前方案部", "产品规划部", "项目管理交付中心",
        "师生服务交付中心", "数据应用部", "软件研发部", "交互设计部", "人力行政部"
    );
    private static final Set<String> STATUSES = Set.of("enabled", "disabled");

    private final TeamMemberMapper mapper;

    public TeamMemberService(TeamMemberMapper mapper) {
        this.mapper = mapper;
    }

    public List<TeamMemberContract.EmployeeView> list(String keyword, String department, String status) {
        AuthorizationService.require("system:admin");
        String safeDepartment = normalize(department);
        String safeStatus = normalize(status);
        if (!safeDepartment.isEmpty() && !DEPARTMENTS.contains(safeDepartment)) throw new IllegalArgumentException("部门无效");
        if (!safeStatus.isEmpty() && !STATUSES.contains(safeStatus)) throw new IllegalArgumentException("员工状态无效");
        return mapper.list(RequestContext.tenantId(), normalize(keyword), safeDepartment, safeStatus).stream().map(this::view).toList();
    }

    public List<String> departments() {
        AuthorizationService.require("system:admin");
        return DEPARTMENTS;
    }

    public List<TeamMemberContract.EmployeeOption> activeOptions() {
        AuthorizationService.requireRead("product");
        return mapper.activeOptions(RequestContext.tenantId()).stream().map(row -> new TeamMemberContract.EmployeeOption(
            row.get("id").toString(), Objects.toString(row.get("username"), ""), row.get("name").toString(),
            Objects.toString(row.get("avatar"), ""), row.get("department").toString(), Objects.toString(row.get("role"), ""),
            Objects.toString(row.get("roleTitle"), ""), Objects.toString(row.get("jobTitle"), "")
        )).toList();
    }

    @Transactional
    public TeamMemberContract.EmployeeView create(TeamMemberContract.CreateEmployee input) {
        AuthorizationService.require("system:admin");
        TeamMemberContract.CreateEmployee clean = clean(input);
        String id = UUID.randomUUID().toString();
        mapper.insert(RequestContext.tenantId(), id, clean, RequestContext.userId());
        return view(Objects.requireNonNull(mapper.find(RequestContext.tenantId(), id)));
    }

    @Transactional
    public TeamMemberContract.EmployeeView update(String id, TeamMemberContract.UpdateEmployee input) {
        AuthorizationService.require("system:admin");
        if (input == null || input.version() == null || input.version() < 0) throw new IllegalArgumentException("数据版本不能为空");
        requireEmployee(id);
        TeamMemberContract.CreateEmployee clean = clean(new TeamMemberContract.CreateEmployee(
            input.name(), input.department(), input.jobTitle(), input.phone(), input.email()));
        TeamMemberContract.UpdateEmployee update = new TeamMemberContract.UpdateEmployee(
            clean.name(), clean.department(), clean.jobTitle(), clean.phone(), clean.email(), input.version());
        if (mapper.update(RequestContext.tenantId(), id, update, RequestContext.userId()) == 0) conflict();
        return view(Objects.requireNonNull(mapper.find(RequestContext.tenantId(), id)));
    }

    @Transactional
    public TeamMemberContract.EmployeeView updateStatus(String id, TeamMemberContract.UpdateStatus input) {
        AuthorizationService.require("system:admin");
        if (input == null || input.version() == null || input.version() < 0) throw new IllegalArgumentException("数据版本不能为空");
        if (!STATUSES.contains(input.status())) throw new IllegalArgumentException("员工状态无效");
        Map<String, Object> current = requireEmployee(id);
        if ("disabled".equals(input.status())) {
            if (Boolean.TRUE.equals(hasLogin(current))) throw new IllegalArgumentException("超级管理员不能停用");
            if (mapper.activeResponsibilities(RequestContext.tenantId(), id) > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "该员工仍是产品线负责人，请先调整负责人配置");
        }
        if (mapper.updateStatus(RequestContext.tenantId(), id, input.status(), input.version(), RequestContext.userId()) == 0) conflict();
        return view(Objects.requireNonNull(mapper.find(RequestContext.tenantId(), id)));
    }

    private TeamMemberContract.CreateEmployee clean(TeamMemberContract.CreateEmployee input) {
        if (input == null) throw new IllegalArgumentException("员工信息不能为空");
        String name = normalize(input.name());
        String department = normalize(input.department());
        String jobTitle = normalize(input.jobTitle());
        String phone = normalize(input.phone());
        String email = normalize(input.email());
        if (name.isEmpty()) throw new IllegalArgumentException("员工姓名不能为空");
        if (name.length() > 128) throw new IllegalArgumentException("员工姓名不能超过128个字符");
        if (!DEPARTMENTS.contains(department)) throw new IllegalArgumentException("部门无效");
        if (jobTitle.isEmpty()) throw new IllegalArgumentException("职位不能为空");
        if (jobTitle.length() > 128) throw new IllegalArgumentException("职位不能超过128个字符");
        if (phone.length() > 32) throw new IllegalArgumentException("手机号不能超过32个字符");
        if (email.length() > 255 || (!email.isEmpty() && !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))) throw new IllegalArgumentException("企业邮箱格式无效");
        return new TeamMemberContract.CreateEmployee(name, department, jobTitle, phone, email);
    }

    private Map<String, Object> requireEmployee(String id) {
        Map<String, Object> employee = mapper.find(RequestContext.tenantId(), id);
        if (employee == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "员工不存在");
        return employee;
    }

    private TeamMemberContract.EmployeeView view(Map<String, Object> row) {
        return new TeamMemberContract.EmployeeView(
            row.get("id").toString(), row.get("name").toString(), row.get("department").toString(),
            row.get("jobTitle").toString(), Objects.toString(row.get("phone"), ""), Objects.toString(row.get("email"), ""),
            row.get("status").toString(), hasLogin(row), ((Number) row.get("version")).intValue());
    }

    private boolean hasLogin(Map<String, Object> row) {
        return !Objects.toString(row.get("username"), "").isBlank() || "user-admin".equals(row.get("id"));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private void conflict() {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "员工信息已被修改，请刷新后重试");
    }
}

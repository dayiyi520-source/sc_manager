package com.shichuang.manage.auth;

import com.shichuang.manage.api.ApiResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Profile("local")
public class DevAuthController {
    private final JdbcTemplate jdbc;
    private final TokenService tokens;
    private final String localTenantId;
    public DevAuthController(JdbcTemplate jdbc, TokenService tokens, @Value("${string.auth.local-tenant-id:local-tenant}") String localTenantId) { this.jdbc = jdbc; this.tokens = tokens; this.localTenantId = localTenantId; }

    @GetMapping("/dev-accounts")
    public ApiResponse<java.util.List<Map<String,Object>>> accounts() {
        return ApiResponse.ok(jdbc.queryForList("SELECT id_ AS id,username_ AS username,name_ AS name,department_ AS department,role_ AS role,role_title_ AS roleTitle FROM t_sys_user WHERE tenant_id_=? AND status_='enabled' AND delete_flag_=0 ORDER BY username_", localTenantId));
    }

    @PostMapping("/dev-login")
    public ApiResponse<Map<String,Object>> login(@RequestBody Map<String,String> body) {
        String username = body.getOrDefault("username", "");
        var rows = jdbc.queryForList("SELECT id_ AS id,username_ AS username,name_ AS name,avatar_ AS avatar,department_ AS department,role_ AS role,role_title_ AS roleTitle FROM t_sys_user WHERE tenant_id_=? AND username_=? AND delete_flag_=0", localTenantId, username);
        if (rows.isEmpty()) throw new IllegalArgumentException("开发账号不存在");
        var user = new java.util.LinkedHashMap<String,Object>(rows.get(0));
        user.put("roles", java.util.List.of(user.get("role")));
        user.put("permissions", permissions(String.valueOf(user.get("role"))));
        String token = tokens.issue(String.valueOf(user.get("id")), String.valueOf(user.get("role")), localTenantId, String.valueOf(user.get("name")));
        return ApiResponse.ok(Map.of("token", token, "expiresIn", 28800, "user", user));
    }

    @GetMapping("/me")
    public ApiResponse<Map<String,Object>> me(@RequestHeader(value="Authorization", required=false) String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
        Map<String,Object> session=tokens.verify(authorization.substring(7));
        var rows=jdbc.queryForList("SELECT id_ AS id,username_ AS username,name_ AS name,avatar_ AS avatar,department_ AS department,role_ AS role,role_title_ AS roleTitle FROM t_sys_user WHERE id_=? AND tenant_id_=? AND status_='enabled' AND delete_flag_=0",session.get("sub"),session.get("tenant"));
        if(rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
        var user = new java.util.LinkedHashMap<String,Object>(rows.get(0));
        user.put("roles", java.util.List.of(user.get("role")));
        user.put("permissions", permissions(String.valueOf(user.get("role"))));
        return ApiResponse.ok(user);
    }

    private java.util.List<String> permissions(String role) {
        java.util.LinkedHashSet<String> result = new java.util.LinkedHashSet<>();
        result.add("crm:read");
        result.add("product:read");
        if (java.util.Set.of("admin", "sales_director").contains(role)) result.add("crm:write");
        if (java.util.Set.of("admin", "product_manager", "tech_lead").contains(role)) result.add("product:write");
        return java.util.List.copyOf(result);
    }

    @PostMapping("/logout") public ApiResponse<Void> logout() { return ApiResponse.ok(null); }
}

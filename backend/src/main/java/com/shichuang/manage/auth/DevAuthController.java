package com.shichuang.manage.auth;

import com.shichuang.manage.api.ApiResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Profile({"dev", "local"})
public class DevAuthController {
    private final AuthService auth;
    private final String localTenantId;
    public DevAuthController(AuthService auth, @Value("${string.auth.local-tenant-id:local-tenant}") String localTenantId) { this.auth = auth; this.localTenantId = localTenantId; }

    @GetMapping("/dev-accounts")
    public ApiResponse<java.util.List<Map<String,Object>>> accounts() {
        return ApiResponse.ok(auth.devAccounts(localTenantId));
    }

    @PostMapping("/dev-login")
    public ApiResponse<Map<String,Object>> login(@RequestBody Map<String,String> body) {
        String username = body.getOrDefault("username", "");
        return ApiResponse.ok(auth.devLogin(localTenantId, username));
    }

}

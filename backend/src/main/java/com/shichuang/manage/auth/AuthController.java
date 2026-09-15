package com.shichuang.manage.auth;
import com.shichuang.manage.api.ApiResponse;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth){this.auth=auth;}
    @PostMapping("/login") public ApiResponse<Map<String,Object>> login(@RequestBody Map<String,String> body){return ApiResponse.ok(auth.login(body.get("tenantId"),body.get("username"),body.get("password")));}
    @GetMapping("/me") public ApiResponse<Map<String,Object>> me(@RequestHeader("Authorization") String authorization){return ApiResponse.ok(auth.current(authorization.substring(7)));}
    @PostMapping("/logout") public ApiResponse<Void> logout(@RequestHeader("Authorization") String authorization){auth.logout(authorization.substring(7));return ApiResponse.ok(null);}
    @PostMapping("/bootstrap-password") public ApiResponse<Void> bootstrap(@RequestBody Map<String,String> body){auth.bootstrapPassword(body.get("tenantId"),body.get("username"),body.get("bootstrapSecret"),body.get("password"));return ApiResponse.ok(null);}
}

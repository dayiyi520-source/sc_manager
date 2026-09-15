package com.shichuang.manage.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class AuthService {
    private static final int MAX_FAILURES = 5;
    private static final int LOCK_MINUTES = 15;
    private final AuthMapper mapper; private final TokenService tokens; private final PasswordHasher passwords;
    private final String bootstrapSecret;
    public AuthService(AuthMapper mapper, TokenService tokens, PasswordHasher passwords, @Value("${string.auth.bootstrap-secret:}") String bootstrapSecret) { this.mapper=mapper; this.tokens=tokens; this.passwords=passwords; this.bootstrapSecret=bootstrapSecret; }

    @Transactional
    public Map<String,Object> login(String tenantId, String username, String password) {
        if (tenantId==null || tenantId.isBlank() || username==null || username.isBlank() || password==null || password.isBlank()) throw invalid();
        Map<String,Object> user=mapper.findLoginUser(tenantId.trim(),username.trim());
        if (user==null) throw unauthorized();
        Object lockedValue=user.get("locked_until_");
        LocalDateTime locked = lockedValue instanceof LocalDateTime value ? value : lockedValue instanceof java.sql.Timestamp value ? value.toLocalDateTime() : null;
        if (locked!=null && locked.isAfter(LocalDateTime.now())) throw new ResponseStatusException(HttpStatus.LOCKED,"登录失败次数过多，请稍后重试");
        if (!"enabled".equals(user.get("status_"))) throw unauthorized();
        if (!passwords.matches(password, Objects.toString(user.get("password_hash_"),""))) {
            int failures=((Number)user.getOrDefault("failed_login_count_",0)).intValue()+1;
            mapper.recordLoginFailure(tenantId,user.get("id_"),failures,failures>=MAX_FAILURES?LocalDateTime.now().plusMinutes(LOCK_MINUTES):null);
            throw unauthorized();
        }
        mapper.clearLoginFailures(tenantId,user.get("id_"));
        return issue(user);
    }

    public List<Map<String,Object>> devAccounts(String tenantId) {
        return mapper.enabledAccounts(tenantId);
    }

    @Transactional public Map<String,Object> devLogin(String tenantId,String username) {
        Map<String,Object> user=mapper.findEnabledUser(tenantId,username);
        if (user==null) throw new IllegalArgumentException("开发账号不存在");
        return issue(user);
    }

    @Transactional public void bootstrapPassword(String tenantId,String username,String secret,String password) {
        if (bootstrapSecret.isBlank() || !Objects.equals(bootstrapSecret,secret)) throw unauthorized();
        if (password==null || password.length()<10) throw new IllegalArgumentException("密码至少需要10个字符");
        if (mapper.initializePassword(tenantId,username,passwords.hash(password))!=1) throw new ResponseStatusException(HttpStatus.CONFLICT,"账号不存在或密码已经初始化");
    }

    public Map<String,Object> current(String token) {
        Map<String,Object> claims=tokens.verify(token); validateSession(claims);
        Map<String,Object> user=mapper.findCurrentUser(String.valueOf(claims.get("tenant")),String.valueOf(claims.get("sub")));
        if (user==null) throw unauthorized();
        user.put("roles",List.of(user.get("role"))); user.put("permissions",permissions(String.valueOf(user.get("role")))); return user;
    }
    @Transactional public void logout(String token) { Map<String,Object> c=tokens.verify(token); if(c.get("jti")!=null) mapper.revokeSession(c.get("jti"),c.get("tenant")); }
    public void validateSession(Map<String,Object> claims) { if(claims.get("jti")!=null&&!mapper.isSessionActive(claims.get("jti"),claims.get("tenant"))) throw new IllegalArgumentException("会话已失效"); }
    private Map<String,Object> issue(Map<String,Object> user) { String token=tokens.issue(String.valueOf(user.get("id_")),String.valueOf(user.get("role_")),String.valueOf(user.get("tenant_id_")),String.valueOf(user.get("name_"))); Map<String,Object> c=tokens.verify(token); mapper.createSession(c.get("jti"),user.get("tenant_id_"),user.get("id_"),LocalDateTime.now().plusHours(8)); Map<String,Object> safe=new LinkedHashMap<>(); safe.put("id",user.get("id_")); safe.put("username",user.get("username_")); safe.put("name",user.get("name_")); safe.put("avatar",user.get("avatar_")); safe.put("department",user.get("department_")); safe.put("role",user.get("role_")); safe.put("roleTitle",user.get("role_title_")); safe.put("roles",List.of(user.get("role_"))); safe.put("permissions",permissions(String.valueOf(user.get("role_")))); return Map.of("token",token,"expiresIn",28800,"user",safe); }
    private List<String> permissions(String role) { return AuthorizationService.permissions(role); }
    private ResponseStatusException unauthorized(){return new ResponseStatusException(HttpStatus.UNAUTHORIZED,"用户名或密码错误");} private IllegalArgumentException invalid(){return new IllegalArgumentException("租户、用户名和密码不能为空");}
}

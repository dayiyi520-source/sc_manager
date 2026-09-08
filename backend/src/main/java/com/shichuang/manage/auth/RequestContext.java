package com.shichuang.manage.auth;

import java.util.Map;
import java.util.Objects;

public final class RequestContext {
    private static final ThreadLocal<Session> CURRENT = new ThreadLocal<>();

    private RequestContext() {}

    public static void set(Map<String, Object> claims) {
        CURRENT.set(new Session(
            required(claims, "sub", "会话用户无效"),
            required(claims, "tenant", "会话租户无效"),
            required(claims, "role", "会话角色无效"),
            Objects.toString(claims.get("name"), Objects.toString(claims.get("role"), "开发账号"))
        ));
    }

    public static Session require() {
        Session session = CURRENT.get();
        if (session == null) throw new IllegalStateException("请求会话上下文不存在");
        return session;
    }

    public static String tenantId() { return require().tenantId(); }
    public static String userId() { return require().userId(); }
    public static String role() { return require().role(); }
    public static String operatorName() { return require().name(); }
    public static void clear() { CURRENT.remove(); }

    private static String required(Map<String, Object> claims, String key, String message) {
        String value = Objects.toString(claims.get(key), "").trim();
        if (value.isBlank()) throw new IllegalArgumentException(message);
        return value;
    }

    public record Session(String userId, String tenantId, String role, String name) {}
}

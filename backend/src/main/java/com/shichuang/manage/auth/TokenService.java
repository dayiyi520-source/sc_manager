package com.shichuang.manage.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

@Service
public class TokenService {
    private final ObjectMapper objectMapper;
    private final byte[] secret;
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    public TokenService(ObjectMapper objectMapper, @Value("${string.auth.token-secret:local-development-token-secret-change-me}") String secret) {
        this.objectMapper = objectMapper; this.secret = secret.getBytes(StandardCharsets.UTF_8);
    }
    public String issue(String userId, String role) {
        return issue(userId, role, "local-tenant", role);
    }
    public String issue(String userId, String role, String tenantId) {
        return issue(userId, role, tenantId, role);
    }
    public String issue(String userId, String role, String tenantId, String name) {
        try {
            String header = ENCODER.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
            String payload = ENCODER.encodeToString(objectMapper.writeValueAsBytes(Map.of("sub", userId, "role", role, "tenant", tenantId, "name", name, "exp", Instant.now().plusSeconds(28800).getEpochSecond())));
            String content = header + "." + payload;
            return content + "." + ENCODER.encodeToString(sign(content));
        } catch (Exception error) { throw new IllegalStateException("无法创建本地会话", error); }
    }
    @SuppressWarnings("unchecked")
    public Map<String,Object> verify(String token) {
        try {
            if (token == null || token.isBlank()) throw new IllegalArgumentException("会话格式无效");
            String[] parts = token.split("\\.");
            if (parts.length != 3 || !java.security.MessageDigest.isEqual(sign(parts[0] + "." + parts[1]), DECODER.decode(parts[2]))) throw new IllegalArgumentException("会话签名无效");
            Map<String,Object> payload = objectMapper.readValue(DECODER.decode(parts[1]), Map.class);
            Object subject = payload.get("sub");
            Object role = payload.get("role");
            Object expiry = payload.get("exp");
            Object tenant = payload.get("tenant");
            if (!(subject instanceof String subjectValue) || subjectValue.isBlank()
                || !(role instanceof String roleValue) || roleValue.isBlank()
                || !(expiry instanceof Number)) throw new IllegalArgumentException("会话声明无效");
            if (((Number) expiry).longValue() < Instant.now().getEpochSecond()) throw new IllegalArgumentException("会话已过期");
            if (!(tenant instanceof String tenantValue) || tenantValue.isBlank()) throw new IllegalArgumentException("会话租户无效");
            return payload;
        } catch (IllegalArgumentException error) { throw error; }
        catch (Exception error) { throw new IllegalArgumentException("会话格式无效"); }
    }
    private byte[] sign(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret, "HmacSHA256")); return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }
}

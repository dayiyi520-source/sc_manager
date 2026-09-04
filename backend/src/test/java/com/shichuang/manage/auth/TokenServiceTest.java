package com.shichuang.manage.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TokenServiceTest {
    private static final String SECRET = "test-token-secret";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final TokenService service = new TokenService(new ObjectMapper(), SECRET);

    @Test
    void issuesAndVerifiesSessionClaims() {
        String token = service.issue("user-1", "admin");

        Map<String, Object> claims = service.verify(token);

        assertEquals("user-1", claims.get("sub"));
        assertEquals("admin", claims.get("role"));
        assertTrue(((Number) claims.get("exp")).longValue() > Instant.now().getEpochSecond());
        assertEquals("local-tenant", claims.get("tenant"));
    }

    @Test
    void supportsConfiguredTenantAndNameClaims() {
        Map<String, Object> claims = service.verify(service.issue("user-1", "product_manager", "tenant-b", "产品经理"));
        assertEquals("tenant-b", claims.get("tenant"));
        assertEquals("产品经理", claims.get("name"));
    }

    @Test
    void rejectsTamperedSignature() {
        String token = service.issue("user-1", "admin");
        String[] parts = token.split("\\.");
        String tamperedPayload = ENCODER.encodeToString("{\"sub\":\"user-2\",\"role\":\"admin\",\"exp\":4102444800}".getBytes(StandardCharsets.UTF_8));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
            () -> service.verify(parts[0] + "." + tamperedPayload + "." + parts[2]));

        assertEquals("会话签名无效", error.getMessage());
    }

    @Test
    void rejectsExpiredSession() throws Exception {
        String header = ENCODER.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = ENCODER.encodeToString("{\"sub\":\"user-1\",\"role\":\"admin\",\"exp\":1}".getBytes(StandardCharsets.UTF_8));
        String content = header + "." + payload;
        String token = content + "." + ENCODER.encodeToString(sign(content));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> service.verify(token));

        assertEquals("会话已过期", error.getMessage());
    }

    @Test
    void rejectsSessionWithMissingClaims() throws Exception {
        String header = ENCODER.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = ENCODER.encodeToString("{\"sub\":\"user-1\",\"exp\":4102444800}".getBytes(StandardCharsets.UTF_8));
        String content = header + "." + payload;
        String token = content + "." + ENCODER.encodeToString(sign(content));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> service.verify(token));

        assertEquals("会话声明无效", error.getMessage());
    }

    private static byte[] sign(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }
}

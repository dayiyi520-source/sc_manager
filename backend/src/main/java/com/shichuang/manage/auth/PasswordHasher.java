package com.shichuang.manage.auth;

import org.springframework.stereotype.Component;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

@Component
public class PasswordHasher {
    private static final int ITERATIONS = 210_000;
    private static final int KEY_BITS = 256;
    private final SecureRandom random = new SecureRandom();

    public String hash(String password) {
        if (password == null || password.length() < 10) throw new IllegalArgumentException("密码至少需要10个字符");
        byte[] salt = new byte[16]; random.nextBytes(salt);
        return encode(password, salt, ITERATIONS);
    }

    public boolean matches(String password, String encoded) {
        try {
            String[] parts = encoded == null ? new String[0] : encoded.split("\\$");
            if (parts.length != 4 || !"pbkdf2-sha256".equals(parts[0])) return false;
            byte[] salt = Base64.getUrlDecoder().decode(parts[2]);
            byte[] expected = Base64.getUrlDecoder().decode(parts[3]);
            byte[] actual = derive(password, salt, Integer.parseInt(parts[1]));
            return MessageDigest.isEqual(actual, expected);
        } catch (Exception ignored) { return false; }
    }

    private String encode(String password, byte[] salt, int iterations) {
        return "pbkdf2-sha256$" + iterations + "$" + Base64.getUrlEncoder().withoutPadding().encodeToString(salt) + "$" + Base64.getUrlEncoder().withoutPadding().encodeToString(derive(password, salt, iterations));
    }

    private byte[] derive(String password, byte[] salt, int iterations) {
        try { return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(new PBEKeySpec(password.toCharArray(), salt, iterations, KEY_BITS)).getEncoded(); }
        catch (Exception error) { throw new IllegalStateException("密码摘要失败", error); }
    }
}

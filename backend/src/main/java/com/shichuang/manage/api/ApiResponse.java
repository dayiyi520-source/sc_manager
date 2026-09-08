package com.shichuang.manage.api;

import java.util.UUID;

public record ApiResponse<T>(String code, String message, T data, String requestId) {
    public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>("OK", "", data, UUID.randomUUID().toString()); }
}

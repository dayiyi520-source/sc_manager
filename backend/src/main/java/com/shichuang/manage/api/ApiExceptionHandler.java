package com.shichuang.manage.api;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(DuplicateKeyException.class) public ResponseEntity<ApiResponse<Void>> duplicate() { return error(HttpStatus.CONFLICT,"CONFLICT","编码已存在"); }
    @ExceptionHandler(IllegalArgumentException.class) public ResponseEntity<ApiResponse<Void>> invalid(IllegalArgumentException error) { return error(HttpStatus.BAD_REQUEST,"VALIDATION_ERROR",error.getMessage()); }
    @ExceptionHandler(ResponseStatusException.class) public ResponseEntity<ApiResponse<Void>> status(ResponseStatusException error) { return error(HttpStatus.valueOf(error.getStatusCode().value()),"REQUEST_REJECTED",error.getReason()==null?"请求被拒绝":error.getReason()); }
    private ResponseEntity<ApiResponse<Void>> error(HttpStatus status,String code,String message) { return ResponseEntity.status(status).body(new ApiResponse<>(code,message,null, UUID.randomUUID().toString())); }
}

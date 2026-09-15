package com.shichuang.manage.auth;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Set;
import java.util.ArrayList;
import java.util.List;

@Service
public class AuthorizationService {
    private static final Set<String> ALL = Set.of("crm:read", "product:read", "okr:read");
    public static void require(String permission) {
        String role = RequestContext.role();
        if (!allowed(role, permission)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "当前角色无权执行该操作");
    }
    public static void requireRead(String module) { require(module + ":read"); }
    public static void requireWrite(String module) { require(module + ":write"); }
    public static List<String> permissions(String role) {
        List<String> permissions = new ArrayList<>();
        for (String permission : List.of("crm:read", "product:read", "okr:read", "crm:write", "product:write", "okr:write", "system:admin")) {
            if (allowed(role, permission)) permissions.add(permission);
        }
        return List.copyOf(permissions);
    }
    private static boolean allowed(String role, String permission) {
        return switch (permission) {
            case "crm:write" -> Set.of("admin", "sales_director").contains(role);
            case "product:write" -> Set.of("admin", "product_manager", "tech_lead").contains(role);
            case "okr:write" -> Set.of("admin", "sales_director", "product_manager", "tech_lead").contains(role);
            case "system:admin" -> "admin".equals(role);
            default -> ALL.contains(permission) && Set.of("admin", "sales_director", "sales", "product_manager", "tech_lead", "product", "tech").contains(role);
        };
    }
}

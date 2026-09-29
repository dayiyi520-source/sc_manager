package com.shichuang.manage.product;

import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;

@Service
public class ProductRoleTemplateService {
    private final ProductRoleTemplateMapper mapper;

    public ProductRoleTemplateService(ProductRoleTemplateMapper mapper) {
        this.mapper = mapper;
    }

    public List<Map<String, Object>> list() {
        AuthorizationService.requireRead("product");
        java.util.LinkedHashMap<String, Map<String, Object>> rolesByName = new java.util.LinkedHashMap<>();
        for (Map<String, Object> role : mapper.list(RequestContext.tenantId())) {
            String roleName = Objects.toString(role.get("name"), "").trim();
            if (!roleName.isEmpty()) rolesByName.putIfAbsent(roleName, role);
        }
        return new java.util.ArrayList<>(rolesByName.values());
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> input) {
        AuthorizationService.require("system:admin");
        RoleInput role = validate(input);
        String tenantId = RequestContext.tenantId();
        requireUniqueName(tenantId, role.name(), null);
        String id = UUID.randomUUID().toString();
        mapper.insert(tenantId, id, role.name(), role.responsibility(), mapper.nextSort(tenantId), RequestContext.userId());
        return Objects.requireNonNull(mapper.find(tenantId, id));
    }

    @Transactional
    public Map<String, Object> update(String id, Map<String, Object> input) {
        AuthorizationService.require("system:admin");
        RoleInput role = validate(input);
        int revision = revision(input);
        String tenantId = RequestContext.tenantId();
        Map<String, Object> current = mapper.find(tenantId, id);
        if (current == null) throw new NoSuchElementException("角色不存在");
        String currentName = Objects.toString(current.get("name"), "");
        if (!currentName.equals(role.name()) && mapper.activeMemberCount(tenantId, currentName) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "该角色仍有产品成员使用，不能修改角色名称");
        }
        requireUniqueName(tenantId, role.name(), id);
        if (mapper.update(tenantId, id, revision, role.name(), role.responsibility(), RequestContext.userId()) != 1) {
            throw conflict();
        }
        return Objects.requireNonNull(mapper.find(tenantId, id));
    }

    @Transactional
    public void delete(String id, int revision) {
        AuthorizationService.require("system:admin");
        String tenantId = RequestContext.tenantId();
        Map<String, Object> current = mapper.find(tenantId, id);
        if (current == null) throw new NoSuchElementException("角色不存在");
        String name = Objects.toString(current.get("name"), "");
        if (mapper.activeMemberCount(tenantId, name) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "该角色仍有产品成员使用，请先调整成员角色");
        }
        if (mapper.delete(tenantId, id, revision, RequestContext.userId()) != 1) throw conflict();
    }

    public void requireActiveRole(String role) {
        String normalized = Objects.toString(role, "").trim();
        if (normalized.isEmpty() || mapper.list(RequestContext.tenantId()).stream().noneMatch(item -> normalized.equals(item.get("name")))) {
            throw new IllegalArgumentException("成员角色无效");
        }
    }

    private void requireUniqueName(String tenantId, String name, String excludedId) {
        if (mapper.activeNameExists(tenantId, name, excludedId)) throw new IllegalArgumentException("角色名称已存在");
    }

    private static RoleInput validate(Map<String, Object> input) {
        if (input == null) throw new IllegalArgumentException("角色信息不能为空");
        String name = Objects.toString(input.get("name"), "").trim();
        String responsibility = Objects.toString(input.get("responsibility"), "").trim();
        if (name.isEmpty() || name.length() > 32) throw new IllegalArgumentException("角色名称不能为空且不能超过32字");
        if (responsibility.isEmpty() || responsibility.length() > 500) throw new IllegalArgumentException("角色职责不能为空且不能超过500字");
        return new RoleInput(name, responsibility);
    }

    private static int revision(Map<String, Object> input) {
        if (!(input.get("revision") instanceof Number number) || number.intValue() < 0) throw new IllegalArgumentException("角色版本无效");
        return number.intValue();
    }

    private static ResponseStatusException conflict() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "角色已被其他人修改，请刷新后重试");
    }

    private record RoleInput(String name, String responsibility) {}
}

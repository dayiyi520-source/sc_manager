package com.shichuang.manage.product;

import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class ResearchStatusTemplateService {
    static final Set<String> SCOPES = Set.of("PRODUCT", "ITERATION");
    static final Set<String> PHASES = Set.of("待开始", "处理中", "已完成", "已结束");
    static final Set<String> COLORS = Set.of("neutral", "blue", "cyan", "green", "yellow", "red", "purple");
    private final ResearchStatusTemplateMapper mapper;

    public ResearchStatusTemplateService(ResearchStatusTemplateMapper mapper) { this.mapper = mapper; }

    public List<Map<String, Object>> list(String scope) {
        AuthorizationService.requireRead("product");
        validateScope(scope);
        return mapper.list(RequestContext.tenantId(), scope);
    }

    @Transactional
    public Map<String, Object> create(String scope, Map<String, Object> body) {
        AuthorizationService.requireWrite("product");
        StatusInput input = validate(scope, body, null);
        String tenant = RequestContext.tenantId();
        if (mapper.nameExists(tenant, scope, input.name(), "")) throw new IllegalArgumentException("状态名称已存在");
        if (input.initial()) mapper.clearInitial(tenant, scope, "", RequestContext.userId());
        String id = UUID.randomUUID().toString();
        mapper.insert(tenant, id, scope, input.name(), input.phase(), input.color(), input.initial(), input.enabled(), input.sort(), RequestContext.userId());
        return Objects.requireNonNull(mapper.find(tenant, id));
    }

    @Transactional
    public Map<String, Object> update(String id, Map<String, Object> body) {
        AuthorizationService.requireWrite("product");
        String tenant = RequestContext.tenantId();
        Map<String, Object> current = mapper.find(tenant, id);
        if (current == null) throw new java.util.NoSuchElementException("状态不存在");
        String scope = Objects.toString(current.get("scope"), "");
        String previousName = Objects.toString(current.get("name"), "");
        String previousPhase = Objects.toString(current.get("phase"), "");
        boolean previousInitial = truthy(current.get("initial"));
        boolean previousEnabled = truthy(current.get("enabled"));
        int revision = body.get("revision") instanceof Number n ? n.intValue() : -1;
        if (revision < 0) throw new IllegalArgumentException("状态版本无效");
        StatusInput input = validate(scope, body, id);
        if (mapper.nameExists(tenant, scope, input.name(), id)) throw new IllegalArgumentException("状态名称已存在");
        if (previousInitial && !input.initial()) throw new IllegalArgumentException("默认状态不能直接取消，请将其他待开始状态设为默认状态");
        if (previousInitial && !input.enabled()) throw new IllegalArgumentException("默认状态不能停用");
        if (previousEnabled && (!input.enabled() || !previousPhase.equals(input.phase())) && mapper.countPhase(tenant, scope, previousPhase) <= 1) throw new IllegalArgumentException("每个阶段至少保留一个启用状态");
        if (input.initial()) mapper.clearInitial(tenant, scope, id, RequestContext.userId());
        if (mapper.update(tenant, id, input.name(), input.phase(), input.color(), input.initial(), input.enabled(), input.sort(), revision, RequestContext.userId()) == 0) throw conflict();
        if (!previousName.equals(input.name())) mapper.renameReferences(tenant, scope, previousName, input.name(), RequestContext.userId());
        return Objects.requireNonNull(mapper.find(tenant, id));
    }

    @Transactional
    public void delete(String id, int revision) {
        AuthorizationService.requireWrite("product");
        String tenant = RequestContext.tenantId();
        Map<String, Object> current = mapper.find(tenant, id);
        if (current == null) throw new java.util.NoSuchElementException("状态不存在");
        String scope = Objects.toString(current.get("scope"), "");
        String phase = Objects.toString(current.get("phase"), "");
        if (mapper.countEnabled(tenant, scope) <= 2) throw new IllegalArgumentException("每类状态至少保留两个状态");
        if (truthy(current.get("initial"))) throw new IllegalArgumentException("默认状态不能删除，请先修改默认状态");
        if (truthy(current.get("enabled")) && mapper.countPhase(tenant, scope, phase) <= 1) throw new IllegalArgumentException("每个阶段至少保留一个启用状态");
        if (mapper.referenceCount(tenant, scope, Objects.toString(current.get("name"), "")) > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "状态仍被业务数据使用，不能删除");
        if (mapper.delete(tenant, id, revision, RequestContext.userId()) == 0) throw conflict();
    }

    private StatusInput validate(String scope, Map<String, Object> body, String id) {
        validateScope(scope);
        if (body == null) throw new IllegalArgumentException("状态信息不能为空");
        String name = Objects.toString(body.get("name"), "").trim();
        String phase = Objects.toString(body.get("phase"), "").trim();
        String color = Objects.toString(body.getOrDefault("color", "neutral"), "neutral").trim();
        if (name.isBlank() || name.length() > 64) throw new IllegalArgumentException("状态名称不能为空且不能超过64字");
        if (!PHASES.contains(phase)) throw new IllegalArgumentException("状态阶段必须是待开始、处理中、已完成或已结束");
        if (!COLORS.contains(color)) throw new IllegalArgumentException("状态颜色无效");
        boolean enabled = !Boolean.FALSE.equals(body.get("enabled"));
        boolean initial = Boolean.TRUE.equals(body.get("initial"));
        if (initial && (!enabled || !"待开始".equals(phase))) throw new IllegalArgumentException("默认状态必须启用并归属待开始阶段");
        int sort = body.get("sort") instanceof Number n ? n.intValue() : 0;
        if (sort < 0 || sort > 999) throw new IllegalArgumentException("排序必须是0-999的整数");
        return new StatusInput(name, phase, color, initial, enabled, sort);
    }

    private static void validateScope(String scope) { if (!SCOPES.contains(scope)) throw new IllegalArgumentException("状态配置范围无效"); }
    private static boolean truthy(Object value) { return value instanceof Boolean b ? b : value instanceof Number n ? n.intValue() != 0 : Boolean.parseBoolean(String.valueOf(value)); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT, "状态已被其他人修改，请刷新后重试"); }
    private record StatusInput(String name, String phase, String color, boolean initial, boolean enabled, int sort) {}
}

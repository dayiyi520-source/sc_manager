package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static com.shichuang.manage.product.VersionTestReportDefinition.SaveReport;

@Service
public class VersionTestReportService {
    private final VersionTestReportMapper mapper;
    private final WorkItemAccess access;
    private final ProductLineMapper productLines;

    public VersionTestReportService(VersionTestReportMapper mapper, WorkItemAccess access, ProductLineMapper productLines) {
        this.mapper = mapper;
        this.access = access;
        this.productLines = productLines;
    }

    public List<Map<String, Object>> listAll() {
        String tenant = RequestContext.tenantId();
        List<String> lineIds = productLines.list(tenant, "", RequestContext.userId(), "admin".equals(RequestContext.role())).stream().map(line -> String.valueOf(line.get("id"))).toList();
        return mapper.reports(tenant, lineIds);
    }

    public List<Map<String, Object>> list(String lineId, String versionId) {
        requireVersion(lineId, versionId, false);
        return mapper.reports(RequestContext.tenantId(), lineId, versionId);
    }

    public List<Map<String, Object>> availablePlans(String lineId, String versionId) {
        requireVersion(lineId, versionId, false);
        return mapper.availablePlans(RequestContext.tenantId(), lineId, versionId);
    }

    public Map<String, Object> detail(String lineId, String versionId, String reportId) {
        Map<String, Object> version = requireVersion(lineId, versionId, false);
        Map<String, Object> report = requireReport(lineId, versionId, reportId);
        List<Map<String, Object>> plans = mapper.reportPlans(RequestContext.tenantId(), reportId);
        List<Map<String, Object>> defects = mapper.defects(RequestContext.tenantId(), reportId);

        long total = plans.stream().mapToLong(plan -> number(plan.get("total"))).sum();
        long passed = plans.stream().mapToLong(plan -> number(plan.get("passed"))).sum();
        long failed = plans.stream().mapToLong(plan -> number(plan.get("failed"))).sum();
        long notExecuted = plans.stream().mapToLong(plan -> number(plan.get("notExecuted"))).sum();
        long resolved = defects.stream().filter(this::resolved).count();
        long open = defects.size() - resolved;
        long urgent = defects.stream().filter(item -> urgent(String.valueOf(item.get("priority")))).count();
        long severe = defects.stream().filter(item -> severe(String.valueOf(item.get("priority")))).count();

        plans.forEach(plan -> {
            long planTotal = number(plan.get("total"));
            plan.put("passRate", planTotal == 0 ? 0 : Math.round(number(plan.get("passed")) * 100.0 / planTotal));
            plan.put("status", plan.get("executionStatus") == null ? "未执行" : "已完成");
        });
        defects.forEach(defect -> defect.put("severity", severity(String.valueOf(defect.get("priority")))));

        Map<String, Object> result = new LinkedHashMap<>(report);
        result.put("versionName", version.get("name"));
        result.put("plans", plans);
        result.put("statistics", Map.of("total", total, "defects", defects.size(), "urgent", urgent, "severe", severe));
        result.put("resultDistribution", List.of(metric("已通过", passed), metric("未通过", failed), metric("待测试", notExecuted)));
        result.put("repairDistribution", List.of(metric("待解决", open), metric("已解决", resolved)));
        result.put("severityDistribution", distribution(defects, true));
        result.put("priorityDistribution", distribution(defects, false));
        result.put("urgentDefects", defects.stream().filter(item -> urgent(String.valueOf(item.get("priority"))) || severe(String.valueOf(item.get("priority")))).toList());
        return result;
    }

    @Transactional
    public Map<String, Object> create(String lineId, String versionId, SaveReport input) {
        requireVersion(lineId, versionId, true);
        Validated value = validate(lineId, versionId, input);
        String id = UUID.randomUUID().toString();
        mapper.insert(RequestContext.tenantId(), id, lineId, versionId, value.name(), value.summary(), RequestContext.userId(), RequestContext.operatorName());
        mapper.replacePlans(RequestContext.tenantId(), id, value.planIds(), RequestContext.userId());
        return detail(lineId, versionId, id);
    }

    @Transactional
    public Map<String, Object> update(String lineId, String versionId, String reportId, SaveReport input) {
        requireVersion(lineId, versionId, true);
        requireReport(lineId, versionId, reportId);
        if (input == null || input.revision() == null) throw new IllegalArgumentException("缺少报告版本号");
        Validated value = validate(lineId, versionId, input);
        if (mapper.update(RequestContext.tenantId(), reportId, input.revision(), value.name(), value.summary(), RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "测试报告已变化，请刷新后重试");
        }
        mapper.replacePlans(RequestContext.tenantId(), reportId, value.planIds(), RequestContext.userId());
        return detail(lineId, versionId, reportId);
    }

    @Transactional
    public void delete(String lineId, String versionId, String reportId, int revision) {
        requireVersion(lineId, versionId, true);
        requireReport(lineId, versionId, reportId);
        if (mapper.delete(RequestContext.tenantId(), reportId, revision, RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "测试报告已变化，请刷新后重试");
        }
        mapper.deletePlanLinks(RequestContext.tenantId(), reportId, RequestContext.userId());
    }

    private Map<String, Object> requireVersion(String lineId, String versionId, boolean write) {
        access.check(lineId, write);
        Map<String, Object> version = mapper.version(RequestContext.tenantId(), lineId, versionId);
        if (version == null) throw new NoSuchElementException("迭代版本不存在");
        return version;
    }

    private Map<String, Object> requireReport(String lineId, String versionId, String reportId) {
        Map<String, Object> report = mapper.report(RequestContext.tenantId(), lineId, versionId, reportId);
        if (report == null) throw new NoSuchElementException("测试报告不存在");
        return report;
    }

    private Validated validate(String lineId, String versionId, SaveReport input) {
        if (input == null) throw new IllegalArgumentException("报告内容不能为空");
        String name = Objects.toString(input.name(), "").trim();
        if (name.isBlank() || name.length() > 100) throw new IllegalArgumentException("报告名称长度应为1到100个字符");
        List<String> ids = input.testPlanIds() == null ? List.of() : input.testPlanIds().stream().filter(Objects::nonNull).map(String::trim).filter(value -> !value.isBlank()).distinct().toList();
        if (ids.isEmpty() || ids.size() > 15) throw new IllegalArgumentException("关联测试计划数量应为1到15个");
        Set<String> allowed = mapper.availablePlans(RequestContext.tenantId(), lineId, versionId).stream().map(item -> String.valueOf(item.get("id"))).collect(java.util.stream.Collectors.toSet());
        if (!allowed.containsAll(ids)) throw new IllegalArgumentException("关联测试计划不属于当前迭代或已失效");
        String summary = Objects.toString(input.summary(), "").trim();
        if (summary.length() > 10000) throw new IllegalArgumentException("报告总结不能超过10000个字符");
        return new Validated(name, ids, summary);
    }

    private List<Map<String, Object>> distribution(List<Map<String, Object>> defects, boolean bySeverity) {
        List<String> order = bySeverity ? List.of("致命", "严重", "一般", "轻微") : List.of("P0", "P1", "P2", "P3");
        Map<String, Long> counts = new LinkedHashMap<>();
        order.forEach(key -> counts.put(key, 0L));
        defects.forEach(item -> {
            String priority = normalizePriority(String.valueOf(item.get("priority")));
            String key = bySeverity ? severity(priority) : priority;
            counts.computeIfPresent(key, (ignored, count) -> count + 1);
        });
        return counts.entrySet().stream().map(entry -> metric(entry.getKey(), entry.getValue())).toList();
    }

    private Map<String, Object> metric(String name, long value) { return Map.of("name", name, "value", value); }
    private long number(Object value) { return value instanceof Number number ? number.longValue() : 0L; }
    private boolean resolved(Map<String, Object> defect) { return Boolean.TRUE.equals(defect.get("successful")) || Set.of("已解决", "已关闭", "已完成").contains(String.valueOf(defect.get("status"))); }
    private boolean urgent(String value) { return "P0".equals(normalizePriority(value)); }
    private boolean severe(String value) { return "P1".equals(normalizePriority(value)); }
    private String normalizePriority(String value) { return switch (value) { case "紧急", "最高" -> "P0"; case "高", "高优" -> "P1"; case "中", "中优" -> "P2"; case "低", "低优" -> "P3"; default -> value; }; }
    private String severity(String value) { return switch (normalizePriority(value)) { case "P0" -> "致命"; case "P1" -> "严重"; case "P2" -> "一般"; default -> "轻微"; }; }
    private record Validated(String name, List<String> planIds, String summary) {}
}

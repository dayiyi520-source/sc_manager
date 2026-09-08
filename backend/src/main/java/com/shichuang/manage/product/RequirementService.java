package com.shichuang.manage.product;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.api.PageResult;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class RequirementService {
    private final RequirementMapper mapper;
    private final WorkOrderService workOrders;
    private final ObjectMapper objectMapper;

    public RequirementService(RequirementMapper mapper, WorkOrderService workOrders, ObjectMapper objectMapper) {
        this.mapper = mapper;
        this.workOrders = workOrders;
        this.objectMapper = objectMapper;
    }

    public PageResult<Map<String, Object>> list(int page, int pageSize, String keyword, String productLine, String department, String priority, String status, String workItemKind) {
        int currentPage = Math.max(1, page);
        int size = Math.min(100, Math.max(1, pageSize));
        int offset = (currentPage - 1) * size;
        String tenantId = RequestContext.tenantId();
        String like = "%" + keyword.trim() + "%";
        String kind = "design".equalsIgnoreCase(workItemKind) ? "design" : "requirement";
        String where = "tenant_id_=? AND delete_flag_=0 AND work_item_kind_=? AND (title_ LIKE ? OR description_ LIKE ? OR owner_name_ LIKE ? OR product_line_name_ LIKE ? OR department_ LIKE ?) AND (?='' OR product_line_name_=?) AND (?='' OR department_=?) AND (?='' OR priority_=?) AND (?='' OR status_=?)";
        Object[] args = { tenantId, kind, like, like, like, like, like, productLine, productLine, department, department, priority, priority, status, status };
        return new PageResult<>(mapper.list(where, args, size, offset), currentPage, size, mapper.count(where, args));
    }

    public List<Map<String, Object>> departments() {
        return mapper.departments(RequestContext.tenantId());
    }

    public Map<String, Object> detail(String id) {
        String tenantId = RequestContext.tenantId();
        List<Map<String, Object>> rows = mapper.find(tenantId, id);
        if (rows.isEmpty()) throw notFound("需求不存在");
        Map<String, Object> result = new LinkedHashMap<>(rows.get(0));
        result.put("events", mapper.events(tenantId, id));
        result.put("workItems", mapper.workItems(tenantId, id));
        return result;
    }

    public List<Map<String, Object>> events(String id, String eventType, String operatorName) {
        String tenantId = RequestContext.tenantId();
        if (mapper.find(tenantId, id).isEmpty()) throw notFound("需求不存在");
        return mapper.events(tenantId, id, safe(eventType), safe(operatorName));
    }

    public PageResult<Map<String, Object>> auditEvents(int page, int pageSize, String requirementId, String eventType, String operatorName, String from, String to) {
        int currentPage = Math.max(1, page);
        int size = Math.min(100, Math.max(1, pageSize));
        int offset = (currentPage - 1) * size;
        String tenantId = RequestContext.tenantId();
        LocalDateTime fromTime = parseDateTime(from, false);
        LocalDateTime toTime = parseDateTime(to, true);
        return new PageResult<>(
            mapper.auditEvents(tenantId, safe(requirementId), safe(eventType), safe(operatorName), fromTime, toTime, size, offset),
            currentPage,
            size,
            mapper.auditCount(tenantId, safe(requirementId), safe(eventType), safe(operatorName), fromTime, toTime)
        );
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        String title = text(body, "title");
        String productLine = text(body, "productLineName");
        String tenantId = RequestContext.tenantId();
        String legacyDepartment = text(body, "department");
        String ownerName = text(body, "ownerName");
        if (ownerName.isBlank() && !legacyDepartment.isBlank()) ownerName = mapper.manager(tenantId, legacyDepartment);
        String department = ownerName.isBlank() ? legacyDepartment : mapper.employeeDepartment(tenantId, ownerName);
        String customerId = text(body, "customerId");
        if (title.isBlank()) throw new IllegalArgumentException("需求名称不能为空");
        if (ownerName.isBlank() || department.isBlank()) throw new IllegalArgumentException("负责人不能为空且必须是组织员工");
        if (!customerId.isBlank() && mapper.customerExists(tenantId, customerId) == 0) throw new IllegalArgumentException("关联客户无效");
        String id = UUID.randomUUID().toString();
        String code = "REQ-" + LocalDate.now().getYear() + "-" + String.format("%03d", mapper.nextCode(tenantId));
        Map<String, Object> persistenceBody = new LinkedHashMap<>(body);
        persistenceBody.put("department", department);
        persistenceBody.put("ownerName", ownerName);
        persistenceBody.put("specialFieldsJson", json(body.get("specialFields")));
        mapper.insert(tenantId, id, code, persistenceBody, RequestContext.operatorName(), RequestContext.userId(), defaultText(body, "dueDate", LocalDate.now().toString()), json(body.get("media")));
        event(id, "创建", null, "待处理", "", Map.of("ownerName", ownerName));
        mapper.notifyOwner(tenantId, ownerName, title, id);
        return Map.of("id", id, "code", code);
    }

    public void update(String id, Map<String, Object> body) {
        String tenantId = RequestContext.tenantId();
        Map<String, Object> current = mapper.lock(tenantId, id);
        if (mapper.update(tenantId, RequestContext.userId(), id, body, body.containsKey("media") ? jsonNullable(body.get("media")) : null) == 0) {
            throw conflict("需求已被其他人更新，请刷新后重试");
        }
        Map<String, String> labels = Map.ofEntries(
            Map.entry("status", "变更状态"), Map.entry("ownerName", "变更负责人"), Map.entry("ccNames", "修改参与人"),
            Map.entry("title", "修改需求名称"), Map.entry("description", "修改任务描述"), Map.entry("expectedGoal", "修改验收标准"),
            Map.entry("priority", "修改优先级"), Map.entry("productLineName", "修改所属产品线"), Map.entry("versionName", "修改迭代版本"),
            Map.entry("customerName", "修改关联客户"), Map.entry("plannedStartDate", "修改计划开始时间"), Map.entry("dueDate", "修改计划完成时间"),
            Map.entry("expectedCompleteDate", "修改期望完成时间"), Map.entry("estimatedHours", "修改预计工时")
        );
        labels.forEach((field, label) -> {
            if (!body.containsKey(field)) return;
            String before = Objects.toString(current.get(field), "");
            String after = Objects.toString(body.get(field), "");
            if (Objects.equals(before, after)) return;
            String from = "status".equals(field) ? before : "";
            String to = "status".equals(field) ? after : "";
            event(id, label, from, to, "", Map.of("from", before, "to", after));
        });
        if (body.containsKey("sourceWorkOrderIds")) {
            String before = Objects.toString(current.get("sourceWorkOrderIds"), "[]");
            String after = json(body.get("sourceWorkOrderIds"));
            if (!Objects.equals(before, after)) {
                event(id, "修改关联工单", "", "", "", Map.of("from", before, "to", after, "titles", body.getOrDefault("sourceWorkOrderTitles", List.of())));
            }
        }
    }

    @Transactional
    public void comment(String id, Map<String, Object> body) {
        String content = text(body, "content");
        if (content.isBlank()) throw new IllegalArgumentException("评论内容不能为空");
        if (mapper.find(RequestContext.tenantId(), id).isEmpty()) throw notFound("需求不存在");
        event(id, "评论", "", "", content, Map.of("content", content));
    }

    @Transactional
    public void transition(String id, Map<String, Object> body) {
        String tenantId = RequestContext.tenantId();
        Map<String, Object> current = mapper.lock(tenantId, id);
        String action = text(body, "action");
        String reason = text(body, "reason");
        String from = String.valueOf(current.get("status"));
        String to = switch (action) {
            case "hold" -> "已搁置";
            case "reject" -> "已驳回";
            default -> throw new IllegalArgumentException("不支持的需求操作");
        };
        if (reason.isBlank()) throw new IllegalArgumentException("请输入操作原因");
        if (("hold".equals(action) && !RequirementStatusPolicy.canHold(from)) || ("reject".equals(action) && !RequirementStatusPolicy.canReject(from))) {
            throw new IllegalArgumentException("当前需求状态不允许执行该操作");
        }
        if (mapper.transition(tenantId, RequestContext.userId(), id, from, to) == 0) throw conflict("需求状态已变化，请刷新后重试");
        event(id, "hold".equals(action) ? "搁置" : "驳回", from, to, reason, Map.of());
    }

    @Transactional
    public Map<String, Object> createWorkItem(String id, Map<String, Object> body) {
        String tenantId = RequestContext.tenantId();
        Map<String, Object> current = mapper.lock(tenantId, id);
        String type = text(body, "taskType");
        String assignee = text(body, "assigneeName");
        String note = text(body, "note");
        String status = String.valueOf(current.get("status"));
        if (!Set.of("产品需求", "数据需求", "缺陷管理", "设计任务", "售前任务", "交付任务", "运维任务", "研发任务", "bug修复", "Bug修复", "售前支持", "项目交付", "交付支持", "运维部署", "技术问题", "其他问题").contains(type)) throw new IllegalArgumentException("请选择有效任务类型");
        if (assignee.isBlank()) throw new IllegalArgumentException("请选择下一步负责人");
        if (!RequirementStatusPolicy.canCreateWorkItem(status)) throw new IllegalArgumentException("当前需求状态不允许转任务");
        if (mapper.activeWorkItems(tenantId, id) > 0) throw new IllegalArgumentException("该需求已有处理中任务");
        String title = defaultText(body, "title", String.valueOf(current.get("title")));
        String workId = UUID.randomUUID().toString();
        mapper.insertWorkItem(tenantId, workId, id, type, title, assignee, note, RequestContext.userId());
        if (mapper.assignWorkItem(tenantId, RequestContext.userId(), id, status, type, workId, assignee, note) == 0) throw conflict("需求状态已变化，请刷新后重试");
        event(id, "转任务", status, "处理中", note, Map.of("taskType", type, "taskId", workId, "taskTitle", title, "assigneeName", assignee, "targetPage", targetPage(type)));
        WorkOrderService.SyncResult sync;
        try {
            sync = workOrders.create(tenantId, type, workId, id, title, assignee, note, RequestContext.userId());
        } catch (RuntimeException error) {
            workOrders.markSyncFailed(tenantId, workId, error.getMessage(), RequestContext.userId());
            sync = WorkOrderService.SyncResult.failed(error.getMessage());
        }
        if (!sync.succeeded()) {
            event(id, "下游同步失败", "处理中", "处理中", sync.error(), Map.of("taskType", type, "taskId", workId, "retryable", true));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", workId);
        result.put("taskType", type);
        result.put("syncStatus", sync.status());
        result.put("retryCount", sync.succeeded() ? 0 : 1);
        if (!sync.succeeded()) result.put("syncError", sync.error());
        return result;
    }

    public List<Map<String, Object>> workItems(String type) {
        return workOrders.list(RequestContext.tenantId(), type);
    }

    public List<Map<String, Object>> workOrderCandidates(String keyword, String type, String requirementId, int limit) {
        String tenantId = RequestContext.tenantId();
        int safeLimit = Math.min(200, Math.max(1, limit));
        return mapper.workOrderCandidates(tenantId, safe(keyword), safe(type), safe(requirementId), safeLimit);
    }

    public PageResult<Map<String, Object>> syncStatus(int page, int pageSize, String taskType, String syncStatus) {
        int currentPage = Math.max(1, page);
        int size = Math.min(100, Math.max(1, pageSize));
        String normalizedType = safe(taskType);
        String normalizedStatus = safe(syncStatus).toUpperCase();
        if (!normalizedType.isBlank() && !Set.of("产品需求", "数据需求", "缺陷管理", "设计任务", "售前任务", "交付任务", "运维任务", "研发任务", "bug修复", "Bug修复", "售前支持", "项目交付", "交付支持", "运维部署", "技术问题", "其他问题").contains(normalizedType)) {
            throw new IllegalArgumentException("请选择有效任务类型");
        }
        if (!normalizedStatus.isBlank() && !Set.of("PENDING", "SUCCESS", "FAILED").contains(normalizedStatus)) {
            throw new IllegalArgumentException("请选择有效同步状态");
        }
        int offset = (currentPage - 1) * size;
        String tenantId = RequestContext.tenantId();
        return new PageResult<>(
            workOrders.syncStatus(tenantId, normalizedType, normalizedStatus, size, offset),
            currentPage,
            size,
            workOrders.syncStatusCount(tenantId, normalizedType, normalizedStatus)
        );
    }

    @Transactional
    public void updateWorkItemStatus(String id, Map<String, Object> body) {
        String status = text(body, "status");
        if (!Set.of("待处理", "处理中", "已完成", "已取消").contains(status)) throw new IllegalArgumentException("不支持的工作项状态");
        String tenantId = RequestContext.tenantId();
        Map<String, Object> item = workOrders.find(tenantId, id);
        workOrders.updateStatus(tenantId, id, status, RequestContext.userId());
        if ("已完成".equals(status)) {
            event(String.valueOf(item.get("requirementId")), "任务完成", String.valueOf(item.get("status")), "已完成", "", Map.of("taskId", id));
        }
    }

    @Transactional
    public Map<String, Object> retryWorkItem(String id) {
        String tenantId = RequestContext.tenantId();
        Map<String, Object> item = workOrders.find(tenantId, id);
        WorkOrderService.SyncResult sync = workOrders.retry(tenantId, id, RequestContext.userId());
        event(String.valueOf(item.get("requirementId")), sync.succeeded() ? "下游同步成功" : "下游同步重试失败", String.valueOf(item.get("status")), String.valueOf(item.get("status")), sync.error(), Map.of("taskId", id, "taskType", String.valueOf(item.get("taskType")), "syncStatus", sync.status()));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("syncStatus", sync.status());
        result.put("retryableFailures", workOrders.retryableFailures(tenantId));
        if (!sync.succeeded()) result.put("syncError", sync.error());
        return result;
    }

    private void event(String requirementId, String type, String from, String to, String reason, Map<String, Object> metadata) {
        try {
            mapper.event(RequestContext.tenantId(), requirementId, type, from, to, reason, RequestContext.operatorName(), RequestContext.userId(), objectMapper.writeValueAsString(metadata));
        } catch (Exception error) {
            throw new IllegalArgumentException("流转记录格式无效", error);
        }
    }

    private static String targetPage(String type) {
        return switch (type) {
            case "售前任务", "售前支持" -> "crm_presales_tasks";
            case "产品需求", "数据需求" -> "prod_req_tasks";
            case "设计任务" -> "prod_design_tasks";
            case "缺陷管理", "bug修复", "Bug修复" -> "prod_bugs";
            case "交付任务", "项目交付", "交付支持" -> "proj_delivery_tasks";
            case "运维任务", "运维部署" -> "proj_ops_tasks";
            case "研发任务", "技术问题" -> "prod_rd_tasks";
            default -> "prod_req_tasks";
        };
    }

    private String json(Object value) {
        try {
            return value == null ? "[]" : value instanceof String string ? string : objectMapper.writeValueAsString(value);
        } catch (Exception error) {
            throw new IllegalArgumentException("媒体数据格式无效");
        }
    }

    private String jsonNullable(Object value) { return value == null ? null : json(value); }

    private static LocalDateTime parseDateTime(String value, boolean endExclusive) {
        if (value == null || value.isBlank()) return null;
        try {
            if (value.length() == 10) {
                LocalDate date = LocalDate.parse(value);
                return endExclusive ? date.plusDays(1).atStartOfDay() : date.atStartOfDay();
            }
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException error) {
            throw new IllegalArgumentException("审计时间格式无效");
        }
    }

    private static String text(Map<String, Object> body, String key) { return Objects.toString(body.get(key), "").trim(); }
    private static String defaultText(Map<String, Object> body, String key, String fallback) { String value = text(body, key); return value.isBlank() ? fallback : value; }
    private static String safe(String value) { return value == null ? "" : value.trim(); }
    private ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }
    private ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
}

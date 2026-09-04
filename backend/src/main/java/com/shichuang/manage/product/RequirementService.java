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

    public PageResult<Map<String, Object>> list(int page, int pageSize, String keyword, String productLine, String department, String priority, String status) {
        int currentPage = Math.max(1, page);
        int size = Math.min(100, Math.max(1, pageSize));
        int offset = (currentPage - 1) * size;
        String tenantId = RequestContext.tenantId();
        String like = "%" + keyword.trim() + "%";
        String where = "tenant_id_=? AND delete_flag_=0 AND (title_ LIKE ? OR description_ LIKE ? OR owner_name_ LIKE ? OR product_line_name_ LIKE ? OR department_ LIKE ?) AND (?='' OR product_line_name_=?) AND (?='' OR department_=?) AND (?='' OR priority_=?) AND (?='' OR status_=?)";
        Object[] args = { tenantId, like, like, like, like, like, productLine, productLine, department, department, priority, priority, status, status };
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
        if (productLine.isBlank()) throw new IllegalArgumentException("所属产品线不能为空");
        if (ownerName.isBlank() || department.isBlank()) throw new IllegalArgumentException("负责人不能为空且必须是组织员工");
        if (customerId.isBlank() || mapper.customerExists(tenantId, customerId) == 0) throw new IllegalArgumentException("关联客户不能为空且必须有效");
        String id = UUID.randomUUID().toString();
        String code = "REQ-" + LocalDate.now().getYear() + "-" + String.format("%03d", mapper.nextCode(tenantId));
        Map<String, Object> persistenceBody = new LinkedHashMap<>(body);
        persistenceBody.put("department", department);
        persistenceBody.put("ownerName", ownerName);
        mapper.insert(tenantId, id, code, persistenceBody, RequestContext.operatorName(), RequestContext.userId(), defaultText(body, "dueDate", LocalDate.now().toString()), json(body.get("media")));
        event(id, "创建", null, "待处理", "", Map.of("ownerName", ownerName));
        mapper.notifyOwner(tenantId, ownerName, title, id);
        return Map.of("id", id, "code", code);
    }

    public void update(String id, Map<String, Object> body) {
        if (mapper.update(RequestContext.tenantId(), RequestContext.userId(), id, body, body.containsKey("media") ? jsonNullable(body.get("media")) : null) == 0) {
            throw conflict("需求已被其他人更新，请刷新后重试");
        }
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
        if (!Set.of("产品需求", "bug修复", "Bug修复", "售前支持", "项目交付", "交付支持", "运维部署", "技术问题", "其他问题").contains(type)) throw new IllegalArgumentException("请选择有效任务类型");
        if (assignee.isBlank()) throw new IllegalArgumentException("请选择下一步负责人");
        if (!RequirementStatusPolicy.canCreateWorkItem(status)) throw new IllegalArgumentException("当前需求状态不允许转任务");
        if (mapper.activeWorkItems(tenantId, id) > 0) throw new IllegalArgumentException("该需求已有处理中任务");
        String title = defaultText(body, "title", String.valueOf(current.get("title")));
        String workId = UUID.randomUUID().toString();
        mapper.insertWorkItem(tenantId, workId, id, type, title, assignee, note, RequestContext.userId());
        if (mapper.assignWorkItem(tenantId, RequestContext.userId(), id, status, type, workId, assignee, note) == 0) throw conflict("需求状态已变化，请刷新后重试");
        event(id, "转任务", status, "处理中", note, Map.of("taskType", type, "taskId", workId, "assigneeName", assignee));
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

    public PageResult<Map<String, Object>> syncStatus(int page, int pageSize, String taskType, String syncStatus) {
        int currentPage = Math.max(1, page);
        int size = Math.min(100, Math.max(1, pageSize));
        String normalizedType = safe(taskType);
        String normalizedStatus = safe(syncStatus).toUpperCase();
        if (!normalizedType.isBlank() && !Set.of("产品需求", "bug修复", "Bug修复", "售前支持", "项目交付", "交付支持", "运维部署", "技术问题", "其他问题").contains(normalizedType)) {
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

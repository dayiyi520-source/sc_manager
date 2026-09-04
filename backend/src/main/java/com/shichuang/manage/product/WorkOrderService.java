package com.shichuang.manage.product;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class WorkOrderService {
    private final WorkOrderMapper mapper;

    public WorkOrderService(WorkOrderMapper mapper) { this.mapper = mapper; }

    public SyncResult create(String tenantId, String taskType, String id, String requirementId, String title, String assignee, String note, String operator) {
        try {
            mapper.create(tenantId, taskType, id, requirementId, title, assignee, note, operator);
            mapper.markSyncSucceeded(tenantId, id, operator);
            return SyncResult.success();
        } catch (RuntimeException error) {
            mapper.markSyncFailed(tenantId, id, error.getMessage(), operator);
            return SyncResult.failed(error.getMessage());
        }
    }

    public List<Map<String, Object>> list(String tenantId, String taskType) {
        return mapper.list(tenantId, taskType);
    }

    public List<Map<String, Object>> syncStatus(String tenantId, String taskType, String syncStatus, int size, int offset) {
        return mapper.syncStatus(tenantId, taskType, syncStatus, size, offset);
    }

    public long syncStatusCount(String tenantId, String taskType, String syncStatus) {
        return mapper.syncStatusCount(tenantId, taskType, syncStatus);
    }

    public void updateStatus(String tenantId, String workId, String status, String operator) {
        if (!List.of("待处理", "处理中", "已完成", "已取消").contains(status)) throw new IllegalArgumentException("不支持的工作项状态");
        Map<String, Object> item = mapper.lock(tenantId, workId);
        if (!"SUCCESS".equals(item.get("syncStatus"))) throw new IllegalArgumentException("下游任务尚未同步成功，请先重试同步");
        if (mapper.updateStatus(tenantId, workId, status, operator) == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "工作项状态已变化，请刷新后重试");
        if ("已完成".equals(status) && mapper.markRequirementCompleted(tenantId, String.valueOf(item.get("requirementId")), operator) == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "需求状态已变化，请刷新后重试");
        }
    }

    public Map<String, Object> find(String tenantId, String workId) {
        return mapper.find(tenantId, workId);
    }

    @Transactional
    public SyncResult retry(String tenantId, String workId, String operator) {
        Map<String, Object> item = mapper.downstreamPayload(tenantId, workId);
        String taskType = String.valueOf(item.get("taskType"));
        if (mapper.downstreamExists(tenantId, taskType, workId)) {
            mapper.markSyncSucceeded(tenantId, workId, operator);
            return SyncResult.success();
        }
        mapper.markSyncPending(tenantId, workId, operator);
        return create(tenantId, taskType, workId, String.valueOf(item.get("requirementId")), String.valueOf(item.get("title")), String.valueOf(item.get("assigneeName")), String.valueOf(item.getOrDefault("note", "")), operator);
    }

    public List<Map<String, Object>> dueRetries(int limit) {
        return mapper.dueRetries(limit);
    }

    public int retryableFailures(String tenantId) {
        return mapper.retryableFailures(tenantId);
    }

    public void markSyncFailed(String tenantId, String workId, String error, String operator) {
        mapper.markSyncFailed(tenantId, workId, error, operator);
    }

    public record SyncResult(String status, String error) {
        static SyncResult success() { return new SyncResult("SUCCESS", ""); }
        static SyncResult failed(String error) { return new SyncResult("FAILED", error == null ? "下游同步失败" : error); }
        public boolean succeeded() { return "SUCCESS".equals(status); }
    }
}

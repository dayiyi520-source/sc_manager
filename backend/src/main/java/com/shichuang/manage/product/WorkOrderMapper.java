package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public class WorkOrderMapper {
    private final JdbcTemplate jdbc;

    public WorkOrderMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void create(String tenantId, String taskType, String id, String requirementId, String title, String assignee, String note, String operator) {
        String table = table(taskType);
        if ("产品需求".equals(taskType)) {
            jdbc.update("INSERT INTO " + table + " (id_,tenant_id_,requirement_id_,task_type_,title_,assignee_name_,note_,status_,create_by_,update_by_,version_,create_time_,update_time_) VALUES (?,?,?,?,?,?,?,'待处理',?,?,0,NOW(),NOW())", id, tenantId, requirementId, taskType, title, assignee, note, operator, operator);
        } else {
            jdbc.update("INSERT INTO " + table + " (id_,tenant_id_,requirement_id_,title_,assignee_name_,note_,status_,create_by_,update_by_,version_,create_time_,update_time_) VALUES (?,?,?,?,?,?,'待处理',?,?,0,NOW(),NOW())", id, tenantId, requirementId, title, assignee, note, operator, operator);
        }
    }

    public boolean downstreamExists(String tenantId, String taskType, String id) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + table(taskType) + " WHERE id_=? AND tenant_id_=? AND delete_flag_=0", Integer.class, id, tenantId);
        return count != null && count > 0;
    }

    public Map<String, Object> downstreamPayload(String tenantId, String workId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id_ AS id,tenant_id_ AS tenantId,requirement_id_ AS requirementId,task_type_ AS taskType,title_ AS title,assignee_name_ AS assigneeName,note_ AS note,status_ AS status,sync_status_ AS syncStatus,retry_count_ AS retryCount,update_by_ AS updateBy FROM t_requirement_work_item WHERE id_=? AND tenant_id_=? AND delete_flag_=0", workId, tenantId);
        if (rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "工作项不存在");
        return rows.get(0);
    }

    public List<Map<String, Object>> list(String tenantId, String taskType) {
        return jdbc.queryForList(RequirementMapper.workItemSql() + " AND (?='' OR w.task_type_=?) ORDER BY w.create_time_ DESC", tenantId, taskType, taskType);
    }

    public List<Map<String, Object>> syncStatus(String tenantId, String taskType, String syncStatus, int size, int offset) {
        return jdbc.queryForList(RequirementMapper.workItemSql() + " AND (?='' OR w.task_type_=?) AND (?='' OR w.sync_status_=?) ORDER BY CASE w.sync_status_ WHEN 'FAILED' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,w.next_retry_time_ ASC,w.update_time_ DESC LIMIT ? OFFSET ?", tenantId, taskType, taskType, syncStatus, syncStatus, size, offset);
    }

    public long syncStatusCount(String tenantId, String taskType, String syncStatus) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM t_requirement_work_item w JOIN t_product_requirement r ON r.id_=w.requirement_id_ AND r.tenant_id_=w.tenant_id_ AND r.delete_flag_=0 WHERE w.tenant_id_=? AND w.delete_flag_=0 AND (?='' OR w.task_type_=?) AND (?='' OR w.sync_status_=?)", Long.class, tenantId, taskType, taskType, syncStatus, syncStatus);
        return count == null ? 0 : count;
    }

    public Map<String, Object> lock(String tenantId, String workId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT requirement_id_ AS requirementId,task_type_ AS taskType,status_ AS status,sync_status_ AS syncStatus FROM t_requirement_work_item WHERE id_=? AND tenant_id_=? AND delete_flag_=0 FOR UPDATE", workId, tenantId);
        if (rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "工作项不存在");
        return rows.get(0);
    }

    public Map<String, Object> find(String tenantId, String workId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT requirement_id_ AS requirementId,task_type_ AS taskType,status_ AS status,sync_status_ AS syncStatus,retry_count_ AS retryCount,last_error_ AS lastError FROM t_requirement_work_item WHERE id_=? AND tenant_id_=? AND delete_flag_=0", workId, tenantId);
        if (rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "工作项不存在");
        return rows.get(0);
    }

    public int updateStatus(String tenantId, String workId, String status, String operator) {
        Map<String, Object> item = lock(tenantId, workId);
        int updated = jdbc.update("UPDATE t_requirement_work_item SET status_=?,update_by_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0 AND status_=?", status, operator, workId, tenantId, item.get("status"));
        if (updated > 0) {
            int downstreamUpdated = jdbc.update("UPDATE " + table(String.valueOf(item.get("taskType"))) + " SET status_=?,update_by_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0", status, operator, workId, tenantId);
            if (downstreamUpdated == 0) throw new IllegalStateException("下游任务记录不存在，无法同步状态");
        }
        return updated;
    }

    public int markRequirementCompleted(String tenantId, String requirementId, String operator) {
        return jdbc.update("UPDATE t_product_requirement SET status_='已完成',update_by_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0", operator, requirementId, tenantId);
    }

    public void markSyncSucceeded(String tenantId, String workId, String operator) {
        jdbc.update("UPDATE t_requirement_work_item SET sync_status_='SUCCESS',last_error_=NULL,next_retry_time_=NULL,last_sync_time_=NOW(),update_by_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0", operator, workId, tenantId);
    }

    public void markSyncFailed(String tenantId, String workId, String error, String operator) {
        jdbc.update("UPDATE t_requirement_work_item SET sync_status_='FAILED',retry_count_=retry_count_+1,last_error_=?,next_retry_time_=DATE_ADD(NOW(), INTERVAL LEAST(60, POW(2, LEAST(retry_count_, 5))) MINUTE),last_sync_time_=NOW(),update_by_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0", truncate(error), operator, workId, tenantId);
    }

    public void markSyncPending(String tenantId, String workId, String operator) {
        jdbc.update("UPDATE t_requirement_work_item SET sync_status_='PENDING',next_retry_time_=NOW(),update_by_=?,version_=version_+1,update_time_=NOW() WHERE id_=? AND tenant_id_=? AND delete_flag_=0", operator, workId, tenantId);
    }

    public List<Map<String, Object>> dueRetries(int limit) {
        return jdbc.queryForList("SELECT id_ AS id,tenant_id_ AS tenantId FROM t_requirement_work_item WHERE delete_flag_=0 AND sync_status_ IN ('PENDING','FAILED') AND retry_count_<5 AND (next_retry_time_ IS NULL OR next_retry_time_<=NOW()) ORDER BY COALESCE(next_retry_time_,create_time_) LIMIT ?", limit);
    }

    public int retryableFailures(String tenantId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM t_requirement_work_item WHERE tenant_id_=? AND delete_flag_=0 AND sync_status_ IN ('PENDING','FAILED') AND retry_count_<5", Integer.class, tenantId);
        return count == null ? 0 : count;
    }

    private static String table(String taskType) {
        return switch (taskType) {
            case "售前支持" -> "t_crm_presales_ticket";
            case "项目交付", "交付支持" -> "t_project_delivery_ticket";
            case "产品需求" -> "t_product_requirement_task";
            case "bug修复", "Bug修复" -> "t_product_bug";
            default -> throw new IllegalArgumentException("请选择有效任务类型");
        };
    }

    private static String truncate(String error) {
        String value = error == null || error.isBlank() ? "下游同步失败" : error;
        return value.length() <= 1000 ? value : value.substring(0, 1000);
    }
}

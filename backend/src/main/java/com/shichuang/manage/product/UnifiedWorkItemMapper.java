package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class UnifiedWorkItemMapper {
    private final JdbcTemplate jdbc;

    public UnifiedWorkItemMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    static final String CORE = "SELECT id_ AS id, category_ AS category, 'core' AS source, code_ AS code, title_ AS title, product_line_id_ AS productLineId, version_id_ AS versionId, requirement_id_ AS requirementId, assignee_name_ AS assigneeName, status_name_ AS status, "
        + "priority_ AS priority, planned_end_date_ AS dueDate, estimated_hours_ AS estimatedHours, actual_hours_ AS actualHours, create_time_ AS createdAt, task_type_id_ AS taskTypeId, workflow_id_ AS workflowId, status_key_ AS statusKey, status_group_ AS statusGroup, status_color_ AS statusColor, successful_ AS successful, parent_work_item_id_ AS parentWorkItemId, assignee_id_ AS assigneeId"
        + " FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND delete_flag_=0";

    public List<Map<String, Object>> byProductLine(String tenant, String lineId) {
        return jdbc.queryForList("SELECT * FROM (" + CORE + ") items ORDER BY createdAt DESC,category,id", tenant, lineId);
    }

    public boolean canRead(String tenant, String lineId, String userId) {
        Integer count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM t_product_line p
            WHERE p.tenant_id_=? AND p.id_=? AND p.delete_flag_=0
              AND (COALESCE(NULLIF(p.visibility_,''),'公开')='公开' OR p.create_by_=?
                OR (p.visibility_='私密' AND EXISTS (
                  SELECT 1 FROM t_product_line_member m WHERE m.tenant_id_=p.tenant_id_
                    AND m.product_line_id_=p.id_ AND m.user_id_=? AND m.delete_flag_=0)))
            """, Integer.class, tenant, lineId, userId, userId);
        return count != null && count > 0;
    }
}

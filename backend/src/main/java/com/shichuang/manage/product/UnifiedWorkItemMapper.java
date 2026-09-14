package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class UnifiedWorkItemMapper {
    private final JdbcTemplate jdbc;

    public UnifiedWorkItemMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Fixed SQL identifiers only. Dedicated design rows supersede retained migration copies. */
    private static String select(String table, String category, String source, String owner, String requirement) {
        return "SELECT t.id_ AS id, '" + category + "' AS category, '" + source + "' AS source, "
            + "t.code_ AS code,t.title_ AS title,t.product_line_id_ AS productLineId,t.version_id_ AS versionId,"
            + requirement + " AS requirementId," + owner + " AS assigneeName,t.status_ AS status,"
            + "t.priority_ AS priority,t.due_date_ AS dueDate,t.estimated_hours_ AS estimatedHours,"
            + "t.actual_hours_ AS actualHours,t.create_time_ AS createdAt,NULL AS taskTypeId,NULL AS workflowId,NULL AS statusKey,"
            + "NULL AS statusGroup,NULL AS successful,NULL AS parentWorkItemId,NULL AS assigneeId FROM " + table + " t "
            + "WHERE t.tenant_id_=? AND t.product_line_id_=? AND t.delete_flag_=0";
    }

    static final String UNION = select("t_product_requirement", "requirement", "requirement", "t.owner_name_", "NULL")
        + " AND COALESCE(t.work_item_kind_,'requirement')='requirement' UNION ALL "
        + select("t_product_design_task", "design", "design", "t.owner_name_", "t.requirement_id_")
        + " UNION ALL "
        + select("t_product_requirement", "design", "legacy-design", "t.owner_name_", "NULL")
        + " AND t.work_item_kind_='design' AND NOT EXISTS (SELECT 1 FROM t_product_design_task d "
        + "WHERE d.id_=t.id_ AND d.tenant_id_=t.tenant_id_) UNION ALL "
        + select("t_product_dev_task", "dev", "dev", "t.developer_name_", "t.requirement_id_")
        + " UNION ALL "
        + select("t_product_bug", "bug", "bug", "t.assignee_name_", "t.requirement_id_")
        + " UNION ALL SELECT id_,category_,'core',code_,title_,product_line_id_,version_id_,requirement_id_,assignee_name_,status_name_,"
        + "priority_,planned_end_date_,estimated_hours_,actual_hours_,create_time_,task_type_id_,workflow_id_,status_key_,status_group_,successful_,parent_work_item_id_,assignee_id_"
        + " FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND delete_flag_=0";

    public List<Map<String, Object>> byProductLine(String tenant, String lineId) {
        return jdbc.queryForList("SELECT * FROM (" + UNION + ") items ORDER BY createdAt DESC,category,id",
            tenant, lineId, tenant, lineId, tenant, lineId, tenant, lineId, tenant, lineId, tenant, lineId);
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

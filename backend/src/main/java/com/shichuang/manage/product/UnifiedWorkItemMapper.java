package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;

@Repository
public class UnifiedWorkItemMapper {
    private final JdbcTemplate jdbc;

    public UnifiedWorkItemMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    static final String CORE = "SELECT w.id_ AS id, w.category_ AS category, 'core' AS source, w.code_ AS code, w.title_ AS title, w.product_line_id_ AS productLineId, w.version_id_ AS versionId, w.requirement_id_ AS requirementId, r.title_ AS requirementTitle, COALESCE(r.creator_name_,ru.name_,r.create_by_) AS requirementInitiatorName, w.source_type_ AS sourceType, w.assignee_name_ AS assigneeName, w.status_name_ AS status, "
        + "w.priority_ AS priority, w.planned_end_date_ AS dueDate, w.estimated_hours_ AS estimatedHours, w.actual_hours_ AS actualHours, w.create_time_ AS createdAt, w.task_type_id_ AS taskTypeId, w.workflow_id_ AS workflowId, w.status_key_ AS statusKey, w.status_group_ AS statusGroup, w.status_color_ AS statusColor, w.successful_ AS successful, w.parent_work_item_id_ AS parentWorkItemId, w.assignee_id_ AS assigneeId, w.version_ AS revision, "
        + "EXISTS(SELECT 1 FROM t_product_work_item child WHERE child.tenant_id_=w.tenant_id_ AND child.product_line_id_=w.product_line_id_ AND child.parent_work_item_id_=w.id_ AND child.delete_flag_=0) AS hasChildren"
        + " FROM t_product_work_item w LEFT JOIN t_product_work_item r ON r.tenant_id_=w.tenant_id_ AND r.id_=w.requirement_id_ AND r.category_='requirement' AND r.delete_flag_=0 LEFT JOIN t_sys_user ru ON ru.tenant_id_=r.tenant_id_ AND ru.id_=r.create_by_ AND ru.delete_flag_=0 WHERE w.tenant_id_=? AND w.product_line_id_=? AND w.delete_flag_=0";

    public List<Map<String, Object>> byProductLine(String tenant, String lineId) {
        return jdbc.queryForList("SELECT * FROM (" + CORE + ") items ORDER BY createdAt DESC,category,id", tenant, lineId);
    }

    public List<Map<String, Object>> list(String tenant, String lineId, String versionId, String category,
        String keyword, int offset, int limit) {
        Query query = menuQuery(tenant, lineId, versionId, category, keyword);
        query.sql.append(" ORDER BY w.create_time_ DESC,w.category_,w.id_ LIMIT ? OFFSET ?");
        query.args.add(limit);
        query.args.add(offset);
        return jdbc.queryForList(query.sql.toString(), query.args.toArray());
    }

    public long count(String tenant, String lineId, String versionId, String category, String keyword) {
        Query query = menuQuery(tenant, lineId, versionId, category, keyword);
        String sql = "SELECT COUNT(*) FROM (" + query.sql + ") menu_items";
        Long total = jdbc.queryForObject(sql, Long.class, query.args.toArray());
        return total == null ? 0 : total;
    }

    private Query menuQuery(String tenant, String lineId, String versionId, String category, String keyword) {
        StringBuilder sql = new StringBuilder(CORE).append(" AND w.parent_work_item_id_ IS NULL");
        List<Object> args = new ArrayList<>(List.of(tenant, lineId));
        if (!category.isBlank()) { sql.append(" AND w.category_=?"); args.add(category); }
        if (!versionId.isBlank()) { sql.append(" AND w.version_id_=?"); args.add(versionId); }
        if (!keyword.isBlank()) {
            sql.append(" AND (LOWER(w.title_) LIKE ? OR LOWER(w.code_) LIKE ?)");
            String term = "%" + keyword.toLowerCase(java.util.Locale.ROOT) + "%";
            args.add(term); args.add(term);
        }
        return new Query(sql, args);
    }

    private record Query(StringBuilder sql, List<Object> args) {}

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

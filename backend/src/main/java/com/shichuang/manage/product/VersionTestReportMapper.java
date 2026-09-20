package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class VersionTestReportMapper {
    private final JdbcTemplate jdbc;

    public VersionTestReportMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    private Map<String, Object> one(String sql, Object... args) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> version(String tenant, String lineId, String versionId) {
        return one("SELECT id_ AS id, name_ AS name, start_date_ AS startDate, end_date_ AS endDate FROM t_product_line_version WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0", tenant, lineId, versionId);
    }

    public List<Map<String, Object>> reports(String tenant, String lineId, String versionId) {
        return jdbc.queryForList("""
            SELECT r.id_ AS id,r.name_ AS name,'测试报告' AS reportType,r.summary_ AS summary,r.creator_name_ AS creatorName,
              r.product_line_id_ AS productLineId,l.name_ AS productLineName,r.version_id_ AS versionId,v.name_ AS versionName,
              r.version_ AS revision,r.create_time_ AS createdAt,r.update_time_ AS updatedAt,
              COUNT(rp.id_) AS planCount,
              SUBSTRING_INDEX(GROUP_CONCAT(p.name_ ORDER BY rp.sort_ SEPARATOR '|||'),'|||',1) AS firstPlanName
            FROM t_product_version_test_report r
            JOIN t_product_line l ON l.tenant_id_=r.tenant_id_ AND l.id_=r.product_line_id_ AND l.delete_flag_=0
            JOIN t_product_line_version v ON v.tenant_id_=r.tenant_id_ AND v.id_=r.version_id_ AND v.delete_flag_=0
            LEFT JOIN t_product_version_test_report_plan rp ON rp.tenant_id_=r.tenant_id_ AND rp.report_id_=r.id_ AND rp.delete_flag_=0
            LEFT JOIN t_product_test_plan p ON p.tenant_id_=rp.tenant_id_ AND p.id_=rp.test_plan_id_ AND p.delete_flag_=0
            WHERE r.tenant_id_=? AND r.product_line_id_=? AND r.version_id_=? AND r.delete_flag_=0
            GROUP BY r.id_,l.name_,v.name_ ORDER BY r.create_time_ DESC,r.id_
            """, tenant, lineId, versionId);
    }

    public List<Map<String, Object>> reports(String tenant, List<String> lineIds) {
        if (lineIds.isEmpty()) return List.of();
        String placeholders = String.join(",", Collections.nCopies(lineIds.size(), "?"));
        List<Object> args = new ArrayList<>();
        args.add(tenant);
        args.addAll(lineIds);
        return jdbc.queryForList("""
            SELECT r.id_ AS id,r.name_ AS name,'测试报告' AS reportType,r.summary_ AS summary,r.creator_name_ AS creatorName,
              r.product_line_id_ AS productLineId,l.name_ AS productLineName,r.version_id_ AS versionId,v.name_ AS versionName,
              r.version_ AS revision,r.create_time_ AS createdAt,r.update_time_ AS updatedAt,
              COUNT(rp.id_) AS planCount,
              SUBSTRING_INDEX(GROUP_CONCAT(p.name_ ORDER BY rp.sort_ SEPARATOR '|||'),'|||',1) AS firstPlanName
            FROM t_product_version_test_report r
            JOIN t_product_line l ON l.tenant_id_=r.tenant_id_ AND l.id_=r.product_line_id_ AND l.delete_flag_=0
            JOIN t_product_line_version v ON v.tenant_id_=r.tenant_id_ AND v.id_=r.version_id_ AND v.delete_flag_=0
            LEFT JOIN t_product_version_test_report_plan rp ON rp.tenant_id_=r.tenant_id_ AND rp.report_id_=r.id_ AND rp.delete_flag_=0
            LEFT JOIN t_product_test_plan p ON p.tenant_id_=rp.tenant_id_ AND p.id_=rp.test_plan_id_ AND p.delete_flag_=0
            WHERE r.tenant_id_=? AND r.product_line_id_ IN (""" + placeholders + ") AND r.delete_flag_=0 " +
            "GROUP BY r.id_,l.name_,v.name_ ORDER BY r.create_time_ DESC,r.id_", args.toArray());
    }

    public Map<String, Object> report(String tenant, String lineId, String versionId, String reportId) {
        return one("SELECT id_ AS id,name_ AS name,summary_ AS summary,creator_name_ AS creatorName,version_ AS revision,create_time_ AS createdAt,update_time_ AS updatedAt FROM t_product_version_test_report WHERE tenant_id_=? AND product_line_id_=? AND version_id_=? AND id_=? AND delete_flag_=0", tenant, lineId, versionId, reportId);
    }

    public List<Map<String, Object>> availablePlans(String tenant, String lineId, String versionId) {
        return jdbc.queryForList("""
            SELECT p.id_ AS id,p.name_ AS name,p.work_item_id_ AS workItemId,w.title_ AS taskTitle,
              COALESCE(w.assignee_name_,'未设置') AS ownerName,p.start_date_ AS startDate,p.end_date_ AS endDate,
              p.environment_ AS environment,p.version_ AS revision
            FROM t_product_test_plan p
            JOIN t_product_work_item w ON w.tenant_id_=p.tenant_id_ AND w.id_=p.work_item_id_ AND w.delete_flag_=0
            WHERE p.tenant_id_=? AND p.product_line_id_=? AND COALESCE(p.version_id_,w.version_id_)=? AND p.delete_flag_=0
            ORDER BY p.create_time_ DESC,p.id_
            """, tenant, lineId, versionId);
    }

    public List<Map<String, Object>> reportPlans(String tenant, String reportId) {
        return jdbc.queryForList("""
            SELECT p.id_ AS id,p.name_ AS name,p.work_item_id_ AS workItemId,w.title_ AS taskTitle,
              COALESCE(w.assignee_name_,'未设置') AS ownerName,p.start_date_ AS startDate,p.end_date_ AS endDate,
              p.environment_ AS environment,
              e.status_ AS executionStatus,e.start_time_ AS executionStart,e.end_time_ AS executionEnd,
              COUNT(ec.id_) AS total,SUM(ec.result_='PASSED') AS passed,SUM(ec.result_='FAILED') AS failed,SUM(ec.result_='NOT_EXECUTED') AS notExecuted
            FROM t_product_version_test_report_plan rp
            JOIN t_product_test_plan p ON p.tenant_id_=rp.tenant_id_ AND p.id_=rp.test_plan_id_ AND p.delete_flag_=0
            JOIN t_product_work_item w ON w.tenant_id_=p.tenant_id_ AND w.id_=p.work_item_id_ AND w.delete_flag_=0
            LEFT JOIN t_product_test_execution e ON e.tenant_id_=p.tenant_id_ AND e.test_plan_id_=p.id_ AND e.delete_flag_=0 AND e.round_no_=(SELECT MAX(e2.round_no_) FROM t_product_test_execution e2 WHERE e2.tenant_id_=p.tenant_id_ AND e2.test_plan_id_=p.id_ AND e2.status_='ENDED' AND e2.delete_flag_=0)
            LEFT JOIN t_product_test_execution_case ec ON ec.tenant_id_=e.tenant_id_ AND ec.execution_id_=e.id_ AND ec.delete_flag_=0
            WHERE rp.tenant_id_=? AND rp.report_id_=? AND rp.delete_flag_=0
            GROUP BY rp.id_,p.id_,w.id_,e.id_ ORDER BY rp.sort_,rp.id_
            """, tenant, reportId);
    }

    public List<Map<String, Object>> defects(String tenant, String reportId) {
        return jdbc.queryForList("""
            SELECT DISTINCT w.id_ AS id,w.code_ AS code,w.title_ AS title,w.status_name_ AS status,
              w.successful_ AS successful,w.priority_ AS priority,w.assignee_name_ AS assigneeName
            FROM t_product_version_test_report_plan rp
            JOIN t_product_test_execution e ON e.tenant_id_=rp.tenant_id_ AND e.test_plan_id_=rp.test_plan_id_ AND e.status_='ENDED' AND e.delete_flag_=0
            JOIN t_product_test_execution_case ec ON ec.tenant_id_=e.tenant_id_ AND ec.execution_id_=e.id_ AND ec.delete_flag_=0
            JOIN t_product_test_execution_defect d ON d.tenant_id_=ec.tenant_id_ AND d.execution_case_id_=ec.id_ AND d.delete_flag_=0
            JOIN t_product_work_item w ON w.tenant_id_=d.tenant_id_ AND w.id_=d.defect_work_item_id_ AND w.delete_flag_=0
            WHERE rp.tenant_id_=? AND rp.report_id_=? AND rp.delete_flag_=0
            ORDER BY w.priority_,w.title_
            """, tenant, reportId);
    }

    public void insert(String tenant, String id, String lineId, String versionId, String name, String summary, String user, String creatorName) {
        jdbc.update("INSERT INTO t_product_version_test_report(id_,tenant_id_,product_line_id_,version_id_,name_,summary_,creator_name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))", id, tenant, lineId, versionId, name, summary, creatorName, user, user);
    }

    public int update(String tenant, String id, int revision, String name, String summary, String user) {
        return jdbc.update("UPDATE t_product_version_test_report SET name_=?,summary_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0", name, summary, user, tenant, id, revision);
    }

    public int delete(String tenant, String id, int revision, String user) {
        return jdbc.update("UPDATE t_product_version_test_report SET delete_flag_=1,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0", user, tenant, id, revision);
    }

    public void replacePlans(String tenant, String reportId, List<String> planIds, String user) {
        jdbc.update("DELETE FROM t_product_version_test_report_plan WHERE tenant_id_=? AND report_id_=?", tenant, reportId);
        for (int i = 0; i < planIds.size(); i++) {
            jdbc.update("INSERT INTO t_product_version_test_report_plan(id_,tenant_id_,report_id_,test_plan_id_,sort_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,NOW(6),NOW(6))", UUID.randomUUID().toString(), tenant, reportId, planIds.get(i), i + 1, user, user);
        }
    }

    public void deletePlanLinks(String tenant, String reportId, String user) {
        jdbc.update("DELETE FROM t_product_version_test_report_plan WHERE tenant_id_=? AND report_id_=?", tenant, reportId);
    }
}

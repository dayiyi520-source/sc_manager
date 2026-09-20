package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.shichuang.manage.product.VersionTestReportDefinition.SaveReport;
import static org.junit.jupiter.api.Assertions.*;

@Transactional
class VersionTestReportIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired VersionTestReportService reports;

    private final String tenant = "version-report-integration";
    private String lineId;
    private String versionId;
    private String planId;

    @BeforeEach
    void fixture() {
        RequestContext.set(Map.of("sub", "report-user", "name", "报告创建人", "tenant", tenant, "role", "admin"));
        lineId = UUID.randomUUID().toString();
        versionId = UUID.randomUUID().toString();
        planId = UUID.randomUUID().toString();
        String typeId = UUID.randomUUID().toString();
        String workItemId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'报告产品线','report-user','report-user',NOW(6),NOW(6))", lineId, tenant, "REPORT-" + lineId);
        jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,start_date_,end_date_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'V1','验收迭代','2026-09-01','2026-09-30','迭代中','report-user','report-user',NOW(6),NOW(6))", versionId, tenant, lineId);
        jdbc.update("INSERT INTO t_product_line_work_item_type(id_,tenant_id_,product_line_id_,category_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'测试','测试任务','report-user','report-user',NOW(6),NOW(6))", typeId, tenant, lineId);
        jdbc.update("""
            INSERT INTO t_product_work_item(id_,tenant_id_,product_line_id_,category_,task_type_id_,code_,title_,version_id_,workflow_id_,status_key_,status_name_,status_group_,priority_,request_id_,request_hash_,create_by_,update_by_,create_time_,update_time_)
            VALUES(?,?,?,'test',?,'TEST-REPORT','报告测试任务',?,'workflow','testing','测试中','IN_PROGRESS','P1','report-fixture','report-fixture','report-user','report-user',NOW(6),NOW(6))
            """, workItemId, tenant, lineId, typeId, versionId);
        jdbc.update("""
            INSERT INTO t_product_test_plan(id_,tenant_id_,product_line_id_,work_item_id_,version_id_,name_,environment_,start_date_,end_date_,create_by_,update_by_,create_time_,update_time_)
            VALUES(?,?,?,?,?,'核心回归计划','测试环境','2026-09-05','2026-09-10','report-user','report-user',NOW(6),NOW(6))
            """, planId, tenant, lineId, workItemId, versionId);
    }

    @AfterEach
    void clearContext() { RequestContext.clear(); }

    @Test
    void persistsReportAndAggregatesRealPlanExecutionAndP0Defect() {
        Map<String, Object> created = reports.create(lineId, versionId, new SaveReport("迭代测试报告", List.of(planId), "初始总结", 0));
        String reportId = String.valueOf(created.get("id"));
        assertEquals(1, reports.list(lineId, versionId).size());
        Map<String, Object> listed = reports.list(lineId, versionId).get(0);
        assertEquals("测试报告", listed.get("reportType"));
        assertEquals("报告产品线", listed.get("productLineName"));
        assertEquals("验收迭代", listed.get("versionName"));
        assertEquals("核心回归计划", listed.get("firstPlanName"));
        assertEquals(reportId, reports.listAll().get(0).get("id"));

        String executionId = UUID.randomUUID().toString();
        String resultId = UUID.randomUUID().toString();
        String defectId = UUID.randomUUID().toString();
        String defectTypeId = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO t_product_test_execution(id_,tenant_id_,product_line_id_,test_plan_id_,work_item_id_,round_no_,name_,scope_type_,executor_id_,executor_name_,status_,request_id_,request_hash_,start_time_,end_time_,create_by_,update_by_,create_time_,update_time_)
            SELECT ?,tenant_id_,product_line_id_,id_,work_item_id_,1,'第一轮','ALL','report-user','报告创建人','ENDED','report-round','report-round',NOW(6),NOW(6),'report-user','report-user',NOW(6),NOW(6) FROM t_product_test_plan WHERE id_=?
            """, executionId, planId);
        jdbc.update("INSERT INTO t_product_test_execution_case(id_,tenant_id_,execution_id_,test_case_id_,sort_,code_snapshot_,title_snapshot_,priority_snapshot_,steps_snapshot_,result_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'case-1',1,'CASE-1','登录用例','P1','[]','FAILED','report-user','report-user',NOW(6),NOW(6))", resultId, tenant, executionId);
        jdbc.update("INSERT INTO t_product_line_work_item_type(id_,tenant_id_,product_line_id_,category_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'缺陷','系统缺陷','report-user','report-user',NOW(6),NOW(6))", defectTypeId, tenant, lineId);
        jdbc.update("""
            INSERT INTO t_product_work_item(id_,tenant_id_,product_line_id_,category_,task_type_id_,code_,title_,version_id_,workflow_id_,status_key_,status_name_,status_group_,priority_,request_id_,request_hash_,create_by_,update_by_,create_time_,update_time_)
            VALUES(?,?,?,'bug',?,'BUG-P0','阻断登录',?,'workflow','open','待解决','IN_PROGRESS','P0','defect-fixture','defect-fixture','report-user','report-user',NOW(6),NOW(6))
            """, defectId, tenant, lineId, defectTypeId, versionId);
        jdbc.update("INSERT INTO t_product_test_execution_defect(id_,tenant_id_,product_line_id_,execution_case_id_,defect_work_item_id_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,'report-user','report-user',NOW(6),NOW(6))", UUID.randomUUID().toString(), tenant, lineId, resultId, defectId);

        Map<String, Object> detail = reports.detail(lineId, versionId, reportId);
        Map<?, ?> statistics = (Map<?, ?>) detail.get("statistics");
        assertEquals(1L, ((Number) statistics.get("total")).longValue());
        assertEquals(1L, ((Number) statistics.get("defects")).longValue());
        assertEquals(1L, ((Number) statistics.get("urgent")).longValue());
        assertEquals(1, ((List<?>) detail.get("urgentDefects")).size());

        int revision = ((Number) detail.get("revision")).intValue();
        Map<String, Object> updated = reports.update(lineId, versionId, reportId, new SaveReport("修改后的报告", List.of(planId), "更新总结", revision));
        assertEquals("修改后的报告", updated.get("name"));
        reports.delete(lineId, versionId, reportId, ((Number) updated.get("revision")).intValue());
        assertTrue(reports.list(lineId, versionId).isEmpty());
    }

    @Test
    void rejectsMissingAndCrossVersionPlans() {
        assertThrows(IllegalArgumentException.class, () -> reports.create(lineId, versionId, new SaveReport("空计划报告", List.of(), "", 0)));
        assertThrows(IllegalArgumentException.class, () -> reports.create(lineId, versionId, new SaveReport("错误计划报告", List.of(UUID.randomUUID().toString()), "", 0)));
    }
}

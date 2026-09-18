package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.shichuang.manage.product.TestCaseDefinition.*;
import static com.shichuang.manage.product.TestExecutionDefinition.*;
import static org.junit.jupiter.api.Assertions.*;

@Transactional
class TestExecutionIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired TestCaseService cases;
    @Autowired TestExecutionService executions;

    private final String tenant = "test-execution-integration";
    private String line;
    private String owner;
    private String rootWorkItem;
    private String workItem;
    private CaseView testCase;

    @BeforeEach
    void fixture() {
        RequestContext.set(Map.of("sub", "test-user", "name", "测试用户", "tenant", tenant, "role", "admin"));
        line = UUID.randomUUID().toString();
        owner = UUID.randomUUID().toString();
        rootWorkItem = UUID.randomUUID().toString();
        workItem = UUID.randomUUID().toString();
        String rootType = UUID.randomUUID().toString();
        String type = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'执行产品线','test-user','test-user',NOW(6),NOW(6))", line, tenant, "EX-" + line);
        jdbc.update("INSERT INTO t_sys_user(id_,tenant_id_,username_,name_,department_,role_,role_title_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,'product_manager','测试负责人','enabled','test-user','test-user',NOW(6),NOW(6))", owner, tenant, owner, "执行负责人", "测试部");
        jdbc.update("INSERT INTO t_product_line_work_item_type(id_,tenant_id_,product_line_id_,category_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'测试','测试主任务','test-user','test-user',NOW(6),NOW(6))", rootType, tenant, line);
        jdbc.update("INSERT INTO t_product_line_work_item_type(id_,tenant_id_,product_line_id_,category_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'测试','测试','test-user','test-user',NOW(6),NOW(6))", type, tenant, line);
        insertWorkItem(rootWorkItem, rootType, "TEST-ROOT", "测试主任务", null, false, "P1");
        jdbc.update("""
            INSERT INTO t_product_work_item(id_,tenant_id_,product_line_id_,category_,task_type_id_,code_,title_,parent_work_item_id_,workflow_id_,status_key_,status_name_,status_group_,priority_,request_id_,request_hash_,create_by_,update_by_,create_time_,update_time_)
            VALUES(?,?,?,'test',?,'TEST-001','人工测试执行',?,'workflow','open','待开始','NOT_STARTED','P1','fixture','fixture','test-user','test-user',NOW(6),NOW(6))
            """, workItem, tenant, line, type, rootWorkItem);
        String directory = cases.createDirectory(line, new SaveDirectory(null, "核心流程", 1)).id();
        testCase = cases.create(line, new SaveCase(directory, null, "登录流程", "已有账号", "P1", owner,
            List.of("smoke"), List.of(new StepInput(null, 1, "提交登录", "进入首页")), null));
    }

    @AfterEach
    void clearContext() {
        RequestContext.clear();
    }

    @Test
    void createsImmutableRoundAndEnforcesResultStateMachine() {
        Map<String, Object> plan = executions.savePlan(workItem, new SavePlan(List.of(testCase.id()), "测试环境", 0));
        assertEquals(1, ((List<?>) plan.get("cases")).size());

        Map<String, Object> round = executions.createExecution(workItem,
            new CreateExecution("round-1", ScopeType.ALL, List.of(), "第一轮", "测试环境", "build-1"));
        String executionId = round.get("id").toString();
        Map<String, Object> result = firstResult(round);
        assertEquals("NOT_EXECUTED", result.get("result"));

        cases.update(line, testCase.id(), new SaveCase(testCase.directoryId(), null, "已修改标题", null, "P1", owner,
            List.of(), List.of(new StepInput(null, 1, "新步骤", "新结果")), testCase.revision()));
        assertEquals("登录流程", firstResult(executions.execution(executionId)).get("title"));

        String resultId = result.get("id").toString();
        assertThrows(IllegalArgumentException.class,
            () -> executions.saveResult(resultId, new SaveResult(ResultStatus.FAILED, "", List.of(), 0)));
        Map<String, Object> saved = executions.saveResult(resultId,
            new SaveResult(ResultStatus.FAILED, "首页未打开", List.of(new EvidenceInput("日志.txt", "text/plain", 4, "data:text/plain;base64,dGVzdA==")), 0));
        assertEquals(1, ((List<?>) firstResult(saved).get("evidence")).size());
        assertThrows(ResponseStatusException.class,
            () -> executions.saveResult(resultId, new SaveResult(ResultStatus.PASSED, null, List.of(), 0)));

        Map<String, Object> ended = executions.end(executionId, 0);
        assertEquals("ENDED", ended.get("status"));
        ResponseStatusException readOnly = assertThrows(ResponseStatusException.class,
            () -> executions.saveResult(resultId, new SaveResult(ResultStatus.PASSED, null, List.of(), 1)));
        assertEquals(HttpStatus.CONFLICT, readOnly.getStatusCode());
    }

    @Test
    void allowsStandaloneTestTaskToCreatePlanAndExecution() {
        String standalone = UUID.randomUUID().toString();
        String type = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line_work_item_type(id_,tenant_id_,product_line_id_,category_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'测试','测试任务','test-user','test-user',NOW(6),NOW(6))", type, tenant, line);
        insertWorkItem(standalone, type, "TEST-STANDALONE", "独立测试任务", null, false, "P1");

        Map<String, Object> plan = executions.savePlan(standalone, new SavePlan(List.of(testCase.id()), "测试环境", 0));
        assertNotNull(plan.get("id"));
        Map<String, Object> round = executions.createExecution(standalone,
            new CreateExecution("standalone-round", ScopeType.ALL, List.of(), "第一轮", "测试环境", null));
        assertEquals(1, ((List<?>) round.get("cases")).size());
    }

    @Test
    void reusesIdempotentRequestAndBuildsFailedOnlyRound() {
        executions.savePlan(workItem, new SavePlan(List.of(testCase.id()), null, 0));
        CreateExecution input = new CreateExecution("same-request", ScopeType.ALL, List.of(), "第一轮", null, null);
        Map<String, Object> first = executions.createExecution(workItem, input);
        assertEquals(first.get("id"), executions.createExecution(workItem, input).get("id"));
        assertThrows(ResponseStatusException.class, () -> executions.createExecution(workItem,
            new CreateExecution("same-request", ScopeType.ALL, List.of(), "不同载荷", null, null)));

        Map<String, Object> result = firstResult(first);
        executions.saveResult(result.get("id").toString(), new SaveResult(ResultStatus.FAILED, "失败", List.of(), 0));
        executions.end(first.get("id").toString(), 0);
        Map<String, Object> regression = executions.createExecution(workItem,
            new CreateExecution("round-2", ScopeType.FAILED_ONLY, List.of(), "失败用例回归", null, null));
        assertEquals(2, ((Number) regression.get("roundNo")).intValue());
        assertEquals(1, ((List<?>) regression.get("cases")).size());
    }

    @Test
    void rejectsEmptyPlanAndOversizedEvidence() {
        executions.savePlan(workItem, new SavePlan(List.of(), null, 0));
        assertThrows(IllegalArgumentException.class, () -> executions.createExecution(workItem,
            new CreateExecution("empty", ScopeType.ALL, List.of(), null, null, null)));

        executions.savePlan(workItem, new SavePlan(List.of(testCase.id()), null, 0));
        Map<String, Object> round = executions.createExecution(workItem,
            new CreateExecution("evidence", ScopeType.ALL, List.of(), null, null, null));
        Map<String, Object> result = firstResult(round);
        assertThrows(IllegalArgumentException.class, () -> executions.saveResult(result.get("id").toString(),
            new SaveResult(ResultStatus.FAILED, "失败", List.of(new EvidenceInput("过大.pdf", "application/pdf", 10L * 1024 * 1024 + 1, "data:application/pdf;base64,AA==")), 0)));
    }

    @Test
    void linksMultipleDefectsAndAggregatesOnlyLatestEndedRound() {
        executions.savePlan(workItem, new SavePlan(List.of(testCase.id()), null, 0));
        Map<String, Object> first = executions.createExecution(workItem,
            new CreateExecution("aggregate-1", ScopeType.ALL, List.of(), "第一轮", null, null));
        Map<String, Object> failed = firstResult(first);
        Map<String, Object> saved = executions.saveResult(failed.get("id").toString(),
            new SaveResult(ResultStatus.FAILED, "失败", List.of(), 0));
        int resultRevision = ((Number) firstResult(saved).get("revision")).intValue();
        String defectA = createDefect("BUG-001", "P2");
        String defectB = createDefect("BUG-002", "P3");
        executions.linkDefect(failed.get("id").toString(), new LinkDefect(defectA, resultRevision));
        Map<String, Object> linked = executions.linkDefect(failed.get("id").toString(), new LinkDefect(defectB, resultRevision));
        assertEquals(2, ((List<?>) firstResult(linked).get("defects")).size());
        assertThrows(ResponseStatusException.class,
            () -> executions.linkDefect(failed.get("id").toString(), new LinkDefect(defectA, resultRevision)));
        executions.end(first.get("id").toString(), 0);

        Map<String, Object> second = executions.createExecution(workItem,
            new CreateExecution("aggregate-2", ScopeType.FAILED_ONLY, List.of(), "第二轮回归", null, null));
        executions.saveResult(firstResult(second).get("id").toString(), new SaveResult(ResultStatus.PASSED, null, List.of(), 0));
        executions.end(second.get("id").toString(), 0);

        Map<String, Object> overview = executions.overview(rootWorkItem);
        assertEquals(1L, overview.get("total"));
        assertEquals(1L, overview.get("passed"));
        assertEquals(0L, overview.get("failed"));
        assertEquals(2L, ((Number) overview.get("defectCount")).longValue());
        assertEquals(0L, ((Number) overview.get("blockingDefectCount")).longValue());
        assertEquals(2, ((List<?>) overview.get("defects")).size());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> firstResult(Map<String, Object> execution) {
        return ((List<Map<String, Object>>) execution.get("cases")).get(0);
    }

    private String createDefect(String code, String priority) {
        String type = UUID.randomUUID().toString();
        String id = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line_work_item_type(id_,tenant_id_,product_line_id_,category_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'缺陷','缺陷','test-user','test-user',NOW(6),NOW(6))", type, tenant, line);
        insertWorkItem(id, type, code, code, null, false, priority);
        jdbc.update("UPDATE t_product_work_item SET category_='bug' WHERE tenant_id_=? AND id_=?", tenant, id);
        return id;
    }

    private void insertWorkItem(String id, String type, String code, String title, String parent, boolean successful, String priority) {
        jdbc.update("""
            INSERT INTO t_product_work_item(id_,tenant_id_,product_line_id_,category_,task_type_id_,code_,title_,parent_work_item_id_,workflow_id_,status_key_,status_name_,status_group_,successful_,priority_,request_id_,request_hash_,create_by_,update_by_,create_time_,update_time_)
            VALUES(?,?,?,'test',?,?,?,?,?,'open','待开始','NOT_STARTED',?,?,?,?,'test-user','test-user',NOW(6),NOW(6))
            """, id, tenant, line, type, code, title, parent, "workflow", successful, priority, "request-" + id, "hash-" + id);
    }
}

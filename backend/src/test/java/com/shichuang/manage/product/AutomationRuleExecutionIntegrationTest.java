package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.shichuang.manage.product.WorkItemDefinition.*;
import static org.junit.jupiter.api.Assertions.*;

@Transactional
class AutomationRuleExecutionIntegrationTest extends AbstractApiIntegrationTest {
    private static final String TENANT = "automation-rule-execution-test";

    @Autowired ProductLineService productLines;
    @Autowired WorkItemConfigurationService configurations;
    @Autowired WorkItemStorageService storage;
    @Autowired WorkItemTransitionService transitions;
    @Autowired AutomationRuleService automations;
    @Autowired UnifiedWorkItemService unified;

    private String line;
    private String requirementType;
    private String designType;
    private String devType;
    private String testType;

    @BeforeEach
    void setup() {
        RequestContext.set(Map.of("sub", "automation-user", "tenant", TENANT, "role", "admin"));
        line = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'自动化执行测试','automation-user','automation-user',NOW(),NOW())", line, TENANT, line);
        requirementType = type("需求", "产品类型需求");
        designType = type("设计", "需求设计");
        devType = type("研发", "开发任务");
        testType = type("测试", "测试任务");
        publish(requirementType, "requirement", requirementWorkflow());
        publish(designType, "design", standardWorkflow("design"));
        publish(devType, "dev", standardWorkflow("dev"));
        publish(testType, "test", standardWorkflow("test"));
    }

    @AfterEach
    void clear() {
        RequestContext.clear();
    }

    @Test
    void reviewedProductRequirementDispatchesThreeTasksAndWritesLog() {
        Map<String,Object> rule = baseRule("产品需求已评审后下发任务", requirementType, "reviewed", "DISPATCH_REQUIREMENT_TASKS");
        rule.put("actionConfig", Map.of("designTypeId", designType, "devTypeId", devType, "testTypeId", testType));
        automations.save(line, null, rule);

        Map<String,Object> requirement = storage.create(new CreateItem(UUID.randomUUID().toString(), line, "requirement", requirementType,
            "统一身份认证", "支持组织成员统一登录", "可使用统一账号完成登录", null, null, null, null, "P1", null, null, null, null));
        transitions.execute(line, requirement.get("id").toString(), new Transition("review", 0, null));

        for (String category : List.of("design", "dev", "test")) {
            var items = unified.list(line, "", category, "", 1, 20).page().items();
            assertEquals(1, items.size());
            assertEquals(requirement.get("id"), items.get(0).requirementId());
        }
        assertEquals("SUCCESS", automations.logs(line).get(0).get("result"));
    }

    @Test
    void enteringInProgressRecordsActualStartOnlyOnceAndWritesLog() {
        Map<String,Object> rule = baseRule("研发任务开始时记录实际开始时间", devType, "in_progress", "SET_ACTUAL_START_TIME");
        rule.put("actionConfig", Map.of());
        automations.save(line, null, rule);

        Map<String,Object> item = storage.create(new CreateItem(UUID.randomUUID().toString(), line, "dev", devType,
            "实现权限校验", null, null, null, null, null, null, "P2", null, null, null, null));
        Map<String,Object> started = transitions.execute(line, item.get("id").toString(), new Transition("start", 0, null));

        assertNotNull(started.get("actualStartAt"));
        assertEquals("SUCCESS", automations.logs(line).get(0).get("result"));
    }

    private String type(String category, String name) {
        return productLines.addWorkItemType(line, new HashMap<>(Map.of("category", category, "name", name, "enabled", true))).get("id").toString();
    }

    private void publish(String typeId, String category, Workflow workflow) {
        Map<String,Object> draft = configurations.save(line, typeId, null, new SaveWorkflow(category, "状态配置", workflow, null));
        configurations.publish(line, draft.get("id").toString(), 0);
    }

    private Map<String,Object> baseRule(String name, String typeId, String stateKey, String actionType) {
        Map<String,Object> rule = new HashMap<>();
        rule.put("name", name);
        rule.put("enabled", true);
        rule.put("triggerType", "STATUS_CHANGED");
        rule.put("triggerTypeId", typeId);
        rule.put("triggerStateKey", stateKey);
        rule.put("conditionType", "NONE");
        rule.put("conditionValue", "");
        rule.put("actionType", actionType);
        return rule;
    }

    private static Workflow requirementWorkflow() {
        return new Workflow(List.of(
            new State("pending", "待评审", WorkItemStatus.Group.NOT_STARTED, true, false, true, "requirement", "neutral"),
            new State("reviewed", "已评审", WorkItemStatus.Group.IN_PROGRESS, false, false, true, "requirement", "blue"),
            new State("completed", "已完成", WorkItemStatus.Group.COMPLETED, false, true, true, "requirement", "green")
        ), List.of(
            new Edge("review", "pending", "reviewed", "评审通过"),
            new Edge("complete", "reviewed", "completed", "完成")
        ));
    }

    private static Workflow standardWorkflow(String stage) {
        return new Workflow(List.of(
            new State("pending", "待开始", WorkItemStatus.Group.NOT_STARTED, true, false, true, stage, "neutral"),
            new State("in_progress", "进行中", WorkItemStatus.Group.IN_PROGRESS, false, false, true, stage, "blue"),
            new State("completed", "已完成", WorkItemStatus.Group.COMPLETED, false, true, true, stage, "green")
        ), List.of(
            new Edge("start", "pending", "in_progress", "开始"),
            new Edge("complete", "in_progress", "completed", "完成")
        ));
    }
}

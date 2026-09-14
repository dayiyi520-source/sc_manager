package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.util.concurrent.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(OutputCaptureExtension.class)
class WorkItemApprovalIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired WorkItemConfigurationService configuration;
    @Autowired WorkItemStorageService storage;
    @Autowired WorkItemTransitionService transitions;
    @Autowired ProductLineService lines;
    @Autowired PlatformTransactionManager transactionManager;
    private String tenant,line,id,version;
    private final Map<String,String> types=new HashMap<>();

    @BeforeEach void setup() {
        tenant=UUID.randomUUID().toString(); line=UUID.randomUUID().toString();
        RequestContext.set(Map.of("sub","u","tenant",tenant,"role","admin"));
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'审批测试','u','u',NOW(),NOW())",line,tenant,line);
        version=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,'测试版本','待开始','u','u',NOW(),NOW())",version,tenant,line,version);
        for (String kind:List.of("design","dev","test","requirement")) {
            types.put(kind,lines.addWorkItemType(line,new HashMap<>(Map.of("category",CATEGORIES.get(kind),"name",kind,"enabled",true))).get("id").toString());
            publish(kind,definition("requirement".equals(kind)));
        }
        id=storage.create(new CreateItem(UUID.randomUUID().toString(),line,"requirement",types.get("requirement"),"验收需求",null,null,version,null,null,null,"P1",null,null,null)).get("id").toString();
    }
    @AfterEach void cleanup() {
        // Each test uses a unique tenant; committed fixtures are removed even after rollback tests.
        for (String table:List.of("t_product_work_item_relation","t_product_work_item_activity","t_product_work_item","t_product_workflow","t_product_work_item_child_rule","t_product_line_work_item_type","t_product_line_version","t_product_line_activity","t_product_line"))
            jdbc.update("DELETE FROM "+table+" WHERE tenant_id_=?",tenant);
        RequestContext.clear();
    }
    @Test void approvalCreatesExactlyThreeMainTasksAndInheritsContext() {
        var result=approve(0);
        assertEquals("active",result.get("statusKey"));
        var tasks=jdbc.queryForList("SELECT * FROM t_product_work_item WHERE tenant_id_=? AND requirement_id_=?",tenant,id);
        assertEquals(3,tasks.size());
        assertEquals(Set.of("design","dev","test"),new HashSet<>(tasks.stream().map(t->t.get("category_").toString()).toList()));
        for(var task:tasks) {
            assertEquals(version,task.get("version_id_")); assertEquals("P1",task.get("priority_"));
            assertNull(task.get("parent_work_item_id_")); assertNull(task.get("assignee_id_"));
            assertEquals("open",task.get("status_key_"));
        }
        assertEquals(1,dispatchEvents());
    }
    @Test void reapprovalAndStaleRetriesDoNotDuplicateTasks() {
        approve(0); assertThrows(RuntimeException.class,()->approve(0));
        transitions.execute(line,id,new Transition("return",1,null));
        approve(2);
        assertEquals(3,taskCount()); assertEquals(1,dispatchEvents());
    }
    @Test void simultaneousApprovalRequestsCommitOnlyOneBatch() throws Exception {
        ExecutorService workers=Executors.newFixedThreadPool(2);
        CountDownLatch ready=new CountDownLatch(2),go=new CountDownLatch(1);
        Callable<Boolean> attempt=()-> {
            RequestContext.set(Map.of("sub","u","tenant",tenant,"role","admin"));
            try {
                ready.countDown(); assertTrue(go.await(10,TimeUnit.SECONDS));
                try { approve(0); return true; }
                catch (org.springframework.web.server.ResponseStatusException conflict) {
                    assertEquals(409,conflict.getStatusCode().value()); return false;
                }
            } finally { RequestContext.clear(); }
        };
        try {
            Future<Boolean> first=workers.submit(attempt),second=workers.submit(attempt);
            assertTrue(ready.await(10,TimeUnit.SECONDS)); go.countDown();
            assertNotEquals(first.get(15,TimeUnit.SECONDS),second.get(15,TimeUnit.SECONDS));
            assertEquals(3,taskCount()); assertEquals(1,dispatchEvents());
        } finally { go.countDown(); workers.shutdownNow(); }
    }
    @Test void authenticatedTransitionEndpointDispatchesTasks() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/work-items/{id}/transitions",id)
            .param("productLineId",line).header("Authorization","Bearer "+tokens.issue("u","admin",tenant))
            .contentType("application/json").content("{\"edgeKey\":\"approve\",\"revision\":0}"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.statusKey").value("active"));
        assertEquals(3,taskCount());
    }
    @Test void failureOnSecondTaskRollsBackFirstTaskAndRequirementAndLogs(CapturedOutput output) {
        jdbc.update("UPDATE t_product_line_work_item_type SET enabled_=0 WHERE tenant_id_=? AND id_=?",tenant,types.get("dev"));
        assertThrows(IllegalArgumentException.class,()->approve(0));
        assertEquals(0,taskCount()); assertEquals(0,dispatchEvents());
        assertEquals("open",storage.detail(line,id).get("statusKey"));
        assertEquals(0,((Number)storage.detail(line,id).get("revision")).intValue());
        assertEquals(1,storage.activities(line,id).size());
        assertTrue(output.getOut().contains("REQUIREMENT_TASKS_DISPATCH_FAILED"));
        jdbc.update("UPDATE t_product_line_work_item_type SET enabled_=1 WHERE tenant_id_=? AND id_=?",tenant,types.get("dev"));
        approve(0); assertEquals(3,taskCount());
    }
    @Test void outerTransactionFailureAlsoRollsBackWholeBatchAndLogs(CapturedOutput output) {
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(transactionManager).execute(status->{
            approve(0); throw new IllegalStateException("simulated late persistence failure");
        }));
        assertEquals(0,taskCount()); assertEquals(0,dispatchEvents());
        assertEquals("open",storage.detail(line,id).get("statusKey"));
        assertTrue(output.getOut().contains("REQUIREMENT_TASKS_DISPATCH_FAILED"));
    }
    @Test void missingTestingWorkflowRollsBackWholeBatch() {
        jdbc.update("UPDATE t_product_workflow SET status_='DRAFT' WHERE tenant_id_=? AND category_='test'",tenant);
        assertThrows(RuntimeException.class,()->approve(0));
        assertEquals(0,taskCount()); assertEquals("open",storage.detail(line,id).get("statusKey"));
    }
    @Test void publishedVersionAndForeignTenantCannotDispatch() {
        jdbc.update("UPDATE t_product_line_version SET status_='已发布' WHERE tenant_id_=?",tenant);
        assertThrows(RuntimeException.class,()->approve(0)); assertEquals(0,taskCount());
        RequestContext.set(Map.of("sub","u","tenant","other","role","admin"));
        assertThrows(RuntimeException.class,()->approve(0)); assertEquals(0,taskCount());
    }
    @Test void configurationRejectsWrongCategoryTypesAndTerminalApproval() {
        assertThrows(IllegalArgumentException.class,()->publish("design",definition(true)));
        String actual=types.put("test",types.get("dev"));
        assertThrows(IllegalArgumentException.class,()->publish("requirement",definition(true)));
        types.put("test",actual);
        var workflow=definition(true);
        var edges=new ArrayList<>(workflow.transitions());
        edges.set(0,new Edge("approve","open","done","通过",null,null,new ApprovalTasks(types.get("design"),types.get("dev"),types.get("test"))));
        assertThrows(IllegalArgumentException.class,()->publish("requirement",new Workflow(workflow.states(),edges)));
    }
    @Test void pinnedApprovalConfigurationSurvivesNewFlowAndLongTitle() {
        publish("requirement",definition(false));
        jdbc.update("UPDATE t_product_work_item SET title_=? WHERE tenant_id_=? AND id_=?","长".repeat(255),tenant,id);
        approve(0); assertEquals(3,taskCount());
        assertTrue(jdbc.queryForList("SELECT title_ FROM t_product_work_item WHERE tenant_id_=?",tenant).stream().allMatch(t->t.get("title_").toString().length()<=255));
    }
    private Map<String,Object> approve(int revision) { return transitions.execute(line,id,new Transition("approve",revision,null)); }
    private int taskCount() { return jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE tenant_id_=? AND requirement_id_=?",Integer.class,tenant,id); }
    private int dispatchEvents() { return jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item_activity WHERE tenant_id_=? AND event_type_='REQUIREMENT_TASKS_DISPATCHED'",Integer.class,tenant); }
    private void publish(String category,Workflow workflow) {
        var saved=configuration.save(line,null,new SaveWorkflow(category,"流程",workflow,null));
        configuration.publish(line,saved.get("id").toString(),0);
    }
    private Workflow definition(boolean approval) {
        return new Workflow(List.of(
            new State("open","待评审",WorkItemStatus.Group.NOT_STARTED,true,false,true,"requirement"),
            new State("active","执行中",WorkItemStatus.Group.IN_PROGRESS,false,false,true,"design"),
            new State("done","完成",WorkItemStatus.Group.COMPLETED,false,true,true,"test")),List.of(
            new Edge("approve","open","active","评审通过",null,null,approval?new ApprovalTasks(types.get("design"),types.get("dev"),types.get("test")):null),
            new Edge("finish","active","done","完成"),new Edge("return","active","open","重新评审")));
    }
}

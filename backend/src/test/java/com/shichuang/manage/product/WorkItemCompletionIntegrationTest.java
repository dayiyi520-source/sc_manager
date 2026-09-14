package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static org.junit.jupiter.api.Assertions.*;

class WorkItemCompletionIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired WorkItemStorageService storage;
    @Autowired WorkItemTransitionService transitions;
    @Autowired WorkItemRelationService relations;
    @Autowired WorkItemConfigurationService configurations;
    @Autowired UnifiedWorkItemService summaries;
    @Autowired ProductLineService lines;
    @Autowired PlatformTransactionManager transactions;
    String tenant,line,version,requirement;
    Map<String,String> types=new HashMap<>(),tasks=new HashMap<>();
    @BeforeEach void setup() {
        tenant=UUID.randomUUID().toString(); line=UUID.randomUUID().toString();
        RequestContext.set(Map.of("sub","u","role","admin","tenant",tenant));
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'完成测试','u','u',NOW(),NOW())",line,tenant,line);
        version=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,'版本','待开始','u','u',NOW(),NOW())",version,tenant,line,version);
        for(String category:List.of("design","dev","test","bug","requirement")) {
            types.put(category,lines.addWorkItemType(line,new HashMap<>(Map.of("category",CATEGORIES.get(category),"name",category,"enabled",true))).get("id").toString());
            Workflow workflow=new Workflow(states(),List.of(new Edge("start","open","doing","开始"),new Edge("finish","doing","done","完成")));
            if(category.equals("requirement")) workflow=requirementFlow(false);
            publish(category,workflow);
        }
        requirement=create("requirement",null); move(requirement,"approve");
        jdbc.queryForList("SELECT id_,category_ FROM t_product_work_item WHERE tenant_id_=? AND requirement_id_=?",tenant,requirement).forEach(row->tasks.put(row.get("category_").toString(),row.get("id_").toString()));
    }
    @AfterEach void cleanup() {
        for(String table:List.of("t_product_work_item_relation","t_product_work_item_activity","t_product_work_item","t_product_workflow","t_product_work_item_child_rule","t_product_line_work_item_type","t_product_line_version","t_product_line_activity","t_product_line")) jdbc.update("DELETE FROM "+table+" WHERE tenant_id_=?",tenant);
        RequestContext.clear();
    }
    @Test void finalTaskAutomaticallyCompletesRequirementAndMakesVersionReady() {
        assertFalse(summaries.versionSummary(line,version).readyToRelease());
        finish(tasks.get("design")); finish(tasks.get("dev")); assertEquals("doing",storage.detail(line,requirement).get("statusKey"));
        finish(tasks.get("test")); assertEquals("done",storage.detail(line,requirement).get("statusKey"));
        assertNotNull(storage.detail(line,requirement).get("completedAt"));
        assertTrue(summaries.versionSummary(line,version).readyToRelease());
        assertEquals(1,storage.activities(line,requirement).stream().filter(row->"REQUIREMENT_AUTO_COMPLETED".equals(row.get("eventType"))).count());
        assertTrue(summaries.requirementSummary(line,requirement).completionEligible());
    }
    @Test void manualCompletionCannotBypassDelivery() {
        assertThrows(RuntimeException.class,()->move(requirement,"auto"));
        assertFalse(summaries.requirementSummary(line,requirement).completionEligible());
    }
    @Test void configuredAcceptanceStateMustBeReachedBeforeAutoCompletion() {
        String flow=publish("requirement",requirementFlow(true));
        // Fixture selects a pinned definition before any acceptance action is taken.
        jdbc.update("UPDATE t_product_work_item SET workflow_id_=? WHERE tenant_id_=? AND id_=?",flow,tenant,requirement);
        tasks.values().forEach(this::finish); assertEquals("doing",storage.detail(line,requirement).get("statusKey"));
        assertFalse(summaries.requirementSummary(line,requirement).completionEligible());
        move(requirement,"accept"); assertEquals("done",storage.detail(line,requirement).get("statusKey"));
    }
    @Test void externalDependencyRemovalTriggersCompletion() {
        String external=create("dev",null);
        var relation=relations.create(line,external,new WorkItemRelationService.CreateRelation(requirement,"BLOCKS","FINISH"));
        tasks.values().forEach(this::finish); assertEquals("doing",storage.detail(line,requirement).get("statusKey"));
        relations.delete(line,requirement,relation.get("id").toString(),0);
        assertEquals("done",storage.detail(line,requirement).get("statusKey"));
    }
    @Test void defectClosureAndFinalTestAreRequired() {
        String bug=create("bug",requirement);
        relations.create(line,tasks.get("test"),new WorkItemRelationService.CreateRelation(bug,"FOUND_DEFECT",null));
        finish(tasks.get("design")); finish(tasks.get("dev")); move(tasks.get("test"),"start");
        assertThrows(RuntimeException.class,()->move(tasks.get("test"),"finish"));
        finish(bug); move(tasks.get("test"),"finish"); assertEquals("done",storage.detail(line,requirement).get("statusKey"));
    }
    @Test void rollbackAlsoRestoresAutomaticRequirementCompletion() {
        finish(tasks.get("design")); finish(tasks.get("dev")); move(tasks.get("test"),"start");
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(transactions).execute(status->{ move(tasks.get("test"),"finish"); throw new IllegalStateException("late failure"); }));
        assertEquals("doing",storage.detail(line,requirement).get("statusKey"));
        assertEquals("doing",storage.detail(line,tasks.get("test")).get("statusKey"));
        assertFalse(storage.activities(line,requirement).stream().anyMatch(row->"REQUIREMENT_AUTO_COMPLETED".equals(row.get("eventType"))));
    }
    @Test void publishedVersionCannotBeCompleted() {
        jdbc.update("UPDATE t_product_line_version SET status_='已发布' WHERE tenant_id_=? AND id_=?",tenant,version);
        assertThrows(RuntimeException.class,()->finish(tasks.get("test")));
        assertEquals("doing",storage.detail(line,requirement).get("statusKey"));
    }
    @Test void requiredChildPreventsCompletionUntilItSucceeds() {
        configurations.childRule(line,new ChildRule(types.get("dev"),types.get("dev"),true));
        String child=storage.create(new CreateItem(UUID.randomUUID().toString(),line,"dev",types.get("dev"),"子任务",null,null,version,requirement,tasks.get("dev"),null,"P2",null,null,null)).get("id").toString();
        move(tasks.get("dev"),"start"); assertThrows(RuntimeException.class,()->move(tasks.get("dev"),"finish"));
        finish(child); move(tasks.get("dev"),"finish"); finish(tasks.get("design")); finish(tasks.get("test"));
        assertEquals("done",storage.detail(line,requirement).get("statusKey"));
    }
    @Test void completingExternalPrerequisiteUnblocksAndCompletesRequirement() {
        String external=create("dev",null);
        relations.create(line,external,new WorkItemRelationService.CreateRelation(requirement,"BLOCKS","FINISH"));
        tasks.values().forEach(this::finish);
        assertFalse(summaries.versionSummary(line,version).readinessReasons().isEmpty());
        finish(external); assertEquals("done",storage.detail(line,requirement).get("statusKey"));
        assertTrue(summaries.versionSummary(line,version).readyToRelease());
    }
    @Test void emptyVersionIsNotReadyAndInvalidAutoConfigurationRejected() {
        String empty=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,'空版本','待开始','u','u',NOW(),NOW())",empty,tenant,line,empty);
        assertFalse(summaries.versionSummary(line,empty).readyToRelease());
        assertThrows(IllegalArgumentException.class,()->publish("test",new Workflow(states(),List.of(new Edge("start","open","doing","开始"),new Edge("auto","doing","done","自动",null,null,null,true)))));
    }
    private List<State> states() { return List.of(new State("open","待处理",WorkItemStatus.Group.NOT_STARTED,true,false,true,"requirement"),new State("doing","处理中",WorkItemStatus.Group.IN_PROGRESS,false,false,true,"test"),new State("done","交付完成",WorkItemStatus.Group.COMPLETED,false,true,true,"release")); }
    private Workflow requirementFlow(boolean acceptance) {
        var states=new ArrayList<>(states()); if(acceptance) states.add(new State("accepted","产品已验收",WorkItemStatus.Group.IN_PROGRESS,false,false,true,"acceptance"));
        var edges=new ArrayList<Edge>(); edges.add(new Edge("approve","open","doing","评审通过",null,null,new ApprovalTasks(types.get("design"),types.get("dev"),types.get("test"))));
        if(acceptance) edges.add(new Edge("accept","doing","accepted","产品验收"));
        edges.add(new Edge("auto",acceptance?"accepted":"doing","done","自动完成",null,null,null,true)); return new Workflow(states,edges);
    }
    private String publish(String category,Workflow workflow) { var flow=configurations.save(line,null,new SaveWorkflow(category,"流程",workflow,null)); String id=flow.get("id").toString(); configurations.publish(line,id,0); return id; }
    private String create(String category,String parent) { return storage.create(new CreateItem(UUID.randomUUID().toString(),line,category,types.get(category),category,null,null,version,parent,null,null,"P1",null,null,null)).get("id").toString(); }
    private void move(String id,String edge) { transitions.execute(line,id,new Transition(edge,((Number)storage.detail(line,id).get("revision")).intValue(),null)); }
    private void finish(String id) { move(id,"start"); move(id,"finish"); }
}

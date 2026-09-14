package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.*;
import java.util.concurrent.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static org.junit.jupiter.api.Assertions.*;

class WorkItemRegressionIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired WorkItemRegressionService regressions;
    @Autowired WorkItemStorageService storage;
    @Autowired WorkItemTransitionService transitions;
    @Autowired WorkItemRelationService relations;
    @Autowired WorkItemConfigurationService configurations;
    @Autowired ProductLineService lines;
    @Autowired PlatformTransactionManager transactions;
    String tenant,line,bug;
    Map<String,String> types=new HashMap<>();
    @BeforeEach void setup() {
        tenant=UUID.randomUUID().toString(); line=UUID.randomUUID().toString(); session("u","admin",tenant);
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'回归测试','u','u',NOW(),NOW())",line,tenant,line);
        for(String category:List.of("requirement","bug","test")) {
            types.put(category,lines.addWorkItemType(line,new HashMap<>(Map.of("category",CATEGORIES.get(category),"name",category,"enabled",true))).get("id").toString());
            var definition=new Workflow(List.of(new State("open","未开始",WorkItemStatus.Group.NOT_STARTED,true,false,true,"test"),new State("doing","进行中",WorkItemStatus.Group.IN_PROGRESS,false,false,true,"test"),new State("done","完成",WorkItemStatus.Group.COMPLETED,false,true,true,"test")),List.of(new Edge("start","open","doing","开始"),new Edge("finish","doing","done","完成"),new Edge("reopen","done","doing","重开")));
            var flow=configurations.save(line,null,new SaveWorkflow(category,"流程",definition,null)); configurations.publish(line,flow.get("id").toString(),0);
        }
        bug=storage.create(item("bug",UUID.randomUUID().toString(),null,null)).get("id").toString();
    }
    @AfterEach void clear() {
        for(String table:List.of("t_product_work_item_relation","t_product_work_item_activity","t_product_work_item","t_product_workflow","t_product_line_work_item_type","t_product_line_version","t_product_line_activity","t_product_line")) jdbc.update("DELETE FROM "+table+" WHERE tenant_id_=?",tenant);
        RequestContext.clear();
    }
    @Test void regressionBlocksBugUntilTestSucceedsAndRetainsProvenance() {
        var result=regressions.create(line,bug,input(UUID.randomUUID().toString())); String test=result.get("id").toString();
        assertEquals("DEFECT_REGRESSION",result.get("sourceType")); assertEquals("P1",result.get("priority"));
        assertEquals("描述",result.get("description")); assertTrue(relations.list(line,bug).blocked());
        move(bug,"start"); assertThrows(RuntimeException.class,()->move(bug,"finish"));
        move(test,"start"); move(test,"finish"); assertFalse(relations.list(line,bug).blocked());
        assertEquals("doing",storage.detail(line,bug).get("statusKey")); move(bug,"finish");
    }
    @Test void onlineIssueCanReferenceFinishedHistoricalRequirementWithoutChangingIt() {
        String version=version("待开始");
        String requirement=storage.create(item("requirement",UUID.randomUUID().toString(),null,version)).get("id").toString();
        move(requirement,"start"); move(requirement,"finish");
        jdbc.update("UPDATE t_product_line_version SET status_='已发布' WHERE id_=? AND tenant_id_=?",version,tenant);
        var before=storage.detail(line,requirement);
        var body=item("bug",UUID.randomUUID().toString(),requirement,null);
        var online=regressions.onlineIssue(body); assertEquals("ONLINE_ISSUE",online.get("sourceType"));
        assertEquals(online.get("id"),regressions.onlineIssue(body).get("id"));
        String onlineId=online.get("id").toString();
        var test=regressions.create(line,onlineId,new WorkItemRegressionService.CreateRegression(UUID.randomUUID().toString(),0,types.get("test"),"线上回归",null,null,null));
        assertEquals(requirement,test.get("requirementId")); assertEquals(before,storage.detail(line,requirement));
    }
    @Test void sameRequestRetriesButChangedActorSourceOrPayloadConflicts() {
        var input=input(UUID.randomUUID().toString()); var first=regressions.create(line,bug,input);
        assertEquals(first.get("id"),regressions.create(line,bug,input).get("id"));
        assertThrows(RuntimeException.class,()->regressions.create(line,bug,new WorkItemRegressionService.CreateRegression(input.requestId(),0,types.get("test"),"changed",null,null,null)));
        String other=storage.create(item("bug",UUID.randomUUID().toString(),null,null)).get("id").toString();
        assertThrows(RuntimeException.class,()->regressions.create(line,other,input));
        session("other-user","admin",tenant); assertThrows(RuntimeException.class,()->regressions.create(line,bug,input));
    }
    @Test void unfinishedRegressionPreventsAnotherRoundAndCannotBeDetached() {
        var test=regressions.create(line,bug,input(UUID.randomUUID().toString()));
        assertThrows(RuntimeException.class,()->regressions.create(line,bug,input(UUID.randomUUID().toString())));
        var relation=relations.list(line,bug).relations().get(0);
        assertThrows(RuntimeException.class,()->relations.delete(line,bug,relation.get("id").toString(),0));
        move(test.get("id").toString(),"start"); move(test.get("id").toString(),"finish");
        assertNotEquals(test.get("id"),regressions.create(line,bug,input(UUID.randomUUID().toString())).get("id"));
    }
    @Test void outerFailureRollsBackTasksRelationsActivitiesAndSourceRevision() {
        var before=storage.detail(line,bug); int count=storage.activities(line,bug).size();
        var body=input(UUID.randomUUID().toString());
        assertThrows(IllegalStateException.class,()->new TransactionTemplate(transactions).execute(status->{regressions.create(line,bug,body); throw new IllegalStateException("late failure");}));
        assertEquals(before,storage.detail(line,bug)); assertEquals(count,storage.activities(line,bug).size());
        assertTrue(relations.list(line,bug).relations().isEmpty());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE tenant_id_=? AND category_='test'",Integer.class,tenant));
        assertNotNull(regressions.create(line,bug,body).get("id"));
    }
    @Test void staleSourceDisabledTypeAndForeignTenantAreRejected() {
        var stale=input(UUID.randomUUID().toString()); move(bug,"start");
        assertThrows(RuntimeException.class,()->regressions.create(line,bug,stale));
        jdbc.update("UPDATE t_product_line_work_item_type SET enabled_=0 WHERE tenant_id_=? AND id_=?",tenant,types.get("test"));
        assertThrows(RuntimeException.class,()->regressions.create(line,bug,input(UUID.randomUUID().toString())));
        var valid=input(UUID.randomUUID().toString()); session("u","admin","foreign");
        assertThrows(RuntimeException.class,()->regressions.create(line,bug,valid));
        session("u","product",tenant); assertThrows(RuntimeException.class,()->regressions.create(line,bug,valid));
    }
    @Test void publishedSourceOrTargetVersionAndCompletedBugAreRejected() {
        String version=version("已发布"); var body=input(UUID.randomUUID().toString());
        assertThrows(RuntimeException.class,()->regressions.create(line,bug,new WorkItemRegressionService.CreateRegression(body.requestId(),body.revision(),body.taskTypeId(),body.title(),version,null,null)));
        jdbc.update("UPDATE t_product_work_item SET version_id_=? WHERE tenant_id_=? AND id_=?",version,tenant,bug);
        assertThrows(RuntimeException.class,()->regressions.create(line,bug,body));
        jdbc.update("UPDATE t_product_work_item SET version_id_=NULL WHERE tenant_id_=? AND id_=?",tenant,bug);
        move(bug,"start"); move(bug,"finish"); assertThrows(RuntimeException.class,()->regressions.create(line,bug,input(UUID.randomUUID().toString())));
    }
    @Test void concurrentSameRequestCreatesOneTask() throws Exception {
        var body=input(UUID.randomUUID().toString()); ExecutorService pool=Executors.newFixedThreadPool(2);
        CountDownLatch start=new CountDownLatch(1);
        Callable<String> call=()-> { session("u","admin",tenant); try { assertTrue(start.await(10,TimeUnit.SECONDS)); return regressions.create(line,bug,body).get("id").toString(); } finally {RequestContext.clear();} };
        try { var first=pool.submit(call); var second=pool.submit(call); start.countDown(); assertEquals(first.get(15,TimeUnit.SECONDS),second.get(15,TimeUnit.SECONDS)); }
        finally {pool.shutdownNow();}
        assertEquals(1,relations.list(line,bug).relations().size());
    }
    @Test void authenticatedEndpointCreatesRegression() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/work-items/{id}/regression-tests",bug).param("productLineId",line)
            .header("Authorization","Bearer "+tokens.issue("u","admin",tenant)).contentType("application/json").content(objectMapper.writeValueAsString(input(UUID.randomUUID().toString()))))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.sourceType").value("DEFECT_REGRESSION"));
    }
    @Test void manualRequestCannotBeRelabeledAsOnlineAndNonBugRejected() {
        String request=UUID.randomUUID().toString(); var body=item("bug",request,null,null); storage.create(body);
        assertThrows(RuntimeException.class,()->regressions.onlineIssue(body));
        assertThrows(RuntimeException.class,()->regressions.onlineIssue(item("test",UUID.randomUUID().toString(),null,null)));
    }
    private WorkItemRegressionService.CreateRegression input(String request) { return new WorkItemRegressionService.CreateRegression(request,((Number)storage.detail(line,bug).get("revision")).intValue(),types.get("test"),"回归测试",null,null,null); }
    private CreateItem item(String category,String request,String requirement,String version) { return new CreateItem(request,line,category,types.get(category),category,"描述","目标",version,requirement,null,null,"P1",null,null,null); }
    private void move(String id,String edge) { transitions.execute(line,id,new Transition(edge,((Number)storage.detail(line,id).get("revision")).intValue(),null)); }
    private void session(String user,String role,String scope) { RequestContext.set(Map.of("sub",user,"tenant",scope,"role",role)); }
    private String version(String status) { String id=UUID.randomUUID().toString(); jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,'版本',?,'u','u',NOW(),NOW())",id,tenant,line,id,status); return id; }
}

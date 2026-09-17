package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static org.junit.jupiter.api.Assertions.*;

@Transactional
class WorkItemRelationIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired WorkItemRelationService relations;
    @Autowired WorkItemStorageService storage;
    @Autowired WorkItemTransitionService transitions;
    @Autowired WorkItemConfigurationService configurations;
    @Autowired ProductLineService lines;
    String tenant,line;
    Map<String,String> types=new HashMap<>();
    @BeforeEach void setup() {
        tenant=UUID.randomUUID().toString(); line=UUID.randomUUID().toString();
        RequestContext.set(Map.of("sub","u","tenant",tenant,"role","admin"));
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'依赖测试','u','u',NOW(),NOW())",line,tenant,line);
        for(String category:List.of("requirement","test","bug","dev")) {
            types.put(category,lines.addWorkItemType(line,new HashMap<>(Map.of("category",CATEGORIES.get(category),"name",category,"enabled",true))).get("id").toString());
            var definition=new Workflow(List.of(new State("open","未开始",WorkItemStatus.Group.NOT_STARTED,true,false,true,"test"),new State("doing","进行中",WorkItemStatus.Group.IN_PROGRESS,false,false,true,"test"),new State("done","完成",WorkItemStatus.Group.COMPLETED,false,true,true,"test")),List.of(new Edge("start","open","doing","开始"),new Edge("finish","doing","done","完成"),new Edge("reopen","done","doing","重开")));
            var flow=configurations.save(line,null,new SaveWorkflow(category,"流程",definition,null)); configurations.publish(line,flow.get("id").toString(),0);
        }
    }
    @AfterEach void clear() {
        if(!org.springframework.test.context.transaction.TestTransaction.isActive()) {
            for(String table:List.of("t_product_work_item_relation","t_product_work_item_activity","t_product_work_item","t_product_workflow","t_product_line_work_item_type","t_product_line_activity","t_product_line"))
                jdbc.update("DELETE FROM "+table+" WHERE tenant_id_=?",tenant);
        }
        RequestContext.clear();
    }
    @Test void startDependencyBlocksAndReleasesWithoutReplacingState() {
        String a=create("dev","P2",null,null),b=create("test","P2",null,null);
        link(a,b,"BLOCKS","START");
        assertThrows(RuntimeException.class,()->move(b,"start"));
        assertEquals("open",storage.detail(line,b).get("statusKey"));
        move(a,"start"); move(a,"finish");
        assertFalse(relations.list(line,b).blocked()); move(b,"start");
        assertTrue(storage.activities(line,b).stream().anyMatch(e->"WORK_ITEM_UNBLOCKED".equals(e.get("eventType"))));
    }
    @Test void finishDependencyAllowsWorkButNotCompletionAndDeleteIsIdempotent() {
        String a=create("dev","P2",null,null),b=create("test","P2",null,null);
        var relation=link(a,b,"BLOCKS","FINISH"); move(b,"start");
        assertThrows(RuntimeException.class,()->move(b,"finish"));
        assertThrows(RuntimeException.class,()->relations.delete(line,b,relation.get("id").toString(),2));
        relations.delete(line,b,relation.get("id").toString(),0); relations.delete(line,b,relation.get("id").toString(),0);
        assertEquals("doing",storage.detail(line,b).get("statusKey")); move(b,"finish");
    }
    @Test void duplicateAndSymmetricRelationsDoNotDuplicateActivities() {
        String a=create("dev","P2",null,null),b=create("test","P2",null,null);
        var first=link(a,b,"RELATES_TO",null);
        int count=storage.activities(line,a).size();
        assertEquals(first.get("id"),link(b,a,"RELATES_TO",null).get("id"));
        assertEquals(count,storage.activities(line,a).size()); assertFalse(relations.list(line,b).blocked());
    }
    @Test void cycleRejectedWithoutReturningSuccess() {
        String a=create("dev","P2",null,null),b=create("test","P2",null,null);
        link(a,b,"BLOCKS","FINISH");
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->link(b,a,"BLOCKS","FINISH"));
    }
    @Test
    @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void rejectedCycleRollsBackRelationAndAuditInRealTransaction() {
        String a=create("dev","P2",null,null),b=create("test","P2",null,null);
        link(a,b,"BLOCKS","FINISH");
        int events=storage.activities(line,a).size();
        assertThrows(RuntimeException.class,()->link(b,a,"BLOCKS","FINISH"));
        assertEquals(1,relations.list(line,a).relations().size());
        assertEquals(events,storage.activities(line,a).size());
        assertFalse(relations.list(line,a).blocked()); assertTrue(relations.list(line,b).blocked());
    }
    @Test void readOnlyRoleCannotCreateRelation() {
        String a=create("dev","P2",null,null),b=create("test","P2",null,null);
        RequestContext.set(Map.of("sub","u","tenant",tenant,"role","product"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->link(a,b,"BLOCKS","START"));
    }
    @Test void p0AndP1DefectsBlockTestAndRequirementUntilClosed() {
        String requirement=create("requirement","P1",null,null),test=create("test","P1",requirement,null);
        move(test,"start");
        for(String priority:List.of("P0","P1")) {
            String bug=create("bug",priority,requirement,null); link(test,bug,"FOUND_DEFECT",null);
            assertTrue(relations.list(line,test).blocked()); assertTrue(relations.list(line,requirement).blocked());
            assertThrows(RuntimeException.class,()->move(test,"finish"));
            move(bug,"start"); move(bug,"finish");
            assertFalse(relations.list(line,test).blocked()); assertFalse(relations.list(line,requirement).blocked());
        }
        assertEquals("doing",storage.detail(line,test).get("statusKey")); move(test,"finish");
    }
    @Test void lowerPriorityAndAfterCompletionDefectsDoNotBlockOrReopen() {
        String test=create("test","P2",null,null);
        for(String priority:List.of("P2","P3")) link(test,create("bug",priority,null,null),"FOUND_DEFECT",null);
        assertFalse(relations.list(line,test).blocked()); move(test,"start"); move(test,"finish");
        link(test,create("bug","P0",null,null),"FOUND_DEFECT",null);
        assertFalse(relations.list(line,test).blocked()); assertEquals("done",storage.detail(line,test).get("statusKey"));
        move(test,"reopen"); assertFalse(relations.list(line,test).blocked());
    }
    @Test void blockerReopenRestoresBlockerAndRevisionRejectsOldAction() {
        String test=create("test","P1",null,null),bug=create("bug","P1",null,null);
        link(test,bug,"FOUND_DEFECT",null); move(bug,"start"); move(bug,"finish");
        int revision=((Number)storage.detail(line,test).get("revision")).intValue();
        move(bug,"reopen"); assertTrue(relations.list(line,test).blocked());
        assertThrows(RuntimeException.class,()->transitions.execute(line,test,new Transition("start",revision,null)));
    }
    @Test void crossRequirementsAndVersionsAllowedButPublishedVersionReadOnly() {
        String version=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,'版本','待开始','u','u',NOW(),NOW())",version,tenant,line,version);
        String r1=create("requirement","P2",null,null),r2=create("requirement","P2",null,version);
        String a=create("dev","P2",r1,null),b=create("test","P2",r2,version);
        var relation=link(a,b,"BLOCKS","FINISH"); assertTrue(relations.list(line,b).blocked());
        jdbc.update("UPDATE t_product_line_version SET status_='已发布' WHERE tenant_id_=?",tenant);
        assertThrows(RuntimeException.class,()->relations.delete(line,a,relation.get("id").toString(),0));
    }
    @Test void rejectsForeignTenantSelfAndInvalidDefectDirection() {
        String a=create("dev","P2",null,null),b=create("test","P2",null,null);
        assertThrows(RuntimeException.class,()->link(a,a,"BLOCKS","START"));
        assertThrows(RuntimeException.class,()->link(a,b,"FOUND_DEFECT",null));
        RequestContext.set(Map.of("sub","u","tenant","foreign","role","admin"));
        assertThrows(RuntimeException.class,()->relations.list(line,a));
    }
    @Test void authenticatedRelationEndpointListsBlockers() throws Exception {
        String a=create("dev","P2",null,null),b=create("test","P2",null,null);
        String token="Bearer "+tokens.issue("u","admin",tenant);
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/work-items/{id}/relations",a).param("productLineId",line).header("Authorization",token).contentType("application/json").content("{\"targetId\":\""+b+"\",\"type\":\"BLOCKS\",\"scope\":\"START\"}"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/work-items/{id}/relations",b).param("productLineId",line).header("Authorization",token))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.blocked").value(true));
    }
    private Map<String,Object> link(String from,String to,String type,String scope) { return relations.create(line,from,new WorkItemRelationService.CreateRelation(to,type,scope)); }
    private void move(String id,String edge) { transitions.execute(line,id,new Transition(edge,((Number)storage.detail(line,id).get("revision")).intValue(),null)); }
    private String create(String category,String priority,String requirement,String version) { return storage.create(new CreateItem(UUID.randomUUID().toString(),line,category,types.get(category),category,null,null,version,requirement,null,null,priority,null,null,null,null)).get("id").toString(); }
}

package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Transactional
class WorkItemTransitionIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired WorkItemConfigurationService configuration;
    @Autowired WorkItemStorageService storage;
    @Autowired WorkItemTransitionService transitions;
    @Autowired ProductLineService lines;
    @Autowired WorkItemStorageMapper persistence;
    private String line,type,id,flow;
    private static final String TENANT="transition-test";
    @BeforeEach void setup() {
        session("admin"); line=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'流转测试','u','u',NOW(),NOW())",line,TENANT,line);
        type=lines.addWorkItemType(line,new HashMap<>(Map.of("category","设计","name","主设计","enabled",true))).get("id").toString();
        flow=publish(workflow()); id=create(null,null);
    }
    @AfterEach void clear() { RequestContext.clear(); }
    @Test void startFinishAndExplicitReopenPreserveStartAndRecordHistory() {
        var started=execute(id,"start",0,""); assertNotNull(started.get("actualStartAt")); assertNull(started.get("completedAt"));
        var done=execute(id,"finish",1,"已检查"); assertEquals("完成",done.get("statusName")); assertNotNull(done.get("completedAt"));
        var reopened=execute(id,"reopen",2,"需要补充"); assertNull(reopened.get("completedAt")); assertEquals(started.get("actualStartAt"),reopened.get("actualStartAt"));
        assertEquals(4,storage.activities(line,id).size());
        assertEquals("doing",storage.detail(line,id).get("statusKey"));
    }
    @Test void rejectsJumpAndStaleRevisionWithoutDuplicateActivity() {
        assertThrows(ResponseStatusException.class,()->execute(id,"finish",0,"原因"));
        execute(id,"start",0,"");
        assertThrows(ResponseStatusException.class,()->execute(id,"start",0,""));
        assertThrows(ResponseStatusException.class,()->execute(id,"finish",0,"原因"));
        assertEquals(2,storage.activities(line,id).size());
        assertEquals("doing",storage.detail(line,id).get("statusKey"));
    }
    @Test void noDesignIsExplicitSuccessfulTransitionAndRequiresReason() {
        assertThrows(ResponseStatusException.class,()->execute(id,"skip",0,""));
        var result=execute(id,"skip",0,"复用已有方案");
        assertEquals("无需设计",result.get("statusName")); assertEquals("COMPLETED",result.get("statusGroup"));
        assertTrue(WorkItemConfigurationService.enabled(result.get("successful")));
        assertNotNull(result.get("completedAt")); assertNull(result.get("actualStartAt"));
    }
    @Test void unfinishedChildBlocksParentAndCompletedParentBlocksChildReopen() {
        configuration.childRule(line,new ChildRule(type,type,true)); String child=create(id,null);
        assertFalse(transitions.available(line,id).actions().stream().filter(a->a.edgeKey().equals("skip")).findFirst().orElseThrow().allowed());
        assertThrows(ResponseStatusException.class,()->execute(id,"skip",0,"无需设计"));
        execute(child,"skip",0,"子任务无需设计"); execute(id,"skip",0,"完成");
        assertThrows(ResponseStatusException.class,()->execute(child,"resume",1,"重开"));
    }
    @Test void publishedIterationIsReadOnlyForEveryAction() {
        String version=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,'版本','待开始','u','u',NOW(),NOW())",version,TENANT,line,version);
        String task=create(null,version);
        jdbc.update("UPDATE t_product_line_version SET status_='已发布' WHERE id_=?",version);
        assertThrows(ResponseStatusException.class,()->execute(task,"start",0,""));
        assertTrue(transitions.available(line,task).actions().stream().noneMatch(WorkItemTransitionService.Action::allowed));
    }
    @Test void pinnedWorkflowWinsOverNewPublishedDefinition() {
        Workflow revised=new Workflow(workflow().states(),workflow().transitions().stream().filter(e->!e.key().equals("finish")).toList());
        // Keep all states reachable through the explicit skip/reopen route.
        publish(revised); execute(id,"start",0,""); execute(id,"finish",1,"老流程允许");
        assertEquals(flow,storage.detail(line,id).get("workflowId"));
    }
    @Test void configuredRoleAndMissingPersistedFieldAreEnforced() {
        Workflow original=workflow();
        var edges=new ArrayList<>(original.transitions());
        edges.set(0,new Edge("start","open","doing","开始",List.of("tech_lead"),List.of("assigneeId")));
        publish(new Workflow(original.states(),edges)); String task=create(null,null);
        assertEquals(403,assertThrows(ResponseStatusException.class,()->execute(task,"start",0,"")).getStatusCode().value());
        session("tech_lead");
        assertTrue(assertThrows(ResponseStatusException.class,()->execute(task,"start",0,"")).getReason().contains("负责人"));
    }
    @Test void endpointValidatesRevisionAndExposesActions() throws Exception {
        String bearer="Bearer "+tokens.issue("u","admin",TENANT);
        mockMvc.perform(get("/api/work-items/{id}/transitions",id).param("productLineId",line).header("Authorization",bearer))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.revision").value(0));
        mockMvc.perform(post("/api/work-items/{id}/transitions",id).param("productLineId",line).header("Authorization",bearer)
                .contentType("application/json").content("{\"edgeKey\":\"start\"}"))
            .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/work-items/{id}/transitions",id).param("productLineId",line).header("Authorization",bearer)
                .contentType("application/json").content("{\"edgeKey\":\"start\",\"revision\":0}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.statusKey").value("doing"));
    }
    @Test void foreignTenantAndReadOnlyRoleCannotExecute() {
        session("product"); assertEquals(403,assertThrows(ResponseStatusException.class,()->execute(id,"start",0,"")).getStatusCode().value());
        RequestContext.set(Map.of("sub","u","tenant","other","role","admin"));
        assertEquals(404,assertThrows(ResponseStatusException.class,()->execute(id,"start",0,"")).getStatusCode().value());
    }
    @Test void compareAndSetRejectsSecondWriterAtSameRevision() {
        State target=workflow().states().get(1);
        assertEquals(1,persistence.transition(TENANT,line,id,0,"open",target,"u"));
        assertEquals(0,persistence.transition(TENANT,line,id,0,"open",target,"u"));
        assertEquals(1,((Number)storage.detail(line,id).get("revision")).intValue());
    }
    @Test void disabledDestinationIsUnavailableEvenWithExplicitEdge() {
        var states=new ArrayList<>(workflow().states());
        states.add(new State("disabled","停用状态",WorkItemStatus.Group.IN_PROGRESS,false,false,false,"design"));
        var edges=new ArrayList<>(workflow().transitions()); edges.add(new Edge("disabled-action","open","disabled","停用操作"));
        publish(new Workflow(states,edges)); String task=create(null,null);
        assertThrows(ResponseStatusException.class,()->execute(task,"disabled-action",0,""));
        assertFalse(transitions.available(line,task).actions().stream().filter(a->a.edgeKey().equals("disabled-action")).findFirst().orElseThrow().allowed());
    }
    private Map<String,Object> execute(String task,String edge,int revision,String reason) { return transitions.execute(line,task,new Transition(edge,revision,reason)); }
    private String create(String parent,String version) { return storage.create(new CreateItem(UUID.randomUUID().toString(),line,"design",type,"设计任务",null,null,version,null,parent,null,"P2",null,null,null)).get("id").toString(); }
    private String publish(Workflow definition) { var draft=configuration.save(line,null,new SaveWorkflow("design","设计流程",definition,null)); String key=draft.get("id").toString(); configuration.publish(line,key,0); return key; }
    private void session(String role) { RequestContext.set(Map.of("sub","u","tenant",TENANT,"role",role)); }
    private static Workflow workflow() {
        return new Workflow(List.of(
            new State("open","待设计",WorkItemStatus.Group.NOT_STARTED,true,false,true,"design"),
            new State("doing","设计中",WorkItemStatus.Group.IN_PROGRESS,false,false,true,"design"),
            new State("done","完成",WorkItemStatus.Group.COMPLETED,false,true,true,"design"),
            new State("skipped","无需设计",WorkItemStatus.Group.COMPLETED,false,true,true,"design")),List.of(
            new Edge("start","open","doing","开始"),new Edge("finish","doing","done","完成",null,List.of("reason")),
            new Edge("skip","open","skipped","无需设计",null,List.of("reason")),new Edge("reopen","done","doing","重开"),
            new Edge("resume","skipped","done","恢复完成")));
    }
}

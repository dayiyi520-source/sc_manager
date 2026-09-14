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

@Transactional
class WorkItemStorageIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired WorkItemConfigurationService configurations;
    @Autowired WorkItemStorageService storage;
    @Autowired ProductLineService productLines;
    @Autowired UnifiedWorkItemService unified;
    private String line,type,workflow;
    private final String tenant="work-item-storage-test";

    @BeforeEach void fixture() {
        RequestContext.set(Map.of("sub","test-user","tenant",tenant,"role","admin"));
        line=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'统一存储测试','test-user','test-user',NOW(),NOW())",line,tenant,"TEST-"+line);
        type=type("test","测试执行");
        workflow=publish("test");
    }
    @AfterEach void clear() { RequestContext.clear(); }

    @Test void persistsAllCategoriesInOneTableAndReadsTypedStates() {
        for(String category:CATEGORIES.keySet()) {
            String selectedType="test".equals(category)?type:type(category,"主任务");
            if(!"test".equals(category)) publish(category);
            var item=storage.create(input(UUID.randomUUID().toString(),category,selectedType,null,null,null));
            assertEquals(category,item.get("category"));
            assertEquals("open",item.get("statusKey"));
            assertEquals(1,storage.activities(line,item.get("id").toString()).size());
        }
        assertEquals(5,jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE tenant_id_=?",Integer.class,tenant));
        var result=unified.list(line,"","test","",1,20).page().items().get(0);
        assertEquals(type,result.taskTypeId());
        assertEquals(workflow,result.workflowId());
        assertEquals(WorkItemStatus.Group.NOT_STARTED,result.status().group());
    }
    @Test void createIsIdempotentAndRejectsChangedPayload() {
        var input=input("same-request","test",type,null,null,null);
        var first=storage.create(input);
        assertEquals(first.get("id"),storage.create(input).get("id"));
        assertEquals(1,storage.activities(line,first.get("id").toString()).size());
        var changed=new CreateItem(input.requestId(),line,"test",type,"不同标题",null,null,null,null,null,null,"P1",null,null,null);
        assertEquals(409,assertThrows(ResponseStatusException.class,()->storage.create(changed)).getStatusCode().value());
    }
    @Test void usedTypeCanBeDisabledButNotDeletedOrRecategorized() {
        storage.create(input("type-use","test",type,null,null,null));
        assertThrows(IllegalArgumentException.class,()->productLines.deleteWorkItemType(line,type));
        assertThrows(IllegalArgumentException.class,()->productLines.updateWorkItemType(line,type,new HashMap<>(Map.of("category","研发"))));
        productLines.updateWorkItemType(line,type,new HashMap<>(Map.of("enabled",false)));
        assertThrows(IllegalArgumentException.class,()->storage.create(input("disabled","test",type,null,null,null)));
    }
    @Test void publishedDefinitionCannotChangeAndNewVersionDoesNotRebindExistingWork() {
        var item=storage.create(input("pinned","test",type,null,null,null));
        assertThrows(ResponseStatusException.class,()->configurations.save(line,workflow,new SaveWorkflow("test","篡改",WorkItemDefinitionTest.workflow(),1)));
        var next=configurations.save(line,null,new SaveWorkflow("test","第二版",WorkItemDefinitionTest.workflow(),null));
        assertEquals(2,((Number)next.get("workflowVersion")).intValue());
        configurations.publish(line,next.get("id").toString(),0);
        assertEquals(workflow,storage.detail(line,item.get("id").toString()).get("workflowId"));
        assertEquals(next.get("id"),storage.create(input("new-version","test",type,null,null,null)).get("workflowId"));
    }
    @Test void staleDraftRevisionCannotOverwriteConfiguration() {
        var draft=configurations.save(line,null,new SaveWorkflow("test","草稿",WorkItemDefinitionTest.workflow(),null));
        String id=draft.get("id").toString();
        configurations.save(line,id,new SaveWorkflow("test","更新",WorkItemDefinitionTest.workflow(),0));
        assertThrows(ResponseStatusException.class,()->configurations.save(line,id,new SaveWorkflow("test","覆盖",WorkItemDefinitionTest.workflow(),0)));
    }
    @Test void childRequiresRuleAndInheritsParentVersion() {
        String version=version("待开始");
        var parent=storage.create(input("parent","test",type,null,version,null));
        String childType=type("test","测试用例");
        var childInput=input("child","test",childType,parent.get("id").toString(),null,null);
        assertThrows(IllegalArgumentException.class,()->storage.create(childInput));
        configurations.childRule(line,new ChildRule(type,childType,true));
        var child=storage.create(childInput);
        assertEquals(version,child.get("versionId"));
        assertEquals(parent.get("id"),child.get("parentWorkItemId"));
        assertThrows(IllegalArgumentException.class,()->storage.create(input("wrong-version","test",childType,parent.get("id").toString(),UUID.randomUUID().toString(),null)));
    }
    @Test void rejectsPublishedVersionAndForeignType() {
        assertThrows(ResponseStatusException.class,()->storage.create(input("published","test",type,null,version("已发布"),null)));
        assertThrows(IllegalArgumentException.class,()->storage.create(input("foreign","test",UUID.randomUUID().toString(),null,null,null)));
        assertThrows(IllegalArgumentException.class,()->storage.create(input("wrong-category","dev",type,null,null,null)));
    }
    @Test void rejectsForeignTenantAndReadOnlyRole() {
        RequestContext.set(Map.of("sub","test-user","tenant","other-tenant","role","admin"));
        assertEquals(404,assertThrows(ResponseStatusException.class,()->configurations.workflows(line)).getStatusCode().value());
        RequestContext.set(Map.of("sub","test-user","tenant",tenant,"role","product"));
        assertEquals(403,assertThrows(ResponseStatusException.class,()->storage.create(input("readonly","test",type,null,null,null))).getStatusCode().value());
    }
    @Test void configuredRequirementChildrenKeepTopLevelRequirement() {
        String requirementType=type("requirement","需求拆分"); publish("requirement");
        configurations.childRule(line,new ChildRule(requirementType,requirementType,true));
        configurations.childRule(line,new ChildRule(requirementType,type,true));
        String root=storage.create(input("root","requirement",requirementType,null,null,null)).get("id").toString();
        String child=storage.create(input("sub-requirement","requirement",requirementType,root,null,null)).get("id").toString();
        var test=storage.create(input("sub-test","test",type,child,null,null));
        assertEquals(root,test.get("requirementId"));
    }
    @Test void createAndDetailEndpointsUseTheRealCoreContract() throws Exception {
        String authorization="Bearer "+tokens.issue("test-user","admin",tenant);
        String response=mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/work-items")
                .header("Authorization",authorization).contentType("application/json")
                .content(objectMapper.writeValueAsString(input("http-create","test",type,null,null,null))))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.workflowId").value(workflow))
            .andReturn().getResponse().getContentAsString();
        String id=objectMapper.readTree(response).path("data").path("id").asText();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/work-items/{id}",id)
                .param("productLineId",line).header("Authorization",authorization))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.category").value("test"));
    }
    private String type(String category,String name) {
        return productLines.addWorkItemType(line,new HashMap<>(Map.of("category",CATEGORIES.get(category),"name",name,"enabled",true))).get("id").toString();
    }
    private String publish(String category) {
        var value=configurations.save(line,null,new SaveWorkflow(category,"分类流程",WorkItemDefinitionTest.workflow(),null));
        String id=value.get("id").toString(); configurations.publish(line,id,0); return id;
    }
    private String version(String status) {
        String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,'验收版本',?,'test-user','test-user',NOW(),NOW())",id,tenant,line,id,status);
        return id;
    }
    private CreateItem input(String request,String category,String selectedType,String parent,String version,String requirement) {
        return new CreateItem(request,line,category,selectedType,"真实统一工作项",null,null,version,requirement,parent,null,"P1",null,null,null);
    }
}

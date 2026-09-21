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
    @Autowired AutomationRuleService automations;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
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
            assertEquals("neutral",item.get("statusColor"));
            assertEquals(1,storage.activities(line,item.get("id").toString()).size());
        }
        assertEquals(CATEGORIES.size(),jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE tenant_id_=?",Integer.class,tenant));
        var result=unified.list(line,"","test","",1,20).page().items().get(0);
        assertEquals(type,result.taskTypeId());
        assertEquals(workflow,result.workflowId());
        assertEquals(WorkItemStatus.Group.NOT_STARTED,result.status().group());
        assertEquals("neutral",result.statusColor());
    }
    @Test void createIsIdempotentAndRejectsChangedPayload() {
        var input=input("same-request","test",type,null,null,null);
        var first=storage.create(input);
        assertEquals(first.get("id"),storage.create(input).get("id"));
        assertEquals(1,storage.activities(line,first.get("id").toString()).size());
        var changed=new CreateItem(input.requestId(),line,"test",type,"不同标题",null,null,null,null,null,null,"P1",null,null,null,null);
        assertEquals(409,assertThrows(ResponseStatusException.class,()->storage.create(changed)).getStatusCode().value());
    }
    @Test void persistsEstimatedAndActualHoursOnCreation() {
        var input=new CreateItem("hours",line,"test",type,"工时任务",null,null,null,null,null,null,"P2",null,null,
            new java.math.BigDecimal("8.50"),new java.math.BigDecimal("3.25"));
        var created=storage.create(input);
        assertEquals(0,new java.math.BigDecimal("8.50").compareTo((java.math.BigDecimal)created.get("estimatedHours")));
        assertEquals(0,new java.math.BigDecimal("3.25").compareTo((java.math.BigDecimal)created.get("actualHours")));
    }
    @Test void persistsRichTextDescriptionOnCreateAndUpdate() {
        var input=new CreateItem("rich-description",line,"test",type,"富文本任务","加粗内容","<p><strong>加粗内容</strong></p>",null,null,null,null,null,"P2",null,null,null,null);
        var created=storage.create(input);
        assertEquals("<p><strong>加粗内容</strong></p>",created.get("descriptionHtml"));
        var changed=storage.update(line,created.get("id").toString(),new UpdateItem(null,"更新内容","<p><em>更新内容</em></p>",null,null,null,null,null,null,null,null,0));
        assertEquals("<p><em>更新内容</em></p>",changed.get("descriptionHtml"));
    }
    @Test void updatesUnifiedFieldsWithOptimisticRevision() {
        jdbc.update("INSERT INTO t_sys_user(id_,tenant_id_,username_,name_,department_,role_,role_title_,status_,create_by_,update_by_,create_time_,update_time_) VALUES('assignee-user',?,'assignee-user','测试负责人','测试部','product_manager','测试负责人','enabled','test-user','test-user',NOW(),NOW())",tenant);
        var created=storage.create(input("update-fields","test",type,null,null,null));
        var update=new UpdateItem("更新后的统一任务","新描述","新目标",null,"测试负责人","P2",java.time.LocalDate.now(),java.time.LocalDate.now().plusDays(3),new java.math.BigDecimal("12.50"),new java.math.BigDecimal("2.25"),0);
        assertThrows(IllegalArgumentException.class,()->storage.update(line,created.get("id").toString(),update));
        var changed=storage.update(line,created.get("id").toString(),new UpdateItem("更新后的统一任务","新描述","新目标",null,null,"P2",java.time.LocalDate.now(),java.time.LocalDate.now().plusDays(3),new java.math.BigDecimal("12.50"),new java.math.BigDecimal("2.25"),0));
        assertEquals("更新后的统一任务",changed.get("title"));
        assertEquals("P2",changed.get("priority"));
        assertEquals(1,((Number)changed.get("revision")).intValue());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->storage.update(line,created.get("id").toString(),update)).getStatusCode().value());
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
    @Test void taskTypeWorkflowOverridesCategoryWorkflowForNewItems() {
        var scoped=configurations.save(line,type,null,new SaveWorkflow("test","测试执行专属流程",WorkItemDefinitionTest.workflow(),null));
        configurations.publish(line,scoped.get("id").toString(),0);
        var item=storage.create(input("type-scoped","test",type,null,null,null));
        assertEquals(type,scoped.get("taskTypeId"));
        assertEquals(scoped.get("id"),item.get("workflowId"));
    }
    @Test void createsTypeAndPublishedWorkflowAtomically() {
        var input=new CreateWorkItemType("测试","原子创建类型","同一事务保存",true,
            new SaveWorkflow("test","原子创建类型状态配置",WorkItemDefinitionTest.workflow(),null));
        var created=productLines.addWorkItemTypeWithWorkflow(line,input);
        var workflows=configurations.workflows(line,created.get("id").toString());
        assertEquals(1,workflows.size());
        assertEquals("PUBLISHED",workflows.get(0).get("status"));
        assertEquals(created.get("workflowId"),workflows.get(0).get("id"));

        int before=productLines.workItemTypes(line,null).size();
        var invalid=new CreateWorkItemType("测试","应回滚类型","",true,
            new SaveWorkflow("dev","分类错误",WorkItemDefinitionTest.workflow(),null));
        var transaction=new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThrows(IllegalArgumentException.class,()->transaction.executeWithoutResult(status->productLines.addWorkItemTypeWithWorkflow(line,invalid)));
        assertEquals(before,productLines.workItemTypes(line,null).size());
    }
    @Test void automationRuleCrudUsesOptimisticRevisionAndGlobalSwitch() {
        Map<String,Object> body=new HashMap<>();
        body.put("name","完成后创建子任务"); body.put("enabled",true); body.put("triggerType","STATUS_CHANGED");
        body.put("triggerTypeId",type); body.put("triggerStateKey","done"); body.put("conditionType","NONE");
        body.put("conditionValue",""); body.put("actionType","CREATE_SUBTASK"); body.put("actionConfig",Map.of("childTypeId",type));
        var created=automations.save(line,null,body);
        assertEquals(1,((List<?>)automations.overview(line,"").get("rules")).size());
        Map<String,Object> changed=new HashMap<>(body); changed.put("name","更新后的规则"); changed.put("revision",created.get("revision"));
        var updated=automations.save(line,created.get("id").toString(),changed);
        assertEquals("更新后的规则",updated.get("name"));
        assertThrows(ResponseStatusException.class,()->automations.save(line,created.get("id").toString(),changed));
        assertFalse((Boolean)automations.setting(line,false).get("enabled"));
        automations.delete(line,created.get("id").toString());
        assertTrue(((List<?>)automations.overview(line,"").get("rules")).isEmpty());
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
    @Test void childMustUseTheSameCategoryAsItsParent() {
        var parent=storage.create(input("same-category-parent","test",type,null,null,null));
        String devType=type("dev","研发子任务");
        publish("dev");

        var error=assertThrows(IllegalArgumentException.class,()->storage.create(
            input("cross-category-child","dev",devType,parent.get("id").toString(),null,null)));

        assertEquals("子任务分类必须与父任务一致",error.getMessage());
    }
    @Test void detailReturnsParentAndDeleteUsesRevisionAndProtectsChildren() {
        String childType=type("test","可删除子任务");
        configurations.childRule(line,new ChildRule(type,childType,true));
        var parent=storage.create(input("delete-parent","test",type,null,null,null));
        var child=storage.create(input("delete-child","test",childType,parent.get("id").toString(),null,null));

        var detail=storage.detail(line,child.get("id").toString());
        assertEquals(parent.get("id"),((Map<?,?>)detail.get("parent")).get("id"));
        var topLevel=unified.list(line,"","test","",1,20).page();
        assertEquals(1,topLevel.total());
        assertEquals(parent.get("id"),topLevel.items().get(0).id());
        assertTrue(topLevel.items().get(0).hasChildren());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->storage.delete(line,parent.get("id").toString(),((Number)parent.get("revision")).intValue())).getStatusCode().value());
        assertEquals(409,assertThrows(ResponseStatusException.class,()->storage.delete(line,child.get("id").toString(),99)).getStatusCode().value());

        storage.delete(line,child.get("id").toString(),((Number)child.get("revision")).intValue());
        assertEquals(404,assertThrows(ResponseStatusException.class,()->storage.detail(line,child.get("id").toString())).getStatusCode().value());
        storage.delete(line,parent.get("id").toString(),((Number)parent.get("revision")).intValue());
        assertEquals(404,assertThrows(ResponseStatusException.class,()->storage.detail(line,parent.get("id").toString())).getStatusCode().value());
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
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/work-items/{id}",id)
                .param("productLineId",line).header("Authorization",authorization).contentType("application/json")
                .content(objectMapper.writeValueAsString(new UpdateItem("接口更新任务",null,null,null,null,"P2",null,null,null,null,0))))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.title").value("接口更新任务"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data.revision").value(1));
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
        return new CreateItem(request,line,category,selectedType,"真实统一工作项",null,null,version,requirement,parent,null,"P1",null,null,null,null);
    }
}

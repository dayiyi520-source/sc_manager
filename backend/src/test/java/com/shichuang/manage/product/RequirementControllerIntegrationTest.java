package com.shichuang.manage.product;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
class RequirementControllerIntegrationTest extends AbstractApiIntegrationTest {
    @Test
    void createsAndListsRequirementFromUnifiedWorkItemTable() throws Exception {
        String token=loginToken(),title="统一需求-"+System.nanoTime();
        String id=createRequirement(token,title);
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE id_=? AND category_='requirement' AND tenant_id_='local-tenant' AND delete_flag_=0",Integer.class,id));
        mockMvc.perform(get("/api/requirements").header("Authorization","Bearer "+token).param("keyword",title).param("page","1").param("pageSize","10"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.total").value(1)).andExpect(jsonPath("$.data.items[0].id").value(id));
    }

    @Test
    void convertsWorkOrderToFourUnifiedCategories() throws Exception {
        String token=loginToken();
        Map<String,String> targets=Map.of("产品需求","requirement","设计任务","design","研发任务","dev","缺陷管理","bug");
        for(var target:targets.entrySet()){
            String requirementId=createRequirement(token,"统一转任务-"+target.getKey()+"-"+System.nanoTime());
            String response=mockMvc.perform(post("/api/requirements/{id}/work-items",requirementId).header("Authorization","Bearer "+token).contentType("application/json")
                .content("{\"taskType\":\""+target.getKey()+"\",\"assigneeName\":\"张瑞\",\"note\":\"统一工作项\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.syncStatus").value("SUCCESS")).andReturn().getResponse().getContentAsString();
            String workId=objectMapper.readTree(response).path("data").path("id").asText();
            assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE id_=? AND requirement_id_=? AND category_=? AND source_type_='WORK_ORDER' AND tenant_id_='local-tenant'",Integer.class,workId,requirementId,target.getValue()));
        }
    }

    @Test
    void rejectsBusinessTaskConversionAndDuplicateActiveTask() throws Exception {
        String token=loginToken(),requirementId=createRequirement(token,"统一转换校验-"+System.nanoTime());
        for(String invalid:java.util.List.of("数据需求","售前支持","交付任务","运维任务","bug修复","技术问题")) {
            mockMvc.perform(post("/api/requirements/{id}/work-items",requirementId).header("Authorization","Bearer "+token).contentType("application/json").content("{\"taskType\":\""+invalid+"\",\"assigneeName\":\"张瑞\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }
        String body="{\"taskType\":\"研发任务\",\"assigneeName\":\"张瑞\",\"note\":\"首次转换\"}";
        mockMvc.perform(post("/api/requirements/{id}/work-items",requirementId).header("Authorization","Bearer "+token).contentType("application/json").content(body)).andExpect(status().isCreated());
        mockMvc.perform(post("/api/requirements/{id}/work-items",requirementId).header("Authorization","Bearer "+token).contentType("application/json").content(body)).andExpect(status().isBadRequest());
    }

    @Test
    void writesCommentsAndAuditEventsToUnifiedActivityTable() throws Exception {
        String token=loginToken(),id=createRequirement(token,"统一审计-"+System.nanoTime());
        mockMvc.perform(post("/api/requirements/{id}/comments",id).header("Authorization","Bearer "+token).contentType("application/json").content("{\"content\":\"补充验收口径\"}"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/requirements/{id}/events",id).header("Authorization","Bearer "+token).param("eventType","评论"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1));
        assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item_activity WHERE subject_id_=? AND event_type_='评论'",Integer.class,id)>0);
    }

    @Test
    void isolatesCompatibilityAliasesByTenant() throws Exception {
        String token=loginToken();
        String line=jdbc.queryForObject("SELECT product_line_id_ FROM t_product_line_work_item_type WHERE tenant_id_='local-tenant' AND category_='缺陷' AND enabled_=1 AND delete_flag_=0 LIMIT 1",String.class);
        String response=mockMvc.perform(post("/api/bugs").header("Authorization","Bearer "+token).contentType("application/json")
            .content("{\"title\":\"租户隔离缺陷\",\"productLineId\":\""+line+"\",\"assigneeName\":\"张瑞\",\"descriptionHtml\":\"<p>详情</p>\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id=objectMapper.readTree(response).path("data").path("id").asText();
        String other=tokens.issue("user-other","admin","tenant-other","其他租户管理员");
        mockMvc.perform(get("/api/bugs/{id}",id).header("Authorization","Bearer "+other)).andExpect(status().isNotFound());
        assertEquals("<p>详情</p>",jdbc.queryForObject("SELECT description_html_ FROM t_product_work_item WHERE id_=?",String.class,id));
    }

    @Test
    void legacyProductTablesAreRetired() {
        for(String table:new String[]{"t_product_requirement","t_product_requirement_task","t_product_design_task","t_product_dev_task","t_product_bug","t_requirement_work_item","t_product_requirement_event"})
            assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?",Integer.class,table));
    }
}

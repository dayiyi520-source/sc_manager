package com.shichuang.manage.product;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertFalse;

class UnifiedWorkItemControllerIntegrationTest extends AbstractApiIntegrationTest {

    @Test
    void listsRequirementWorkItemsByType() throws Exception {
        String token = loginToken();

        mockMvc.perform(get("/api/work-items")
                .param("type", "requirement")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value("OK"))
            .andExpect(jsonPath("$.data.items").isArray())
            .andExpect(jsonPath("$.data.items[0].type").value("requirement"));
    }

    @Test
    void rejectsUnknownWorkItemType() throws Exception {
        String token = loginToken();

        mockMvc.perform(post("/api/work-items")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"type\":\"unknown\",\"title\":\"非法类型测试\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createsUpdatesAndReadsUnifiedWorkItem() throws Exception {
        String token = loginToken();
        String response = mockMvc.perform(post("/api/work-items")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"type\":\"requirement\",\"title\":\"统一接口测试需求\",\"priority\":\"高\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").isString())
            .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(response).path("data").path("id").asText();
        assertFalse(id.isBlank());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/work-items/{id}", id)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"title\":\"统一接口测试需求-已更新\",\"status\":\"处理中\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/work-items/{id}", id)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title").value("统一接口测试需求-已更新"))
            .andExpect(jsonPath("$.data.status").value("部分完成"));
    }

    @Test
    void rejectsSelfRelation() throws Exception {
        String token = loginToken();
        mockMvc.perform(post("/api/work-items/{id}/relations", "missing-id")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"toId\":\"missing-id\",\"relationType\":\"BLOCKS\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void createsChildrenAndBlocksRequirement() throws Exception {
        String token = loginToken();
        String requirementResponse = mockMvc.perform(post("/api/work-items")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"type\":\"requirement\",\"title\":\"父子关系测试需求\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String requirementId = objectMapper.readTree(requirementResponse).path("data").path("id").asText();

        String childrenResponse = mockMvc.perform(post("/api/work-items/{id}/children", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("[{\"type\":\"design\",\"title\":\"设计子项\"},{\"type\":\"development\",\"title\":\"研发子项\"},{\"type\":\"test\",\"title\":\"测试子项\"}]"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(3))
            .andReturn().getResponse().getContentAsString();
        String childId = objectMapper.readTree(childrenResponse).path("data").get(0).path("id").asText();

        mockMvc.perform(get("/api/work-items/{id}/children", requirementId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(3))
            .andExpect(jsonPath("$.data[0].parentId").value(requirementId));

        String bugResponse = mockMvc.perform(post("/api/work-items")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"type\":\"bug\",\"title\":\"阻塞缺陷\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String bugId = objectMapper.readTree(bugResponse).path("data").path("id").asText();

        mockMvc.perform(post("/api/work-items/{id}/relations", bugId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"toId\":\"" + requirementId + "\",\"relationType\":\"BLOCKS\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/work-items/{id}/relations", requirementId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].relationType").value("BLOCKS"));
    }
}

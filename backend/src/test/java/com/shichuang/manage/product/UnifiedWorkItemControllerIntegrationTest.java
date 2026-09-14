package com.shichuang.manage.product;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
}

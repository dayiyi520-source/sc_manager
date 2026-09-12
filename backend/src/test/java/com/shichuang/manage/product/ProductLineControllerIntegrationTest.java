package com.shichuang.manage.product;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
class ProductLineControllerIntegrationTest extends AbstractApiIntegrationTest {

    @Test
    void persistsProductLineMembersVersionsAndActivities() throws Exception {
        String token = loginToken();
        String name = "产品线集成测试-" + System.nanoTime();
        String response = mockMvc.perform(post("/api/product-lines")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("""
                    {
                      "name":"%s",
                      "code":"PL-IT-%s",
                      "ownerName":"林志豪",
                      "members":[{"name":"林志豪","role":"管理员"}]
                    }
                    """.formatted(name, System.nanoTime())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value("OK"))
            .andReturn().getResponse().getContentAsString();
        String lineId = objectMapper.readTree(response).path("data").path("id").asText();

        assertEquals("该产品线还没有任何简介内容。", jdbc.queryForObject(
            "SELECT description_ FROM t_product_line WHERE id_=?", String.class, lineId));
        assertEquals(1, jdbc.queryForObject(
            "SELECT COUNT(*) FROM t_product_line_member WHERE product_line_id_=? AND member_name_='林志豪' AND role_='管理员' AND delete_flag_=0",
            Integer.class, lineId));

        mockMvc.perform(post("/api/product-lines/{id}/members", lineId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"张瑞\",\"role\":\"产品\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value("OK"));

        mockMvc.perform(post("/api/product-lines/{id}/versions", lineId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("""
                    {
                      "name":"产品线集成测试版本",
                      "code":"V9.9.9",
                      "ownerName":"张瑞",
                      "startDate":"2026-09-12",
                      "endDate":"2026-10-12",
                      "content":"真实写库校验"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value("OK"));

        assertEquals("张瑞", jdbc.queryForObject(
            "SELECT owner_name_ FROM t_product_line_version WHERE product_line_id_=? AND code_='V9.9.9' AND delete_flag_=0",
            String.class, lineId));

        String versionId = jdbc.queryForObject(
            "SELECT id_ FROM t_product_line_version WHERE product_line_id_=? AND code_='V9.9.9' AND delete_flag_=0",
            String.class, lineId);
        String requirementResponse = mockMvc.perform(post("/api/requirements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("""
                    {
                      "title":"待规划工作项-%s",
                      "productLineId":"%s",
                      "productLineName":"%s",
                      "ownerName":"张瑞",
                      "department":"产品中心",
                      "priority":"P1-高优",
                      "dueDate":"2026-10-01"
                    }
                    """.formatted(System.nanoTime(), lineId, name)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String requirementId = objectMapper.readTree(requirementResponse).path("data").path("id").asText();

        mockMvc.perform(post("/api/product-lines/{id}/versions/{versionId}/requirements/{requirementId}", lineId, versionId, requirementId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value("OK"));

        assertEquals(versionId, jdbc.queryForObject(
            "SELECT version_id_ FROM t_product_requirement WHERE id_=? AND tenant_id_='local-tenant'",
            String.class, requirementId));
        assertEquals("产品线集成测试版本", jdbc.queryForObject(
            "SELECT version_name_ FROM t_product_requirement WHERE id_=? AND tenant_id_='local-tenant'",
            String.class, requirementId));
        assertTrue(jdbc.queryForObject(
            "SELECT COUNT(*) FROM t_product_line_activity WHERE product_line_id_=? AND action_ IN ('创建产品线','添加成员角色','创建版本','规划工作项')",
            Integer.class, lineId) >= 5);
    }
}

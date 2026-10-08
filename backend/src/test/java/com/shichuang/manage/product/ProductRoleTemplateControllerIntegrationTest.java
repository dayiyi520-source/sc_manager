package com.shichuang.manage.product;

import com.fasterxml.jackson.databind.JsonNode;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
class ProductRoleTemplateControllerIntegrationTest extends AbstractApiIntegrationTest {

    @Test
    void adminCanCreateListUpdateAndDeleteRole() throws Exception {
        String authorization = "Bearer " + loginToken();
        String name = "项目协调-" + System.nanoTime();
        JsonNode created = data(mockMvc.perform(post("/api/research-template/roles")
                .header("Authorization", authorization)
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(java.util.Map.of("name", name, "responsibility", "协调跨团队计划", "sort", 999))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.sort").value(999))
            .andExpect(jsonPath("$.data.revision").value(0))
            .andReturn().getResponse().getContentAsString());

        String id = created.path("id").asText();
        mockMvc.perform(get("/api/research-template/roles").header("Authorization", authorization))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.id == '%s')].name".formatted(id)).value(name));

        JsonNode updated = data(mockMvc.perform(put("/api/research-template/roles/{id}", id)
                .header("Authorization", authorization)
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(java.util.Map.of("name", name, "responsibility", "协调计划并跟踪交付", "sort", 0, "revision", 0))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sort").value(0))
            .andExpect(jsonPath("$.data.revision").value(1))
            .andReturn().getResponse().getContentAsString());

        assertEquals(0, jdbc.queryForObject("SELECT sort_ FROM t_product_role_template WHERE id_=?", Integer.class, id));
        mockMvc.perform(get("/api/research-template/roles").header("Authorization", authorization))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.id == '%s')].sort".formatted(id)).value(0));

        for (Object sort : new Object[] {-1, 1000, 1.5, "1"}) {
            mockMvc.perform(put("/api/research-template/roles/{id}", id)
                    .header("Authorization", authorization).contentType("application/json")
                    .content(objectMapper.writeValueAsString(java.util.Map.of("name", name, "responsibility", "排序校验", "sort", sort, "revision", 1))))
                .andExpect(status().isBadRequest());
        }

        mockMvc.perform(delete("/api/research-template/roles/{id}", id)
                .param("revision", updated.path("revision").asText())
                .header("Authorization", authorization))
            .andExpect(status().isOk());
        assertEquals(0, jdbc.queryForObject(
            "SELECT COUNT(*) FROM t_product_role_template WHERE id_=? AND delete_flag_=0", Integer.class, id));
    }

    @Test
    void rejectsInvalidSortAndListsByAscendingSort() throws Exception {
        String authorization = "Bearer " + loginToken();
        for (Object sort : new Object[] {-1, 1000, 1.5, "1"}) {
            mockMvc.perform(post("/api/research-template/roles")
                    .header("Authorization", authorization).contentType("application/json")
                    .content(objectMapper.writeValueAsString(java.util.Map.of("name", "非法排序", "responsibility", "校验", "sort", sort))))
                .andExpect(status().isBadRequest());
        }
        String suffix = String.valueOf(System.nanoTime());
        for (int sort : new int[] {9, 0}) {
            mockMvc.perform(post("/api/research-template/roles")
                    .header("Authorization", authorization).contentType("application/json")
                    .content(objectMapper.writeValueAsString(java.util.Map.of("name", suffix + sort, "responsibility", "排序", "sort", sort))))
                .andExpect(status().isCreated());
        }
        JsonNode roles = data(mockMvc.perform(get("/api/research-template/roles")
                .header("Authorization", authorization)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString());
        int first = -1;
        int second = -1;
        for (int index = 0; index < roles.size(); index++) {
            if ((suffix + 0).equals(roles.get(index).path("name").asText())) first = index;
            if ((suffix + 9).equals(roles.get(index).path("name").asText())) second = index;
        }
        org.junit.jupiter.api.Assertions.assertTrue(first >= 0 && second > first);
    }

    @Test
    void rejectsUnauthorizedDuplicateAndStaleWrites() throws Exception {
        String admin = "Bearer " + loginToken();
        String member = "Bearer " + tokens.issue("role-reader", "product_manager", "local-tenant", "角色只读用户");

        mockMvc.perform(get("/api/research-template/roles").header("Authorization", member))
            .andExpect(status().isOk());
        mockMvc.perform(post("/api/research-template/roles")
                .header("Authorization", member).contentType("application/json")
                .content(objectMapper.writeValueAsString(role("无权角色", "不应创建"))))
            .andExpect(status().isForbidden());

        String name = "唯一角色-" + System.nanoTime();
        JsonNode created = data(mockMvc.perform(post("/api/research-template/roles")
                .header("Authorization", admin).contentType("application/json")
                .content(objectMapper.writeValueAsString(role(name, "唯一职责"))))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        mockMvc.perform(post("/api/research-template/roles")
                .header("Authorization", admin).contentType("application/json")
                .content(objectMapper.writeValueAsString(role(name, "重复职责"))))
            .andExpect(status().isBadRequest());

        String id = created.path("id").asText();
        mockMvc.perform(put("/api/research-template/roles/{id}", id)
                .header("Authorization", admin).contentType("application/json")
                .content(objectMapper.writeValueAsString(role(name, "第一次更新", 0))))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/research-template/roles/{id}", id)
                .header("Authorization", admin).contentType("application/json")
                .content(objectMapper.writeValueAsString(role(name, "过期更新", 0))))
            .andExpect(status().isConflict());
        mockMvc.perform(delete("/api/research-template/roles/{id}", id)
                .param("revision", "0").header("Authorization", admin))
            .andExpect(status().isConflict());
    }

    @Test
    void customRoleCanBeAssignedAndCannotBeDeletedWhileInUse() throws Exception {
        String authorization = "Bearer " + loginToken();
        String roleName = "交付协调-" + System.nanoTime();
        JsonNode role = data(mockMvc.perform(post("/api/research-template/roles")
                .header("Authorization", authorization).contentType("application/json")
                .content(objectMapper.writeValueAsString(role(roleName, "维护交付节奏"))))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());

        JsonNode line = data(mockMvc.perform(post("/api/product-lines")
                .header("Authorization", authorization).contentType("application/json")
                .content("{\"name\":\"角色联动产品\",\"code\":\"ROLE-" + System.nanoTime() + "\",\"ownerUserId\":\"user-admin\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        mockMvc.perform(post("/api/product-lines/{id}/members", line.path("id").asText())
                .header("Authorization", authorization).contentType("application/json")
                .content(objectMapper.writeValueAsString(java.util.Map.of("userId", "user-tech", "role", roleName))))
            .andExpect(status().isOk());

        assertEquals(1, jdbc.queryForObject(
            "SELECT COUNT(*) FROM t_product_line_member WHERE product_line_id_=? AND role_=? AND delete_flag_=0",
            Integer.class, line.path("id").asText(), roleName));
        mockMvc.perform(delete("/api/research-template/roles/{id}", role.path("id").asText())
                .param("revision", role.path("revision").asText())
                .header("Authorization", authorization))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value("该角色仍有产品成员使用，请先调整成员角色"));
        mockMvc.perform(put("/api/research-template/roles/{id}", role.path("id").asText())
                .header("Authorization", authorization).contentType("application/json")
                .content(objectMapper.writeValueAsString(role(roleName + "新", "维护交付节奏", role.path("revision").asInt()))))
            .andExpect(status().isConflict());
    }

    private JsonNode data(String response) throws Exception {
        return objectMapper.readTree(response).path("data");
    }

    private java.util.Map<String, Object> role(String name, String responsibility) {
        return role(name, responsibility, null);
    }

    private java.util.Map<String, Object> role(String name, String responsibility, Integer revision) {
        java.util.Map<String, Object> input = new java.util.LinkedHashMap<>();
        input.put("name", name);
        input.put("responsibility", responsibility);
        if (revision != null) input.put("revision", revision);
        return input;
    }
}

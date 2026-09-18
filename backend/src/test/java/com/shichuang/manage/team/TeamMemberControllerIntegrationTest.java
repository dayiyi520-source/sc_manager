package com.shichuang.manage.team;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
class TeamMemberControllerIntegrationTest extends AbstractApiIntegrationTest {
    @Test
    void administratorCanCreateEditAndDisableAnAccountlessEmployee() throws Exception {
        String authorization = "Bearer " + loginToken();
        String response = mockMvc.perform(post("/api/team-members")
                .header("Authorization", authorization).contentType("application/json")
                .content("""
                    {"name":"目录员工","department":"交互设计部","jobTitle":"交互设计师","phone":"13800001111","email":"designer@example.com"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.loginEnabled").value(false))
            .andExpect(jsonPath("$.data.version").value(0))
            .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(response).path("data").path("id").asText();

        assertNull(jdbc.queryForObject("SELECT username_ FROM t_sys_user WHERE id_=?", String.class, id));
        assertNull(jdbc.queryForObject("SELECT password_hash_ FROM t_sys_user WHERE id_=?", String.class, id));

        mockMvc.perform(put("/api/team-members/{id}", id)
                .header("Authorization", authorization).contentType("application/json")
                .content("""
                    {"name":"目录员工甲","department":"产品规划部","jobTitle":"产品设计师","phone":"","email":"","version":0}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("目录员工甲"))
            .andExpect(jsonPath("$.data.version").value(1));

        mockMvc.perform(patch("/api/team-members/{id}/status", id)
                .header("Authorization", authorization).contentType("application/json")
                .content("{\"status\":\"disabled\",\"version\":1}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("disabled"));
    }

    @Test
    void validatesPermissionDepartmentConcurrencyAndAdministratorProtection() throws Exception {
        String admin = "Bearer " + loginToken();
        String nonAdmin = "Bearer " + tokens.issue("employee-reader", "product_manager", "local-tenant", "只读人员");

        mockMvc.perform(get("/api/team-members").header("Authorization", nonAdmin)).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/team-members").header("Authorization", admin).contentType("application/json")
                .content("{\"name\":\"错误部门员工\",\"department\":\"不存在部门\",\"jobTitle\":\"员工\"}"))
            .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/team-members/user-admin/status").header("Authorization", admin).contentType("application/json")
                .content("{\"status\":\"disabled\",\"version\":0}"))
            .andExpect(status().isBadRequest());

        String response = mockMvc.perform(post("/api/team-members").header("Authorization", admin).contentType("application/json")
                .content("{\"name\":\"并发员工\",\"department\":\"数据应用部\",\"jobTitle\":\"数据工程师\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(response).path("data").path("id").asText();
        mockMvc.perform(put("/api/team-members/{id}", id).header("Authorization", admin).contentType("application/json")
                .content("{\"name\":\"并发员工\",\"department\":\"数据应用部\",\"jobTitle\":\"高级数据工程师\",\"version\":9}"))
            .andExpect(status().isConflict());
    }

    @Test
    void exposesOnlyEnabledTenantEmployeesAsProductCandidatesAndOnlyAdminAsDevAccount() throws Exception {
        String authorization = "Bearer " + loginToken();
        String suffix = String.valueOf(System.nanoTime());
        jdbc.update("INSERT INTO t_sys_user(id_,tenant_id_,username_,name_,avatar_,department_,role_,role_title_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,NULL,?,'','软件研发部','employee','工程师','disabled','user-admin','user-admin',NOW(),NOW())",
            "disabled-" + suffix, "local-tenant", "停用员工-" + suffix);

        mockMvc.perform(get("/api/team-members/options").header("Authorization", authorization))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.name == '林志豪')]").exists())
            .andExpect(jsonPath("$.data[?(@.name == '停用员工-" + suffix + "')]").doesNotExist());

        String accounts = mockMvc.perform(get("/api/auth/dev-accounts"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(1, objectMapper.readTree(accounts).path("data").size());
        assertEquals("admin", objectMapper.readTree(accounts).path("data").get(0).path("username").asText());
    }
}

package com.shichuang.manage.product;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
class ProductLineControllerIntegrationTest extends AbstractApiIntegrationTest {

    @Test
    void filtersProductLineListByVisibilityCreatorAndMembership() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        String outsider = "user-outsider-" + suffix;
        String member = "user-member-" + suffix;
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,description_,visibility_,status_,current_version_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?, ?,?,?,NOW(),NOW())",
            "line-public-" + suffix,"local-tenant","PUBLIC-" + suffix,"公开产品线","","公开","启用中","1.0.0","user-admin","user-admin");
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,description_,visibility_,status_,current_version_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?, ?,?,?,NOW(),NOW())",
            "line-member-" + suffix,"local-tenant","MEMBER-" + suffix,"成员私密产品线","","私密","启用中","1.0.0","user-admin","user-admin");
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,description_,visibility_,status_,current_version_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?, ?,?,?,NOW(),NOW())",
            "line-hidden-" + suffix,"local-tenant","HIDDEN-" + suffix,"不可见私密产品线","","私密","启用中","1.0.0","user-admin","user-admin");
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,description_,visibility_,status_,current_version_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?, ?,?,?,NOW(),NOW())",
            "line-owned-" + suffix,"local-tenant","OWNED-" + suffix,"本人创建产品线","","仅创建者可见","启用中","1.0.0",outsider,outsider);
        jdbc.update("INSERT INTO t_product_line_member(id_,tenant_id_,product_line_id_,user_id_,member_name_,role_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,NOW(),NOW())",
            "member-" + suffix,"local-tenant","line-member-" + suffix,member,"成员用户","参与人","user-admin","user-admin");

        String memberResponse = mockMvc.perform(get("/api/product-lines")
                .header("Authorization", "Bearer " + tokens.issue(member,"product_manager","local-tenant","成员用户")))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String memberJson = objectMapper.readTree(memberResponse).path("data").toString();
        assertTrue(memberJson.contains("PUBLIC-" + suffix));
        assertTrue(memberJson.contains("MEMBER-" + suffix));
        assertFalse(memberJson.contains("HIDDEN-" + suffix));
        assertFalse(memberJson.contains("OWNED-" + suffix));

        String ownerResponse = mockMvc.perform(get("/api/product-lines")
                .header("Authorization", "Bearer " + tokens.issue(outsider,"product_manager","local-tenant","创建人")))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertTrue(objectMapper.readTree(ownerResponse).path("data").toString().contains("OWNED-" + suffix));

        String adminResponse = mockMvc.perform(get("/api/product-lines")
                .header("Authorization", "Bearer " + loginToken()))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertTrue(objectMapper.readTree(adminResponse).path("data").toString().contains("HIDDEN-" + suffix));
    }

    @Test
    void rejectsDuplicateActiveProductLineMember() throws Exception {
        String authorization = "Bearer " + loginToken();
        String response = mockMvc.perform(post("/api/product-lines")
                .header("Authorization", authorization).contentType("application/json")
                .content("{\"name\":\"成员唯一测试\",\"code\":\"MEMBER-UNIQUE-" + System.nanoTime() + "\",\"ownerName\":\"林志豪\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String lineId = objectMapper.readTree(response).path("data").path("id").asText();
        String body = "{\"name\":\"张瑞\",\"role\":\"产品\"}";
        mockMvc.perform(post("/api/product-lines/{id}/members", lineId).header("Authorization", authorization).contentType("application/json").content(body))
            .andExpect(status().isOk());
        mockMvc.perform(post("/api/product-lines/{id}/members", lineId).header("Authorization", authorization).contentType("application/json").content(body))
            .andExpect(status().isConflict());
    }

    @Test
    void acceptsDeliverySupervisorAsProductLineMemberRole() throws Exception {
        String authorization = "Bearer " + loginToken();
        String response = mockMvc.perform(post("/api/product-lines")
                .header("Authorization", authorization).contentType("application/json")
                .content("{\"name\":\"交付角色测试\",\"code\":\"DELIVERY-" + System.nanoTime() + "\",\"ownerName\":\"林志豪\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String lineId = objectMapper.readTree(response).path("data").path("id").asText();

        mockMvc.perform(post("/api/product-lines/{id}/members", lineId)
                .header("Authorization", authorization).contentType("application/json")
                .content("{\"name\":\"张瑞\",\"role\":\"交付主管\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.code").value("OK"));

        assertEquals(1, jdbc.queryForObject(
            "SELECT COUNT(*) FROM t_product_line_member WHERE product_line_id_=? AND member_name_='张瑞' AND role_='交付主管' AND delete_flag_=0",
            Integer.class, lineId));
    }

    @Test
    void versionDatesCanBeEmptyUpdatedAndClearedWithoutLosingTheVersion() throws Exception {
        String token = loginToken();
        String authorization = "Bearer " + token;
        String lineResponse = mockMvc.perform(post("/api/product-lines")
                .header("Authorization", authorization).contentType("application/json")
                .content("{\"name\":\"日期回归测试\",\"code\":\"DATE-" + System.nanoTime() + "\",\"ownerName\":\"张瑞\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String lineId = objectMapper.readTree(lineResponse).path("data").path("id").asText();
        mockMvc.perform(post("/api/product-lines/{id}/versions", lineId)
                .header("Authorization", authorization).contentType("application/json")
                .content("{\"name\":\"空日期版本\",\"code\":\"DATE-1\",\"startDate\":\"\",\"endDate\":\"\"}"))
            .andExpect(status().isOk());
        String versionId = jdbc.queryForObject("SELECT id_ FROM t_product_line_version WHERE product_line_id_=?", String.class, lineId);
        assertNull(jdbc.queryForObject("SELECT start_date_ FROM t_product_line_version WHERE id_=?", String.class, versionId));
        String path = "/api/product-lines/" + lineId + "/versions/" + versionId;
        mockMvc.perform(put(path).header("Authorization", authorization).contentType("application/json")
                .content("{\"startDate\":\"2026-09-14\",\"endDate\":\"2026-09-30\"}"))
            .andExpect(status().isOk());
        mockMvc.perform(put(path).header("Authorization", authorization).contentType("application/json")
                .content("{\"name\":\"修改标题保留日期\"}"))
            .andExpect(status().isOk());
        assertEquals("2026-09-14", jdbc.queryForObject("SELECT start_date_ FROM t_product_line_version WHERE id_=?", String.class, versionId));
        mockMvc.perform(put(path).header("Authorization", authorization).contentType("application/json")
                .content("{\"endDate\":\"2026-09-01\"}"))
            .andExpect(status().isBadRequest());
        mockMvc.perform(put(path).header("Authorization", authorization).contentType("application/json")
                .content("{\"startDate\":null,\"endDate\":\"\"}"))
            .andExpect(status().isOk());
        assertNull(jdbc.queryForObject("SELECT end_date_ FROM t_product_line_version WHERE id_=?", String.class, versionId));
        mockMvc.perform(get("/api/product-lines/{id}", lineId).header("Authorization", authorization))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.versions[0].id").value(versionId));
    }

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
        String requirementId = java.util.UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO t_product_work_item(id_,tenant_id_,product_line_id_,category_,task_type_id_,code_,title_,workflow_id_,status_key_,status_name_,status_group_,status_color_,successful_,priority_,estimated_hours_,actual_hours_,source_type_,request_id_,request_hash_,create_by_,update_by_,create_time_,update_time_)
            SELECT ?,tenant_id_,?,'requirement',task_type_id_,CONCAT('WI-PLAN-',UNIX_TIMESTAMP()),?,workflow_id_,status_key_,status_name_,status_group_,status_color_,successful_,'P1',0,0,'MANUAL',?,SHA2(?,256),'user-admin','user-admin',NOW(6),NOW(6)
            FROM t_product_work_item WHERE tenant_id_='local-tenant' AND category_='requirement' AND delete_flag_=0 LIMIT 1
            """, requirementId, lineId, "待规划工作项-" + System.nanoTime(), "plan-" + requirementId, "plan-" + requirementId);

        mockMvc.perform(post("/api/product-lines/{id}/versions/{versionId}/requirements/{requirementId}", lineId, versionId, requirementId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value("OK"));

        assertEquals(versionId, jdbc.queryForObject(
            "SELECT version_id_ FROM t_product_work_item WHERE id_=? AND tenant_id_='local-tenant'",
            String.class, requirementId));
        assertEquals("产品线集成测试版本", jdbc.queryForObject(
            "SELECT v.name_ FROM t_product_work_item w JOIN t_product_line_version v ON v.id_=w.version_id_ AND v.tenant_id_=w.tenant_id_ WHERE w.id_=? AND w.tenant_id_='local-tenant'",
            String.class, requirementId));
        assertTrue(jdbc.queryForObject(
            "SELECT COUNT(*) FROM t_product_line_activity WHERE product_line_id_=? AND action_ IN ('创建产品线','添加成员角色','创建版本','规划工作项')",
            Integer.class, lineId) >= 5);
    }
}

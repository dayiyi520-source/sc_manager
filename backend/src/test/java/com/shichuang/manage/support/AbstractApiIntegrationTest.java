package com.shichuang.manage.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.TokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public abstract class AbstractApiIntegrationTest {
    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected TokenService tokens;

    protected String loginToken() throws Exception {
        String response = mockMvc.perform(post("/api/auth/dev-login")
                .contentType("application/json")
                .content("{\"username\":\"admin\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        JsonNode token = objectMapper.readTree(response).path("data").path("token");
        return token.asText();
    }

    protected String createRequirement(String token, String title) throws Exception {
        String productLineId = jdbc.queryForObject("SELECT product_line_id_ FROM t_product_line_work_item_type WHERE tenant_id_='local-tenant' AND category_='需求' AND enabled_=1 AND delete_flag_=0 ORDER BY create_time_ LIMIT 1", String.class);
        String productLineName = jdbc.queryForObject("SELECT name_ FROM t_product_line WHERE id_=? AND tenant_id_='local-tenant'", String.class, productLineId);
        String body = """
            {"title":"%s","productLineId":"%s","productLineName":"%s","department":"产品中心","customerId":"c-1","customerName":"国家电网华东分部数智调度中心","priority":"P1-高优","description":"集成测试描述","descriptionHtml":"<p>集成测试描述</p>","dueDate":"2026-12-31"}
            """.formatted(title, productLineId, productLineName);
        String response = mockMvc.perform(post("/api/requirements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(body))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).path("data").path("id").asText();
    }
}

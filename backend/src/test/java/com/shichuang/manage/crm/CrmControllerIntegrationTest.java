package com.shichuang.manage.crm;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
class CrmControllerIntegrationTest extends AbstractApiIntegrationTest {

    @Test
    void returnsUnifiedCustomerJourneyAcrossCrmAndWorkOrders() throws Exception {
        String token = loginToken();
        String presalesRequirementId = createRequirement(token, "客户历程售前关联-" + System.nanoTime());
        mockMvc.perform(post("/api/requirements/{id}/work-items", presalesRequirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"售前支持\",\"assigneeName\":\"陈雅婷\"}"))
            .andExpect(status().isCreated());
        String deliveryRequirementId = createRequirement(token, "客户历程交付关联-" + System.nanoTime());
        mockMvc.perform(post("/api/requirements/{id}/work-items", deliveryRequirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"交付支持\",\"assigneeName\":\"王浩然\"}"))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/crm/journey")
                .param("customerId", "c-1")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total", greaterThanOrEqualTo(7)))
            .andExpect(jsonPath("$.data.items[*].eventType", hasItem("客户建立")))
            .andExpect(jsonPath("$.data.items[*].eventType", hasItem("售前工单")))
            .andExpect(jsonPath("$.data.items[*].eventType", hasItem("交付工单")))
            .andExpect(jsonPath("$.data.items[*].customerId", hasItem("c-1")));

        String otherTenantToken = tokens.issue("user-journey-other", "admin", "tenant-journey-b", "其他租户管理员");
        mockMvc.perform(get("/api/crm/journey")
                .param("customerId", "c-1")
                .header("Authorization", "Bearer " + otherTenantToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void listsAndLoadsCustomerAndOpportunityDetails() throws Exception {
        String token = loginToken();

        mockMvc.perform(get("/api/crm/customers")
                .param("keyword", "国家电网")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(1))
            .andExpect(jsonPath("$.data.items[0].id").value("c-1"));

        mockMvc.perform(get("/api/crm/customers/{id}", "c-1")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("国家电网华东分部数智调度中心"));

        mockMvc.perform(get("/api/crm/opportunities")
                .param("keyword", "国家电网")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(1))
            .andExpect(jsonPath("$.data.items[0].customerId").value("c-1"));

        mockMvc.perform(get("/api/crm/opportunities/{id}", "opp-1")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.customerName").value("国家电网华东分部数智调度中心"));
    }

    @Test
    void createsCustomerOpportunityAndFollowUpWithAttachments() throws Exception {
        String token = loginToken();
        String suffix = String.valueOf(System.nanoTime());
        String customerBody = """
            {"code":"IT-CUST-%s","name":"集成测试客户-%s","type":"高校","level":"A级-重点","tags":["测试标签"],"contactName":"测试联系人"}
            """.formatted(suffix, suffix);
        String customerResponse = mockMvc.perform(post("/api/crm/customers")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(customerBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value("OK"))
            .andReturn().getResponse().getContentAsString();
        String customerId = objectMapper.readTree(customerResponse).path("data").path("id").asText();

        String leadResponse = mockMvc.perform(post("/api/crm/leads")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"集成测试线索\",\"customerId\":\"" + customerId + "\",\"schoolContact\":\"测试联系人\",\"products\":[\"协同平台\"]}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String leadId = objectMapper.readTree(leadResponse).path("data").path("id").asText();

        mockMvc.perform(put("/api/crm/leads/{id}", leadId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"status\":\"跟进中\",\"version\":0}"))
            .andExpect(status().isOk());

        String opportunityResponse = mockMvc.perform(post("/api/crm/opportunities")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"集成测试商机\",\"customerId\":\"" + customerId + "\",\"leadId\":\"" + leadId + "\",\"amount\":120000}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value("OK"))
            .andReturn().getResponse().getContentAsString();
        String opportunityId = objectMapper.readTree(opportunityResponse).path("data").path("id").asText();

        mockMvc.perform(post("/api/crm/follow-ups")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"customerId\":\"" + customerId + "\",\"opportunityId\":\"" + opportunityId + "\",\"content\":\"完成方案沟通\",\"attachments\":[\"沟通纪要.pdf\"]}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").isNotEmpty());

        mockMvc.perform(get("/api/crm/follow-ups")
                .param("customerId", customerId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(1))
            .andExpect(jsonPath("$.data.items[0].customerId").value(customerId))
            .andExpect(jsonPath("$.data.items[0].attachments").isNotEmpty());
    }

    @Test
    void rejectsUnknownCustomerReferencesAndExposesRequirementWorkItemRelations() throws Exception {
        String token = loginToken();

        mockMvc.perform(post("/api/crm/opportunities")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"无效客户商机\",\"customerId\":\"missing\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/crm/follow-ups")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"customerId\":\"missing\",\"content\":\"无效客户跟进\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        String requirementId = createRequirement(token, "集成测试工单关联-" + System.nanoTime());
        mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"售前支持\",\"assigneeName\":\"陈雅婷\",\"note\":\"售前关联\"}"))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/requirements/work-items")
                .param("taskType", "售前支持")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].requirementId").value(requirementId))
            .andExpect(jsonPath("$.data[0].taskType").value("售前支持"));

        String deliveryRequirementId = createRequirement(token, "集成测试交付关联-" + System.nanoTime());
        mockMvc.perform(post("/api/requirements/{id}/work-items", deliveryRequirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"交付支持\",\"assigneeName\":\"王浩然\",\"note\":\"交付关联\"}"))
            .andExpect(status().isCreated());
        Number deliveryCount = jdbc.queryForObject("SELECT COUNT(*) FROM t_project_delivery_task WHERE requirement_id_=? AND tenant_id_='local-tenant' AND delete_flag_=0", Number.class, deliveryRequirementId);
        assertTrue(deliveryCount != null && deliveryCount.intValue() == 1);
    }

    @Test
    void enforcesReadOnlyRoleAndNormalizesCustomerAndOpportunityPaging() throws Exception {
        String readOnlyToken = tokens.issue("user-sales", "sales");

        mockMvc.perform(get("/api/crm/customers")
                .param("page", "0")
                .param("pageSize", "1000")
                .header("Authorization", "Bearer " + readOnlyToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.page").value(1))
            .andExpect(jsonPath("$.data.pageSize").value(100));

        mockMvc.perform(get("/api/crm/opportunities")
                .param("page", "-1")
                .param("pageSize", "0")
                .header("Authorization", "Bearer " + readOnlyToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.page").value(1))
            .andExpect(jsonPath("$.data.pageSize").value(1));

        mockMvc.perform(post("/api/crm/customers")
                .header("Authorization", "Bearer " + readOnlyToken)
                .contentType("application/json")
                .content("{\"name\":\"只读角色不应创建\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void rejectsStaleCustomerAndOpportunityUpdatesAndInvalidFollowUpInput() throws Exception {
        String token = loginToken();
        String suffix = String.valueOf(System.nanoTime());
        String customerResponse = mockMvc.perform(post("/api/crm/customers")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"code\":\"IT-CONFLICT-" + suffix + "\",\"name\":\"并发客户-" + suffix + "\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String customerId = objectMapper.readTree(customerResponse).path("data").path("id").asText();

        String leadResponse = mockMvc.perform(post("/api/crm/leads")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"并发线索\",\"customerId\":\"" + customerId + "\",\"schoolContact\":\"测试联系人\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String leadId = objectMapper.readTree(leadResponse).path("data").path("id").asText();

        mockMvc.perform(put("/api/crm/leads/{id}", leadId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"status\":\"跟进中\",\"version\":0}"))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/crm/customers/{id}", customerId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"并发客户-首次更新\",\"version\":0}"))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/crm/customers/{id}", customerId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"并发客户-过期更新\",\"version\":0}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("REQUEST_REJECTED"));

        String opportunityResponse = mockMvc.perform(post("/api/crm/opportunities")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"并发商机\",\"customerId\":\"" + customerId + "\",\"leadId\":\"" + leadId + "\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String opportunityId = objectMapper.readTree(opportunityResponse).path("data").path("id").asText();

        mockMvc.perform(put("/api/crm/opportunities/{id}", opportunityId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"并发商机-首次更新\",\"version\":0}"))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/crm/opportunities/{id}", opportunityId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"并发商机-过期更新\",\"version\":0}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("REQUEST_REJECTED"));

        mockMvc.perform(post("/api/crm/follow-ups")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"customerId\":\"" + customerId + "\",\"content\":\"\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(post("/api/crm/follow-ups")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"customerId\":\"" + customerId + "\",\"content\":\"附件校验\",\"attachments\":\"invalid\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void returnsNotFoundForMissingCustomerAndOpportunityDetails() throws Exception {
        String token = loginToken();

        mockMvc.perform(get("/api/crm/customers/{id}", "missing-customer")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("REQUEST_REJECTED"));

        mockMvc.perform(get("/api/crm/opportunities/{id}", "missing-opportunity")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("REQUEST_REJECTED"));

        mockMvc.perform(post("/api/crm/opportunities/{id}/stage-transitions", "opp-1")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"stage\":\"\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void advancesOpportunityThroughBiddingEngagementAndProjectIdempotently() throws Exception {
        String token = loginToken();
        Integer opportunityVersion = jdbc.queryForObject("SELECT version_ FROM t_crm_opportunity WHERE id_=? AND tenant_id_=?", Integer.class, "opp-1", "local-tenant");
        mockMvc.perform(post("/api/crm/opportunities/{id}/stage-transitions", "opp-1")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"stage\":\"\\u62db\\u6295\\u6807\",\"version\":" + opportunityVersion + "}"))
            .andExpect(status().isOk());
        mockMvc.perform(post("/api/crm/opportunities/{id}/stage-transitions", "opp-1")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"stage\":\"\\u62db\\u6295\\u6807\"}"))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/crm/opportunities/{id}/bidding", "opp-1")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"result\":\"\\u4e2d\\u6807\"}"))
            .andExpect(status().isOk());
        String biddingId = jdbc.queryForObject("SELECT id_ FROM t_crm_bidding WHERE opportunity_id_=? AND tenant_id_=?", String.class, "opp-1", "local-tenant");
        String engagementId = jdbc.queryForObject("SELECT id_ FROM t_crm_winning_engagement WHERE bidding_id_=? AND tenant_id_=?", String.class, biddingId, "local-tenant");
        mockMvc.perform(put("/api/crm/biddings/{id}/engagement", engagementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"status\":\"\\u5df2\\u7b7e\\u7ea6\"}"))
            .andExpect(status().isOk());
        mockMvc.perform(put("/api/crm/biddings/{id}/engagement", engagementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"status\":\"\\u5df2\\u7b7e\\u7ea6\"}"))
            .andExpect(status().isOk());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM t_project WHERE engagement_id_=? AND tenant_id_=? AND delete_flag_=0", Integer.class, engagementId, "local-tenant"));
    }

}

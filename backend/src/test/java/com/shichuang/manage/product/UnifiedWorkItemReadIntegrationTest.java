package com.shichuang.manage.product;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/** Read-only regression against the existing local schema. Never runs migrations or seeds. */
@TestPropertySource(properties = "spring.flyway.enabled=false")
class UnifiedWorkItemReadIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired UnifiedWorkItemMapper workItems;

    @Test void unionQueryMatchesRealSchemaAndCannotLeakAcrossTenants() {
        var lines = jdbc.queryForList("SELECT tenant_id_,id_ FROM t_product_line WHERE delete_flag_=0 LIMIT 1");
        assertFalse(lines.isEmpty(), "本地验收需要至少一个已有产品线");
        String tenant = lines.get(0).get("tenant_id_").toString();
        String line = lines.get(0).get("id_").toString();
        var rows = workItems.byProductLine(tenant, line);
        assertTrue(rows.stream().allMatch(row -> line.equals(row.get("productLineId"))));
        assertEquals(rows.size(), rows.stream().map(row -> row.get("category") + ":" + row.get("id")).distinct().count());
        assertTrue(workItems.byProductLine("unified-read-missing-tenant", line).isEmpty());
    }

    @Test void unifiedEndpointRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/work-items").param("productLineId", "pl-1"))
            .andExpect(status().isUnauthorized());
    }

    @Test void authenticatedReadSerializesCoverageAndEnforcesRoleAndTenant() throws Exception {
        var row = jdbc.queryForList("SELECT tenant_id_,id_ FROM t_product_line WHERE delete_flag_=0 LIMIT 1").get(0);
        String line = row.get("id_").toString();
        String tenant = row.get("tenant_id_").toString();
        mockMvc.perform(get("/api/work-items").param("productLineId", line)
                .header("Authorization", "Bearer " + tokens.issue("read-test", "admin", tenant)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.page.items").isArray())
            .andExpect(jsonPath("$.data.limitations[0]").value("历史工作项尚未绑定分类流程版本"));
        mockMvc.perform(get("/api/work-items").param("productLineId", line)
                .header("Authorization", "Bearer " + tokens.issue("read-test", "sales", tenant)))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/work-items").param("productLineId", line)
                .header("Authorization", "Bearer " + tokens.issue("read-test", "admin", "missing-tenant")))
            .andExpect(status().isNotFound());
        assertFalse(workItems.canRead("missing-tenant", line, "read-test"));
    }
}

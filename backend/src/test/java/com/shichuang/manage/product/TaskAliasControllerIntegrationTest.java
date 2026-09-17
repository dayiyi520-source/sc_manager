package com.shichuang.manage.product;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
class TaskAliasControllerIntegrationTest extends AbstractApiIntegrationTest {

    @Test
    void pagesAndFiltersEveryTaskListWithAuthoritativeTotals() throws Exception {
        String authorization = "Bearer " + loginToken();
        String marker = "分页筛选-" + System.nanoTime();
        String line = configuredLine();
        List<TaskEndpoint> endpoints = List.of(
            new TaskEndpoint("/api/bugs", "\"assigneeName\":\"张瑞\",\"expectedGoal\":\"修复完成\"", ""),
            new TaskEndpoint("/api/dev-tasks", "\"developer\":\"张瑞\",\"expectedGoal\":\"开发完成\"", ""),
            new TaskEndpoint("/api/design-tasks", "\"ownerName\":\"张瑞\"", ""),
            new TaskEndpoint("/api/presales-tasks", "\"ownerName\":\"张瑞\"", "待处理"),
            new TaskEndpoint("/api/delivery-tasks", "\"ownerName\":\"张瑞\"", "待处理"),
            new TaskEndpoint("/api/ops-tasks", "\"ownerName\":\"张瑞\"", "待处理")
        );

        for (TaskEndpoint endpoint : endpoints) {
            String title = marker + endpoint.path();
            mockMvc.perform(post(endpoint.path())
                    .header("Authorization", authorization)
                    .contentType("application/json")
                    .content("{\"title\":\"" + title + "\",\"description\":\"分页集成测试\",\"productLineId\":\"" + line + "\",\"productLineName\":\"师创智联协同OS\",\"status\":\"" + endpoint.status() + "\"," + endpoint.ownerJson() + "}"))
                .andExpect(status().isCreated());

            mockMvc.perform(get(endpoint.path())
                    .header("Authorization", authorization)
                    .param("page", "1")
                    .param("pageSize", "1")
                    .param("keyword", marker)
                    .param("ownerName", "张瑞"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.pageSize").value(1))
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].title").value(title));
        }
    }

    @Test
    void capsPageSizeIsolatesTenantsAndRejectsReadOnlyWrites() throws Exception {
        String adminAuthorization = "Bearer " + loginToken();
        String marker = "租户边界-" + System.nanoTime();
        String line = configuredLine();
        mockMvc.perform(post("/api/bugs")
                .header("Authorization", adminAuthorization)
                .contentType("application/json")
                .content("{\"title\":\"" + marker + "\",\"description\":\"边界测试\",\"productLineId\":\"" + line + "\",\"assigneeName\":\"张瑞\"}"))
            .andExpect(status().isCreated());

        String otherTenant = "Bearer " + tokens.issue("other-task-user", "admin", "other-task-tenant", "其他租户管理员");
        mockMvc.perform(get("/api/bugs").header("Authorization", otherTenant).param("keyword", marker).param("pageSize", "500"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.pageSize").value(100))
            .andExpect(jsonPath("$.data.total").value(0))
            .andExpect(jsonPath("$.data.items.length()").value(0));

        String readOnly = "Bearer " + tokens.issue("product-reader", "product", "local-tenant", "产品只读用户");
        mockMvc.perform(get("/api/bugs").header("Authorization", readOnly).param("keyword", marker))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(1));
        mockMvc.perform(post("/api/bugs")
                .header("Authorization", readOnly)
                .contentType("application/json")
                .content("{\"title\":\"无权创建\",\"assigneeName\":\"张瑞\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void returnsTenantScopedGroupsAndPaginatesInsideSelectedGroup() throws Exception {
        String authorization = "Bearer " + loginToken();
        String marker = "服务端分组-" + System.nanoTime();
        String line = configuredLine();
        for (int index = 0; index < 3; index++) {
            String status = index < 2 ? "处理中" : "已完成";
            mockMvc.perform(post("/api/bugs")
                    .header("Authorization", authorization)
                    .contentType("application/json")
                    .content("{\"title\":\"" + marker + index + "\",\"description\":\"分组测试\",\"productLineId\":\"" + line + "\",\"status\":\"" + status + "\",\"assigneeName\":\"张瑞\"}"))
                .andExpect(status().isCreated());
        }

        mockMvc.perform(get("/api/bugs")
                .header("Authorization", authorization)
                .param("keyword", marker)
                .param("groupBy", "status")
                .param("page", "1")
                .param("pageSize", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(3))
            .andExpect(jsonPath("$.data.items.length()").value(1))
            .andExpect(jsonPath("$.data.groups.length()").value(1))
            .andExpect(jsonPath("$.data.groups[0].count").value(3));

        String otherTenant = "Bearer " + tokens.issue("group-reader", "admin", "other-group-tenant", "其他租户管理员");
        mockMvc.perform(get("/api/bugs").header("Authorization", otherTenant).param("keyword", marker).param("groupBy", "status"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(0))
            .andExpect(jsonPath("$.data.groups.length()").value(0));
    }

    private record TaskEndpoint(String path, String ownerJson, String status) {}
    private String configuredLine(){return jdbc.queryForObject("SELECT product_line_id_ FROM t_product_line_work_item_type WHERE tenant_id_='local-tenant' AND enabled_=1 AND delete_flag_=0 ORDER BY create_time_ LIMIT 1",String.class);}
}

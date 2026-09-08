package com.shichuang.manage.product;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.Map;
import java.util.concurrent.Future;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;

@Transactional
class RequirementControllerIntegrationTest extends AbstractApiIntegrationTest {

    @SpyBean
    private WorkOrderService workOrderService;

    @Test
    void createsHoldsAndAssignsRequirementWithAuditTrail() throws Exception {
        String token = loginToken();
        String title = "集成测试需求-" + System.nanoTime();
        String createBody = """
            {
              "title":"%s",
              "productLineId":"pl-1",
              "productLineName":"师创智联协同OS",
              "department":"产品中心",
              "customerId":"c-1",
              "customerName":"国家电网华东分部数智调度中心",
              "priority":"P1-高优",
              "description":"集成测试描述",
              "descriptionHtml":"<p>集成测试描述</p>",
              "dueDate":"2026-12-31"
            }
            """.formatted(title);

        String createResponse = mockMvc.perform(post("/api/requirements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(createBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.code").value("OK"))
            .andReturn().getResponse().getContentAsString();
        String requirementId = objectMapper.readTree(createResponse).path("data").path("id").asText();

        mockMvc.perform(post("/api/requirements/{id}/transition", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"action\":\"hold\",\"reason\":\"等待部门确认范围\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"售前支持\",\"assigneeName\":\"陈雅婷\",\"note\":\"补充客户方案\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.taskType").value("售前支持"));

        mockMvc.perform(get("/api/requirements/{id}", requirementId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("处理中"))
            .andExpect(jsonPath("$.data.events.length()").value(3))
            .andExpect(jsonPath("$.data.workItems.length()").value(1))
            .andExpect(jsonPath("$.data.workItems[0].taskType").value("售前支持"));
    }

    @Test
    void writesEveryTaskTypeToItsDownstreamRecord() throws Exception {
        String token = loginToken();
        Map<String, String> downstreamTables = Map.of(
            "售前支持", "t_crm_presales_ticket",
            "交付支持", "t_project_delivery_ticket",
            "产品需求", "t_product_requirement_task",
            "Bug修复", "t_product_bug"
        );

        downstreamTables.forEach((taskType, table) -> {
            try {
                String requirementId = createRequirement(token, "集成测试下游-" + taskType + "-" + System.nanoTime());
                mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"taskType\":\"" + taskType + "\",\"assigneeName\":\"张瑞\",\"note\":\"集成测试下游写入\"}"))
                    .andExpect(status().isCreated());
                Number count = jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE requirement_id_=? AND tenant_id_='local-tenant' AND delete_flag_=0", Number.class, requirementId);
                assertEquals(1, count.intValue(), taskType + " 未写入下游表");
            } catch (Exception error) {
                throw new AssertionError(error);
            }
        });
    }

    @Test
    void rejectsMissingReasonAndDuplicateActiveWorkItem() throws Exception {
        String token = loginToken();
        String requirementId = createRequirement(token, "集成测试校验-" + System.nanoTime());

        mockMvc.perform(post("/api/requirements/{id}/transition", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"action\":\"reject\",\"reason\":\"\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        String taskBody = "{\"taskType\":\"产品需求\",\"assigneeName\":\"张瑞\",\"note\":\"首次转任务\"}";
        mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(taskBody))
            .andExpect(status().isCreated());
        mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(taskBody))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void rejectsStaleRequirementVersionAndBlocksTerminalStateOperations() throws Exception {
        String token = loginToken();
        String requirementId = createRequirement(token, "集成测试并发边界-" + System.nanoTime());

        mockMvc.perform(get("/api/requirements/{id}", requirementId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.version").value(0));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/requirements/{id}", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"title\":\"并发边界-首次更新\",\"version\":0}"))
            .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/requirements/{id}", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"title\":\"并发边界-过期更新\",\"version\":0}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("REQUEST_REJECTED"));

        mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"产品需求\",\"assigneeName\":\"张瑞\",\"note\":\"边界任务\"}"))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/requirements/{id}/transition", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"action\":\"hold\",\"reason\":\"不允许在处理中搁置\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void completingWorkItemSynchronizesRequirementStatusAndAuditTrail() throws Exception {
        String token = loginToken();
        String requirementId = createRequirement(token, "集成测试完成同步-" + System.nanoTime());
        String response = mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"Bug修复\",\"assigneeName\":\"王浩然\",\"note\":\"修复回归问题\"}"))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        String workItemId = objectMapper.readTree(response).path("data").path("id").asText();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/requirements/work-items/{id}/status", workItemId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"status\":\"已完成\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/requirements/{id}", requirementId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("已完成"))
            .andExpect(jsonPath("$.data.taskType").value("Bug修复"))
            .andExpect(jsonPath("$.data.taskId").value(workItemId))
            .andExpect(jsonPath("$.data.events.length()").value(3))
            .andExpect(jsonPath("$.data.events[2].eventType").value("任务完成"));
        assertEquals("已完成", jdbc.queryForObject("SELECT status_ FROM t_product_bug WHERE id_=?", String.class, workItemId));
        mockMvc.perform(get("/api/requirements/{id}/events?eventType=任务完成", requirementId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()", org.hamcrest.Matchers.is(1)))
            .andExpect(jsonPath("$.data[0].operatorName").isNotEmpty());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentCreateWorkItemKeepsSingleActiveFlow() throws Exception {
        String token = loginToken();
        String requirementId = createRequirement(token, "集成测试并发转任务-" + System.nanoTime());
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> first = executor.submit(() -> createWorkItemStatus(token, requirementId, start));
            Future<Integer> second = executor.submit(() -> createWorkItemStatus(token, requirementId, start));
            start.countDown();
            int firstStatus = first.get();
            int secondStatus = second.get();
            assertTrue((firstStatus == 201 && secondStatus == 400) || (firstStatus == 400 && secondStatus == 201),
                "并发转任务必须一成功一拒绝");
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM t_requirement_work_item WHERE requirement_id_=? AND tenant_id_='local-tenant' AND delete_flag_=0", Integer.class, requirementId));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM t_product_requirement_task WHERE requirement_id_=? AND tenant_id_='local-tenant' AND delete_flag_=0", Integer.class, requirementId));
            assertEquals("处理中", jdbc.queryForObject("SELECT status_ FROM t_product_requirement WHERE id_=?", String.class, requirementId));
        } finally {
            executor.shutdownNow();
            cleanupRequirement(requirementId);
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void downstreamFailureRollsBackRequirementFlow() throws Exception {
        String token = loginToken();
        String requirementId = createRequirement(token, "集成测试下游失败回滚-" + System.nanoTime());
        doThrow(new IllegalStateException("模拟下游写入失败")).when(workOrderService)
            .create(anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
        try {
            mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                    .header("Authorization", "Bearer " + token)
                    .contentType("application/json")
                    .content("{\"taskType\":\"产品需求\",\"assigneeName\":\"张瑞\",\"note\":\"应补偿\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.syncStatus").value("FAILED"));
            String workItemId = jdbc.queryForObject("SELECT id_ FROM t_requirement_work_item WHERE requirement_id_=? AND tenant_id_='local-tenant' AND delete_flag_=0", String.class, requirementId);
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM t_requirement_work_item WHERE requirement_id_=? AND tenant_id_='local-tenant' AND delete_flag_=0", Integer.class, requirementId));
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM t_product_requirement_task WHERE requirement_id_=? AND tenant_id_='local-tenant' AND delete_flag_=0", Integer.class, requirementId));
            assertEquals("处理中", jdbc.queryForObject("SELECT status_ FROM t_product_requirement WHERE id_=?", String.class, requirementId));
            assertEquals("FAILED", jdbc.queryForObject("SELECT sync_status_ FROM t_requirement_work_item WHERE id_=?", String.class, workItemId));
            assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM t_product_requirement_event WHERE requirement_id_=? AND tenant_id_='local-tenant'", Integer.class, requirementId) >= 2);
        } finally {
            reset(workOrderService);
            cleanupRequirement(requirementId);
        }
    }

    @Test
    void verifiesRequirementIntegrityIndexesAuditColumnsAndAssociations() {
        Map<String, Integer> auditColumns = Map.of(
            "t_crm_presales_ticket", 1,
            "t_project_delivery_ticket", 1,
            "t_product_requirement_task", 1,
            "t_product_bug", 1,
            "t_product_requirement_event", 1
        );
        auditColumns.forEach((table, ignored) -> {
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name='create_by_'", Integer.class, table), table + " 缺少 create_by_");
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name='update_by_'", Integer.class, table), table + " 缺少 update_by_");
        });
        assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='t_product_requirement' AND index_name='idx_requirement_tenant_department_status'", Integer.class) > 0);
        assertTrue(jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='t_product_requirement' AND index_name='idx_requirement_tenant_priority_status'", Integer.class) > 0);
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM t_crm_presales_ticket t LEFT JOIN t_product_requirement r ON r.id_=t.requirement_id_ AND r.tenant_id_=t.tenant_id_ WHERE r.id_ IS NULL", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM t_project_delivery_ticket t LEFT JOIN t_product_requirement r ON r.id_=t.requirement_id_ AND r.tenant_id_=t.tenant_id_ WHERE r.id_ IS NULL", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM t_product_requirement_task t LEFT JOIN t_product_requirement r ON r.id_=t.requirement_id_ AND r.tenant_id_=t.tenant_id_ WHERE r.id_ IS NULL", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM t_product_bug t LEFT JOIN t_product_requirement r ON r.id_=t.requirement_id_ AND r.tenant_id_=t.tenant_id_ WHERE r.id_ IS NULL", Integer.class));
    }

    @Test
    void retriesMissingDownstreamRecordIdempotently() throws Exception {
        String token = loginToken();
        String requirementId = createRequirement(token, "集成测试下游重试-" + System.nanoTime());
        String response = mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"交付支持\",\"assigneeName\":\"张瑞\",\"note\":\"重试\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String workItemId = objectMapper.readTree(response).path("data").path("id").asText();
        jdbc.update("DELETE FROM t_project_delivery_ticket WHERE id_=?", workItemId);
        mockMvc.perform(post("/api/requirements/work-items/{id}/retry", workItemId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.syncStatus").value("SUCCESS"));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM t_project_delivery_ticket WHERE id_=? AND tenant_id_='local-tenant' AND delete_flag_=0", Integer.class, workItemId));
        mockMvc.perform(post("/api/requirements/work-items/{id}/retry", workItemId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM t_project_delivery_ticket WHERE id_=? AND tenant_id_='local-tenant' AND delete_flag_=0", Integer.class, workItemId));
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void listsAuditEventsWithPaginationAndFilters() throws Exception {
        String token = loginToken();
        String requirementId = createRequirement(token, "集成测试审计分页-" + System.nanoTime());
        mockMvc.perform(get("/api/requirements/audit-events?page=1&pageSize=10&eventType=创建")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.page").value(1))
            .andExpect(jsonPath("$.data.pageSize").value(10))
            .andExpect(jsonPath("$.data.items").isArray());
        cleanupRequirement(requirementId);
    }

    @Test
    void listsDownstreamSyncStatusWithTenantScopedPagination() throws Exception {
        String token = loginToken();
        String requirementId = createRequirement(token, "集成测试同步状态查询-" + System.nanoTime());
        mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"售前支持\",\"assigneeName\":\"张瑞\",\"note\":\"状态查询\"}"))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/requirements/work-items/sync-status?page=1&pageSize=10&taskType=售前支持&syncStatus=SUCCESS")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.page").value(1))
            .andExpect(jsonPath("$.data.pageSize").value(10))
            .andExpect(jsonPath("$.data.items[0].syncStatus").value("SUCCESS"))
            .andExpect(jsonPath("$.data.items[0].lastError").value(org.hamcrest.Matchers.nullValue()));

        String otherTenantToken = tokens.issue("user-sync-other", "admin", "tenant-sync-b", "其他租户管理员");
        mockMvc.perform(get("/api/requirements/work-items/sync-status?page=1&pageSize=10&taskType=售前支持")
                .header("Authorization", "Bearer " + otherTenantToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(0));
        cleanupRequirement(requirementId);
    }

    @Test
    void isolatesRequirementReadsBySessionTenant() throws Exception {
        String localToken = loginToken();
        String requirementId = createRequirement(localToken, "集成测试租户隔离-" + System.nanoTime());
        String otherTenantToken = tokens.issue("user-other", "admin", "tenant-b", "其他租户管理员");
        mockMvc.perform(get("/api/requirements?page=1&pageSize=20&keyword=" + requirementId)
                .header("Authorization", "Bearer " + otherTenantToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(0));
        cleanupRequirement(requirementId);
    }

    private int createWorkItemStatus(String token, String requirementId, CountDownLatch start) throws Exception {
        start.await();
        return mockMvc.perform(post("/api/requirements/{id}/work-items", requirementId)
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"taskType\":\"产品需求\",\"assigneeName\":\"张瑞\",\"note\":\"并发\"}"))
            .andReturn().getResponse().getStatus();
    }

    private void cleanupRequirement(String requirementId) {
        jdbc.update("DELETE FROM t_product_requirement_event WHERE requirement_id_=?", requirementId);
        jdbc.update("DELETE FROM t_crm_presales_ticket WHERE requirement_id_=?", requirementId);
        jdbc.update("DELETE FROM t_project_delivery_ticket WHERE requirement_id_=?", requirementId);
        jdbc.update("DELETE FROM t_product_requirement_task WHERE requirement_id_=?", requirementId);
        jdbc.update("DELETE FROM t_product_bug WHERE requirement_id_=?", requirementId);
        jdbc.update("DELETE FROM t_requirement_work_item WHERE requirement_id_=?", requirementId);
        jdbc.update("DELETE FROM t_product_requirement WHERE id_=?", requirementId);
    }

}

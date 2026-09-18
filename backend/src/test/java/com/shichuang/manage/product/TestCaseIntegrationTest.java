package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.shichuang.manage.product.TestCaseDefinition.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
class TestCaseIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired TestCaseService service;

    private final String tenant = "test-case-integration";
    private String line;
    private String owner;
    private String directory;

    @BeforeEach
    void fixture() {
        RequestContext.set(Map.of("sub", "test-user", "name", "测试用户", "tenant", tenant, "role", "admin"));
        line = UUID.randomUUID().toString();
        owner = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'测试产品线','test-user','test-user',NOW(6),NOW(6))", line, tenant, "TC-" + line);
        jdbc.update("INSERT INTO t_sys_user(id_,tenant_id_,username_,name_,department_,role_,role_title_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,'product_manager','产品经理','enabled','test-user','test-user',NOW(6),NOW(6))", owner, tenant, owner, "用例负责人", "测试部");
        directory = service.createDirectory(line, new SaveDirectory(null, "核心流程", 1)).id();
    }

    @AfterEach
    void clearContext() {
        RequestContext.clear();
    }

    @Test
    void createsListsUpdatesAndDisablesCase() {
        CaseView created = service.create(line, input("登录主流程", null));
        assertEquals("TC-000001", created.code());
        assertEquals(2, created.steps().size());
        assertEquals(1, service.directories(line).get(0).caseCount());
        assertEquals(created.id(), service.list(line, new Query(directory, "登录", null, null, true, 1, 20)).items().get(0).id());

        SaveCase update = new SaveCase(directory, null, "登录主流程更新", "已创建账号", "P1", owner,
            List.of("smoke"), created.steps(), created.revision());
        CaseView changed = service.update(line, created.id(), update);
        assertEquals("登录主流程更新", changed.title());
        assertEquals(1, changed.revision());
        assertFalse(service.setEnabled(line, created.id(), changed.revision(), false).enabled());
    }

    @Test
    void endpointReturnsOrderedSteps() throws Exception {
        String authorization = "Bearer " + tokens.issue("test-user", "admin", tenant);
        mockMvc.perform(MockMvcRequestBuilders.post("/api/product-lines/{line}/test-cases", line)
                .header("Authorization", authorization)
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(input("工作首页跳转", null))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.title").value("工作首页跳转"))
            .andExpect(jsonPath("$.data.steps.length()").value(2))
            .andExpect(jsonPath("$.data.steps[0].sort").value(1));
    }

    @Test
    void rejectsForeignDirectoryInactiveOwnerEmptyStepsAndStaleRevision() {
        String foreignLine = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'其他产品线','test-user','test-user',NOW(6),NOW(6))", foreignLine, tenant, "TC-" + foreignLine);
        String foreignDirectory = service.createDirectory(foreignLine, new SaveDirectory(null, "其他目录", 1)).id();
        assertThrows(IllegalArgumentException.class, () -> service.create(line, input("越界目录", foreignDirectory)));

        jdbc.update("UPDATE t_sys_user SET status_='disabled' WHERE tenant_id_=? AND id_=?", tenant, owner);
        assertThrows(IllegalArgumentException.class, () -> service.create(line, input("停用负责人", null)));
        jdbc.update("UPDATE t_sys_user SET status_='enabled' WHERE tenant_id_=? AND id_=?", tenant, owner);

        SaveCase empty = new SaveCase(directory, null, "空步骤", null, "P1", owner, List.of(), List.of(), null);
        assertThrows(IllegalArgumentException.class, () -> service.create(line, empty));
        CaseView created = service.create(line, input("乐观锁", null));
        service.update(line, created.id(), withRevision(input("第一次修改", null), created.revision()));
        ResponseStatusException stale = assertThrows(ResponseStatusException.class,
            () -> service.update(line, created.id(), withRevision(input("旧版本覆盖", null), created.revision())));
        assertEquals(HttpStatus.CONFLICT, stale.getStatusCode());
    }

    private SaveCase input(String title, String directoryOverride) {
        return new SaveCase(directoryOverride == null ? directory : directoryOverride, null, title, "用户已登录", "P1", owner,
            List.of("smoke", "核心"), List.of(
                new StepInput(null, 1, "打开工作首页", "展示我的待办"),
                new StepInput(null, 2, "点击测试任务", "打开任务列表")), null);
    }

    private SaveCase withRevision(SaveCase source, int revision) {
        return new SaveCase(source.directoryId(), source.sourceRequirementId(), source.title(), source.precondition(),
            source.priority(), source.ownerId(), source.tags(), source.steps(), revision);
    }
}

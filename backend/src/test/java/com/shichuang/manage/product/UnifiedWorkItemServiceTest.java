package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UnifiedWorkItemServiceTest {
    private final UnifiedWorkItemMapper mapper = mock(UnifiedWorkItemMapper.class);
    private final ProductLineMapper lines = mock(ProductLineMapper.class);
    private final UnifiedWorkItemService service = new UnifiedWorkItemService(mapper, lines, mock(WorkItemCompletionService.class));

    @AfterEach void clear() { RequestContext.clear(); }

    @Test void reviewAndAcceptanceAreNotRequirementCompletion() {
        for (String status : List.of("已评审", "已验收", "测试中")) {
            assertFalse(WorkItemStatus.legacy("requirement", status).successful());
            assertEquals(WorkItemStatus.Group.IN_PROGRESS, WorkItemStatus.legacy("requirement", status).group());
        }
        assertTrue(WorkItemStatus.legacy("requirement", "已完成").successful());
    }

    @Test void categoryControlsTerminalMeaningAndUnknownStatesStayUnknown() {
        assertTrue(WorkItemStatus.legacy("design", "无需设计").successful());
        assertFalse(WorkItemStatus.legacy("requirement", "无需设计").successful());
        assertTrue(WorkItemStatus.legacy("bug", "已关闭").successful());
        assertFalse(WorkItemStatus.legacy("bug", "已解决").terminal());
        assertEquals(WorkItemStatus.Group.UNKNOWN, WorkItemStatus.legacy("test", "客户联验中").group());
        assertFalse(WorkItemStatus.legacy("dev", "已取消").successful());
    }

    @Test void blockedOverlayDoesNotInventPreviousState() {
        WorkItemStatus status = WorkItemStatus.legacy("test", "已阻塞");
        assertTrue(status.legacyBlocked());
        assertEquals("已阻塞", status.name());
        assertEquals(WorkItemStatus.Group.UNKNOWN, status.group());
    }

    @Test void overdueExcludesTodayAndTerminalItems() {
        Map<String, Object> row = row("design", "d", "无需设计");
        row.put("dueDate", LocalDate.of(2026, 9, 1));
        assertFalse(map(row).overdue());
        row.put("status", "设计中");
        assertTrue(map(row).overdue());
        row.put("dueDate", LocalDate.of(2026, 9, 14));
        assertFalse(map(row).overdue());
    }

    @Test void potentialBlockerRequiresOpenP0OrP1Defect() {
        Map<String, Object> row = row("bug", "b", "待修复");
        for (String priority : List.of("P0-紧急阻断", "P1", "紧急", "高")) {
            row.put("priority", priority);
            assertTrue(map(row).potentialBlockingDefect());
        }
        row.put("priority", "P2");
        assertFalse(map(row).potentialBlockingDefect());
        row.put("priority", "P0");
        row.put("status", "已关闭");
        assertFalse(map(row).potentialBlockingDefect());
        assertNull(WorkItemStatus.priority("严重"));
    }

    @Test void versionDenominatorOnlyCountsRequirementsAndNeverClaimsReadiness() {
        List<UnifiedWorkItem> items = List.of(map(row("requirement", "r1", "已完成")),
            map(row("requirement", "r2", "测试中")), map(row("dev", "d1", "已完成")),
            map(row("design", "d2", "无需设计")));
        var summary = UnifiedWorkItemService.summarizeVersion("v1", items);
        assertEquals(2, summary.totalRequirements());
        assertEquals(new BigDecimal("50.00"), summary.completionPercent());
        assertNull(summary.readyToRelease());
        assertEquals(List.of("requirement:r2"), summary.unfinishedRequirementKeys());
        assertEquals(BigDecimal.ZERO, UnifiedWorkItemService.summarizeVersion("empty", items).completionPercent());
    }

    @Test void missingWorkflowIdsAndPriorityAreNotFabricated() {
        UnifiedWorkItem item = map(row("requirement", "r", "自定义状态"));
        assertNull(item.taskTypeId());
        assertNull(item.workflowId());
        assertNull(item.statusKey());
        assertNull(item.priority());
        assertEquals("自定义状态", item.status().name());
    }

    @Test void deniesOtherRolesBeforeAnyDatabaseRead() {
        session("sales");
        assertEquals(403, assertThrows(ResponseStatusException.class,
            () -> service.list("line", "", "", "", 1, 20)).getStatusCode().value());
        verifyNoInteractions(mapper, lines);
    }

    @Test void tenantAndVersionScopeAreValidated() {
        session("admin");
        when(lines.find("tenant-a", "line")).thenReturn(null);
        assertEquals(404, assertThrows(ResponseStatusException.class,
            () -> service.list("line", "", "", "", 1, 20)).getStatusCode().value());
        verify(lines).find("tenant-a", "line");
        when(lines.find("tenant-a", "line")).thenReturn(Map.of("id", "line"));
        when(lines.version("tenant-a", "foreign-version")).thenReturn(Map.of("productLineId", "other"));
        assertThrows(ResponseStatusException.class, () -> service.versionSummary("line", "foreign-version"));
        verifyNoInteractions(mapper);
    }

    @Test void listPaginationAndExplicitTestCoverageAreStable() {
        session("admin");
        when(lines.find("tenant-a", "line")).thenReturn(Map.of("id", "line"));
        when(mapper.byProductLine("tenant-a", "line")).thenReturn(List.of(row("requirement", "r", "测试中")));
        assertEquals(1, service.list("line", "", "", "", 1, 20).page().total());
        assertTrue(service.list("line", "", "", "", Integer.MAX_VALUE, 100).page().items().isEmpty());
        var test = service.list("line", "", "test", "", 1, 20);
        assertEquals(0, test.page().total());
        assertFalse(test.limitations().contains("测试工作项尚未接入"));
    }

    @Test void nonAdminMustPassProductLineVisibilityBeforeReadingItems() {
        session("product");
        when(lines.find("tenant-a", "line")).thenReturn(Map.of("id", "line"));
        assertEquals(403, assertThrows(ResponseStatusException.class,
            () -> service.list("line", "", "", "", 1, 20)).getStatusCode().value());
        verify(mapper, never()).byProductLine(anyString(), anyString());
        when(mapper.canRead("tenant-a", "line", "user")).thenReturn(true);
        assertEquals(0, service.list("line", "", "", "", 1, 20).page().total());
    }

    @Test void requirementKeepsParallelHandlersAndHistoricalCompletion() {
        session("admin");
        when(lines.find("tenant-a", "line")).thenReturn(Map.of("id", "line"));
        var design = row("design", "d", "设计中");
        design.put("requirementId", "r"); design.put("assigneeName", "设计师");
        var dev = row("dev", "v", "开发中");
        dev.put("requirementId", "r"); dev.put("assigneeName", "研发");
        when(mapper.byProductLine("tenant-a", "line")).thenReturn(List.of(row("requirement", "r", "已完成"), design, dev));
        var result = service.requirementSummary("line", "r");
        assertEquals(List.of("设计师", "研发"), result.currentHandlers());
        assertTrue(result.requirement().status().successful());
        assertNull(result.completionEligible());
    }

    private static void session(String role) {
        RequestContext.set(Map.of("sub", "user", "tenant", "tenant-a", "role", role));
    }
    private static Map<String, Object> row(String category, String id, String status) {
        return new HashMap<>(Map.of("category", category, "id", id, "status", status, "versionId", "v1"));
    }
    private static UnifiedWorkItem map(Map<String, Object> row) {
        return UnifiedWorkItemService.map(row, LocalDate.of(2026, 9, 14));
    }
}

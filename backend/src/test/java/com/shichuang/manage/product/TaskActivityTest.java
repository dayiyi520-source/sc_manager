package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.junit.jupiter.api.*;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TaskActivityTest {
    @BeforeEach void setup() { RequestContext.set(Map.of("sub","user","tenant","tenant","role","admin")); }
    @AfterEach void cleanup() { RequestContext.clear(); }
    @Test void diffsOnlyBusinessChangesAndIgnoresAuditAndEquivalentNumbers() {
        var changes=TaskActivityChanges.between(Map.of("title","原标题","actualHours",new BigDecimal("2.00"),"revision",1),Map.of("title","新标题","actualHours",2,"revision",2));
        assertEquals(List.of(Map.of("field","title","from","原标题","to","新标题")),changes);
        assertTrue(TaskActivityChanges.between(Map.of("revision",1),Map.of("revision",2)).isEmpty());
    }
    @Test void persistsCommentsOnlyAfterAccessAndExistenceChecks() {
        var mapper=mock(WorkItemStorageMapper.class);
        var access=mock(WorkItemAccess.class);
        var config=mock(WorkItemConfigurationService.class);
        var service=new WorkItemStorageService(mapper,access,config,mock(WorkItemCategoryService.class));
        when(mapper.item("tenant","line","task")).thenReturn(Map.of("id","task"));
        when(config.encode(Map.of("content","评论内容"))).thenReturn("comment-json");
        service.comment("line","task"," 评论内容 ");
        verify(access).check("line",true);
        verify(mapper).activity("tenant","line","task","WORK_ITEM_COMMENTED","comment-json","user");
        reset(mapper);
        when(mapper.item("tenant","line","task")).thenReturn(Map.of("id","task"));
        when(mapper.item("tenant","line","missing")).thenReturn(null);
        assertThrows(IllegalArgumentException.class,()->service.comment("line","task"," "));
        assertThrows(RuntimeException.class,()->service.comment("line","missing","评论"));
        verify(mapper,never()).activity(anyString(),anyString(),anyString(),anyString(),any(),anyString());
    }
    @Test void legacyUpdatesAndCommentsShareTheTasksOwnTimeline() {
        var mapper=mock(TaskAliasMapper.class);
        var service=new TaskAliasService(mapper,mock(WorkItemStorageService.class),mock(WorkItemTransitionService.class));
        when(mapper.detailLegacy("t_project_ops_task","owner_name_","task")).thenReturn(Map.of("id","task","title","原任务","status","待处理"),Map.of("id","task","title","新任务","status","已完成"));
        when(mapper.updateLegacy(anyString(),eq("task"),anyMap())).thenReturn(1);
        service.update("ops","task",Map.of("title","新任务","status","已完成"));
        verify(mapper).activity(eq("task"),eq("WORK_ITEM_UPDATED"),argThat(body -> ((List<?>)body.get("changes")).size()==2));
        service.comment("ops","task"," 评论 ");
        verify(mapper).activity("task","WORK_ITEM_COMMENTED",Map.of("content","评论"));
    }
}

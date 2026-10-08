package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TaskCompletionHoursTest {
    private WorkItemStorageMapper mapper;
    private WorkItemTransitionService service;
    private State completed;

    @BeforeEach void setup() {
        RequestContext.set(Map.of("sub","user","tenant","tenant","role","admin"));
        mapper=mock(WorkItemStorageMapper.class);
        var access=mock(WorkItemAccess.class);
        var configurations=mock(WorkItemConfigurationService.class);
        var relations=mock(WorkItemRelationService.class);
        service=new WorkItemTransitionService(mapper,access,configurations,mock(WorkItemApprovalService.class),relations,mock(WorkItemCompletionService.class),mock(AutomationRuleService.class),mock(RequirementMapper.class));
        completed=new State("done","已完成",WorkItemStatus.Group.COMPLETED,false,true,true,"design","green");
        var workflow=new Workflow(List.of(completed),List.of(new Edge("finish","doing","done","完成")));
        when(mapper.item("tenant","line","task")).thenReturn(Map.of("id","task","revision",0,"statusKey","doing","statusName","处理中","workflowId","flow","category","design"));
        when(configurations.requireWorkflow("line","flow")).thenReturn(Map.of("status","PUBLISHED","category","design","definition","{}"));
        when(configurations.decode("{}")).thenReturn(workflow);
        when(relations.snapshot("line")).thenReturn(Map.of());
        when(mapper.timedItem("tenant","line","task")).thenReturn(Map.of("id","task","statusName","已完成","actualHours",new BigDecimal("3.25")));
        when(mapper.transition(eq("tenant"),eq("line"),eq("task"),eq(0),eq("doing"),eq(completed),eq("user"),any())).thenReturn(1);
    }
    @AfterEach void cleanup() { RequestContext.clear(); }

    @Test void savesHoursAndStatusInTheSameVersionedWrite() {
        var hours=new BigDecimal("3.25");
        assertEquals(hours,service.execute("line","task",new Transition("finish",0,"",hours)).get("actualHours"));
        verify(mapper).transition("tenant","line","task",0,"doing",completed,"user",hours);
        verify(mapper).activity(eq("tenant"),eq("line"),eq("task"),eq("WORK_ITEM_TRANSITIONED"),any(),eq("user"));
    }
    @Test void invalidOrMissingHoursDoNotWriteStatusOrActivity() {
        for(BigDecimal hours:Arrays.asList(null,new BigDecimal("-1"),new BigDecimal("1.001")))
            assertThrows(IllegalArgumentException.class,()->service.execute("line","task",new Transition("finish",0,"",hours)));
        verify(mapper,never()).transition(anyString(),anyString(),anyString(),anyInt(),anyString(),any(),anyString(),any());
        verify(mapper,never()).activity(anyString(),anyString(),anyString(),anyString(),any(),anyString());
    }
    @Test void staleRevisionDoesNotWriteHours() {
        assertThrows(RuntimeException.class,()->service.execute("line","task",new Transition("finish",1,"",BigDecimal.ZERO)));
        verify(mapper,never()).transition(anyString(),anyString(),anyString(),anyInt(),anyString(),any(),anyString(),any());
    }
}

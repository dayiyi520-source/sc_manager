package com.shichuang.manage.product;

import org.junit.jupiter.api.Test;
import java.util.List;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static org.junit.jupiter.api.Assertions.*;

class WorkItemDefinitionTest {
    static Workflow workflow() {
        return new Workflow(List.of(new State("open","待执行",WorkItemStatus.Group.NOT_STARTED,true,false,true,"test"),
            new State("done","测试通过",WorkItemStatus.Group.COMPLETED,false,true,true,"test")),
            List.of(new Edge("finish","open","done","完成测试")));
    }
    @Test void validCustomWorkflow() { assertDoesNotThrow(() -> validate(workflow())); }
    @Test void rejectsUnreachableEnabledState() { assertThrows(IllegalArgumentException.class,()->validate(new Workflow(workflow().states(),List.of()))); }
    @Test void rejectsMissingTarget() { assertThrows(IllegalArgumentException.class,()->validate(new Workflow(workflow().states(),List.of(new Edge("bad","open","missing","错误"))))); }
    @Test void rejectsCancelledAsSuccess() {
        assertThrows(IllegalArgumentException.class,()->validate(new Workflow(List.of(workflow().states().get(0),
            new State("done","已取消",WorkItemStatus.Group.CANCELLED,false,true,true,"test")),workflow().transitions())));
    }
    @Test void rejectsMultipleInitialStates() {
        assertThrows(IllegalArgumentException.class,()->validate(new Workflow(List.of(workflow().states().get(0),
            new State("done","第二初始",WorkItemStatus.Group.NOT_STARTED,true,false,true,"test")),workflow().transitions())));
    }
    @Test void rejectsDuplicateEdgesAndUnknownGroups() {
        assertThrows(IllegalArgumentException.class,()->validate(new Workflow(workflow().states(),List.of(workflow().transitions().get(0),workflow().transitions().get(0)))));
        assertThrows(IllegalArgumentException.class,()->validate(new Workflow(List.of(workflow().states().get(0),
            new State("done","未知",WorkItemStatus.Group.UNKNOWN,false,false,true,"test")),workflow().transitions())));
    }
    @Test void requiresPhaseCoverageAndOneDefaultState() {
        var missingCompleted = new Workflow(List.of(
            new State("open","待执行",WorkItemStatus.Group.NOT_STARTED,true,false,true,"test"),
            new State("doing","执行中",WorkItemStatus.Group.IN_PROGRESS,false,false,true,"test")),
            List.of(new Edge("start","open","doing","开始")));
        var error=assertThrows(IllegalArgumentException.class,()->validate(missingCompleted));
        assertEquals("状态流转必须包含至少一个‘未开始’和一个‘已完成’阶段的状态。",error.getMessage());

        var reordered = new Workflow(List.of(workflow().states().get(1), workflow().states().get(0)),
            List.of(new Edge("finish","open","done","完成测试")));
        assertDoesNotThrow(()->validate(reordered));
    }
    @Test void validatesSemanticTagColor() {
        var states=List.of(new State("open","待执行",WorkItemStatus.Group.NOT_STARTED,true,false,true,"test","neutral"),
            new State("done","测试通过",WorkItemStatus.Group.COMPLETED,false,true,true,"test","orange"));
        assertEquals("状态颜色无效",assertThrows(IllegalArgumentException.class,()->validate(new Workflow(states,workflow().transitions()))).getMessage());
    }
}

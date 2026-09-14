package com.shichuang.manage.product;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class WorkItemDependencyGraphTest {
    private Map<String,Object> item(String id,String parent) { var row=new HashMap<String,Object>(Map.of("id",id,"category","dev","statusGroup","NOT_STARTED","successful",false,"priority","P2")); if(parent!=null) row.put("parentId",parent); return row; }
    private Map<String,Object> edge(String from,String to) { return Map.of("sourceId",from,"targetId",to,"type","BLOCKS","scope","FINISH","deleted",false); }
    @Test void rejectsDirectAndIndirectCycles() {
        var items=List.of(item("a",null),item("b",null),item("c",null));
        assertThrows(RuntimeException.class,()->new WorkItemDependencyGraph(items,List.of(edge("a","b"),edge("b","a"))).snapshot());
        assertThrows(RuntimeException.class,()->new WorkItemDependencyGraph(items,List.of(edge("a","b"),edge("b","c"),edge("c","a"))).snapshot());
    }
    @Test void rejectsCyclesThroughImplicitParentEdges() {
        assertThrows(RuntimeException.class,()->new WorkItemDependencyGraph(List.of(item("a",null),item("b","a")),List.of(edge("a","b"))).snapshot());
    }
    @Test void multipleBlockersDoNotReleaseUntilAllResolved() {
        var a=item("a",null); var b=item("b",null); var c=item("c",null);
        var relations=List.of(edge("a","c"),edge("b","c"));
        assertEquals(2,new WorkItemDependencyGraph(List.of(a,b,c),relations).snapshot().get("c").size());
        a.put("successful",true); a.put("statusGroup","COMPLETED");
        assertEquals(1,new WorkItemDependencyGraph(List.of(a,b,c),relations).snapshot().get("c").size());
        b.put("statusGroup","CANCELLED");
        assertEquals(1,new WorkItemDependencyGraph(List.of(a,b,c),relations).snapshot().get("c").size());
    }
}

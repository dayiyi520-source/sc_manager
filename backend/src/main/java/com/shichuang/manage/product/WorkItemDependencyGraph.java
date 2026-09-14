package com.shichuang.manage.product;

import java.util.*;
import static com.shichuang.manage.product.WorkItemConfigurationService.enabled;

/** Edges point from prerequisite to dependent, including implicit delivery ancestry. */
public final class WorkItemDependencyGraph {
    public record Blocker(String workItemId,String scope,String reason) {}
    private record Edge(String from,String to,String scope,String kind) {}
    private final Map<String,Map<String,Object>> items=new LinkedHashMap<>();
    private final List<Edge> edges=new ArrayList<>();
    WorkItemDependencyGraph(List<Map<String,Object>> rows,List<Map<String,Object>> relations) {
        rows.forEach(row->items.put(row.get("id").toString(),row));
        for (Map<String,Object> row:rows) {
            String id=row.get("id").toString();
            if (row.get("parentId")!=null) edges.add(new Edge(id,row.get("parentId").toString(),"FINISH","ROLLUP"));
            if (row.get("requirementId")!=null && !"bug".equals(row.get("category")))
                edges.add(new Edge(id,row.get("requirementId").toString(),"FINISH","ROLLUP"));
        }
        for (Map<String,Object> relation:relations) {
            if (enabled(relation.get("deleted"))) continue;
            String from=relation.get("sourceId").toString(),to=relation.get("targetId").toString();
            if ("BLOCKS".equals(relation.get("type"))) edges.add(new Edge(from,to,relation.get("scope").toString(),"BLOCKS"));
            if ("REQUIRES_REGRESSION".equals(relation.get("type"))) edges.add(new Edge(to,from,"FINISH","BLOCKS"));
            if ("FOUND_DEFECT".equals(relation.get("type")) && enabled(relation.get("duringTesting")))
                edges.add(new Edge(to,from,"FINISH","DEFECT"));
        }
        edges.removeIf(edge->!items.containsKey(edge.from()) || !items.containsKey(edge.to()));
    }
    private List<String> order() {
        Map<String,Integer> incoming=new HashMap<>();
        Map<String,List<String>> next=new HashMap<>();
        items.keySet().forEach(id->incoming.put(id,0));
        for (Edge edge:edges) { incoming.merge(edge.to(),1,Integer::sum); next.computeIfAbsent(edge.from(),key->new ArrayList<>()).add(edge.to()); }
        Deque<String> queue=new ArrayDeque<>(); incoming.forEach((id,n)->{if(n==0) queue.add(id);});
        List<String> sorted=new ArrayList<>();
        while(!queue.isEmpty()) {
            String id=queue.remove(); sorted.add(id);
            for(String target:next.getOrDefault(id,List.of())) if(incoming.merge(target,-1,Integer::sum)==0) queue.add(target);
        }
        if(sorted.size()!=items.size()) throw WorkItemConfigurationService.conflict("依赖关系形成循环，包含父子任务或需求交付依赖");
        return sorted;
    }
    Map<String,List<Blocker>> snapshot() {
        Map<String,List<Edge>> outgoing=new HashMap<>();
        for(Edge edge:edges) outgoing.computeIfAbsent(edge.from(),key->new ArrayList<>()).add(edge);
        Map<String,List<Blocker>> result=new LinkedHashMap<>(); items.keySet().forEach(id->result.put(id,new ArrayList<>()));
        for(String source:order()) {
            Map<String,Object> item=items.get(source);
            for(Edge edge:outgoing.getOrDefault(source,List.of())) {
                if(terminal(items.get(edge.to()))) continue;
                List<Blocker> blockers=result.get(edge.to());
                if("ROLLUP".equals(edge.kind())) {
                    for(Blocker blocker:result.get(source)) blockers.add(new Blocker(blocker.workItemId(),"FINISH","交付任务被阻塞"));
                } else if("DEFECT".equals(edge.kind())) {
                    if(Set.of("P0","P1").contains(item.get("priority")) && !terminal(item)) blockers.add(new Blocker(source,"FINISH","测试中发现的高优先级缺陷未关闭"));
                } else if(!enabled(item.get("successful")) || !result.get(source).isEmpty()) blockers.add(new Blocker(source,edge.scope(),"前置工作项未成功完成"));
            }
        }
        result.replaceAll((id,blockers)->blockers.stream().distinct().sorted(Comparator.comparing(Blocker::workItemId).thenComparing(Blocker::scope).thenComparing(Blocker::reason)).toList());
        return result;
    }
    static boolean terminal(Map<String,Object> item) { return Set.of("COMPLETED","CANCELLED").contains(item.get("statusGroup")); }
}

package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static com.shichuang.manage.product.WorkItemConfigurationService.*;

@Service
public class WorkItemCompletionService {
    public record Eligibility(Boolean eligible,List<String> reasons) {}
    private final WorkItemStorageMapper storage;
    private final WorkItemRelationMapper graph;
    private final WorkItemConfigurationService configurations;
    public WorkItemCompletionService(WorkItemStorageMapper storage,WorkItemRelationMapper graph,WorkItemConfigurationService configurations) {
        this.storage=storage; this.graph=graph; this.configurations=configurations;
    }
    private Workflow workflow(String line,Map<String,Object> item) {
        return configurations.decode(configurations.requireWorkflow(line,item.get("workflowId").toString()).get("definition"));
    }
    public Eligibility eligibility(String line,String id) {
        var item=storage.item(RequestContext.tenantId(),line,id);
        if(item==null) return new Eligibility(null,List.of("历史需求尚未绑定统一流程"));
        Workflow definition=workflow(line,item);
        if(!governed(definition)) return new Eligibility(null,List.of("需求流程尚未配置交付完成规则"));
        List<String> reasons=deliveryReasons(line,item);
        if(!WorkItemDependencyGraph.terminal(item)) {
            var candidates=definition.transitions().stream().filter(e->e.from().equals(item.get("statusKey")))
                .filter(e->definition.states().stream().anyMatch(s->s.key().equals(e.to()) && s.enabled() && s.successful())).toList();
            if(candidates.isEmpty()) reasons.add("当前流程尚未到达允许完成的阶段");
            else if(candidates.stream().allMatch(e->e.effectiveRequiredFields().stream().anyMatch(field->"reason".equals(field) || item.get(field)==null || item.get(field).toString().isBlank())))
                reasons.add("完成流转要求的资料尚未齐全");
        }
        return new Eligibility(reasons.isEmpty(),reasons);
    }
    boolean governed(Workflow workflow) { return workflow.transitions().stream().anyMatch(e->e.autoComplete() || e.approvalTasks()!=null); }
    List<String> deliveryReasons(String line,Map<String,Object> requirement) {
        String tenant=RequestContext.tenantId(),id=requirement.get("id").toString();
        List<String> reasons=new ArrayList<>();
        if(!storage.approvalDispatched(tenant,line,id)) reasons.add("需求尚未完成评审下发");
        var linked=graph.items(tenant,line).stream().filter(row->id.equals(row.get("requirementId"))).toList();
        for(String category:List.of("design","dev","test")) {
            if(linked.stream().noneMatch(row->category.equals(row.get("category")) && row.get("parentId")==null)) reasons.add("缺少"+CATEGORIES.get(category)+"主任务");
        }
        for(var row:linked) if(!"bug".equals(row.get("category")) && !enabled(row.get("successful"))) reasons.add("交付任务未完成："+row.get("id"));
        var blockers=snapshot(line).getOrDefault(id,List.of());
        blockers.forEach(blocker->reasons.add(blocker.reason()+"："+blocker.workItemId()));
        return reasons;
    }
    Map<String,List<WorkItemDependencyGraph.Blocker>> snapshot(String line) {
        return new WorkItemDependencyGraph(graph.items(RequestContext.tenantId(),line),graph.relations(RequestContext.tenantId(),line)).snapshot();
    }
    // Called inside the writer's transaction while the product-line lock is held.
    void reconcile(String line) {
        String tenant=RequestContext.tenantId();
        List<String> requirements=graph.items(tenant,line).stream().filter(row->"requirement".equals(row.get("category"))).map(row->row.get("id").toString()).toList();
        boolean changed;
        do {
            changed=false;
            for(String id:requirements) {
                var item=storage.item(tenant,line,id);
                if(WorkItemDependencyGraph.terminal(item)) continue;
                if(item.get("versionId")!=null) {
                    var version=storage.version(tenant,line,item.get("versionId").toString());
                    if(version==null || "已发布".equals(version.get("status"))) continue;
                }
                Workflow definition=workflow(line,item);
                var edge=definition.transitions().stream().filter(e->e.autoComplete() && e.from().equals(item.get("statusKey"))).findFirst().orElse(null);
                if(edge==null || !deliveryReasons(line,item).isEmpty()) continue;
                if(edge.effectiveRequiredFields().stream().anyMatch(field->item.get(field)==null || item.get(field).toString().isBlank())) continue;
                State target=definition.states().stream().filter(s->s.key().equals(edge.to()) && s.enabled()).findFirst().orElse(null);
                if(target==null || storage.hasUnfinishedChildren(tenant,line,id)) continue;
                var before=snapshot(line);
                int revision=((Number)item.get("revision")).intValue();
                if(storage.transition(tenant,line,id,revision,edge.from(),target,RequestContext.userId())!=1) throw conflict("需求已变化，请刷新后重试");
                storage.activity(tenant,line,id,"REQUIREMENT_AUTO_COMPLETED",configurations.encode(Map.of("edgeKey",edge.key(),"from",edge.from(),"to",edge.to(),"revision",revision+1)),RequestContext.userId());
                snapshot(line).forEach((affected,blockers)-> {
                    if(blockers.equals(before.getOrDefault(affected,List.of()))) return;
                    graph.touch(tenant,line,affected,RequestContext.userId());
                    storage.activity(tenant,line,affected,blockers.isEmpty()?"WORK_ITEM_UNBLOCKED":"WORK_ITEM_BLOCKERS_CHANGED",configurations.encode(Map.of("before",before.getOrDefault(affected,List.of()),"after",blockers)),RequestContext.userId());
                });
                changed=true;
            }
        } while(changed);
    }
}

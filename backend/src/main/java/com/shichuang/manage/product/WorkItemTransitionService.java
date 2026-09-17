package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static com.shichuang.manage.product.WorkItemConfigurationService.conflict;

@Service
@Transactional(readOnly=true)
public class WorkItemTransitionService {
    private final WorkItemStorageMapper mapper;
    private final WorkItemAccess access;
    private final WorkItemConfigurationService configurations;
    private final WorkItemApprovalService approvals;
    private final WorkItemRelationService relations;
    private final WorkItemCompletionService completion;
    public WorkItemTransitionService(WorkItemStorageMapper mapper,WorkItemAccess access,WorkItemConfigurationService configurations,WorkItemApprovalService approvals,WorkItemRelationService relations,WorkItemCompletionService completion) {
        this.mapper=mapper; this.access=access; this.configurations=configurations; this.approvals=approvals; this.relations=relations; this.completion=completion;
    }
    public record Action(String edgeKey,String name,String to,List<String> requiredFields,boolean allowed,List<String> reasons) {}
    public record StatusOption(String key,String name,String color,boolean current,boolean allowed,List<String> reasons) {}
    public record Actions(int revision,List<Action> actions,List<StatusOption> statuses) {}

    @Transactional public Actions available(String line,String id) {
        access.check(line,false);
        // Share the creation lock to return a consistent revision and child gate snapshot.
        if (!mapper.lockLine(RequestContext.tenantId(),line)) throw missing();
        Map<String,Object> item=item(line,id);
        Workflow workflow=workflow(line,item);
        List<Action> actions=new ArrayList<>();
        for (Edge edge:workflow.transitions()) {
            if (!edge.from().equals(item.get("statusKey"))) continue;
            State target=target(workflow,edge);
            List<String> reasons=reasons(line,item,edge,target,null,false);
            actions.add(new Action(edge.key(),edge.name(),edge.to(),edge.effectiveRequiredFields(),reasons.isEmpty(),reasons));
        }
        List<StatusOption> statuses=workflow.states().stream().filter(State::enabled).map(state -> {
            boolean current=state.key().equals(item.get("statusKey"));
            Action action=actions.stream().filter(value->value.to().equals(state.key())).findFirst().orElse(null);
            List<String> reasons=current?List.of():action==null?List.of("当前状态不可直接流转"):action.reasons();
            return new StatusOption(state.key(),state.name(),state.color(),current,current || action!=null && action.allowed(),reasons);
        }).toList();
        return new Actions(((Number)item.get("revision")).intValue(),actions,statuses);
    }

    @Transactional public Map<String,Object> execute(String line,String id,Transition input) {
        access.check(line,true);
        required(input.edgeKey(),"流转操作",64);
        if (input.revision()==null || input.revision()<0) throw new IllegalArgumentException("请提交工作项当前版本号");
        if (input.reason()!=null && input.reason().length()>2000) throw new IllegalArgumentException("操作原因不能超过2000字");
        Map<String,Object> item=item(line,id);
        if (((Number)item.get("revision")).intValue()!=input.revision()) throw conflict("工作项已变化，请刷新后重试");
        Workflow workflow=workflow(line,item);
        Edge edge=workflow.transitions().stream().filter(e -> e.key().equals(input.edgeKey()) && e.from().equals(item.get("statusKey")))
            .findFirst().orElseThrow(() -> conflict("当前状态不允许执行该流转"));
        State target=target(workflow,edge);
        if (!edge.effectiveRoles().contains(RequestContext.role())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"当前角色不能执行该流转");
        List<String> reasons=reasons(line,item,edge,target,input.reason(),true);
        if (!reasons.isEmpty()) throw conflict(String.join("；",reasons));
        var blockersBefore=relations.snapshot(line);
        if (edge.approvalTasks()!=null) approvals.dispatch(line,item,edge.approvalTasks());
        if (mapper.transition(RequestContext.tenantId(),line,id,input.revision(),edge.from(),target,RequestContext.userId())!=1)
            throw conflict("工作项已变化，请刷新后重试");
        mapper.activity(RequestContext.tenantId(),line,id,"WORK_ITEM_TRANSITIONED",configurations.encode(Map.of(
            "edgeKey",edge.key(),"from",edge.from(),"to",edge.to(),"fromName",item.get("statusName"),
            "toName",target.name(),"reason",Objects.toString(input.reason(),""),"revision",input.revision()+1)),RequestContext.userId());
        relations.recordChanges(line,blockersBefore);
        return mapper.timedItem(RequestContext.tenantId(),line,id);
    }

    private List<String> reasons(String line,Map<String,Object> item,Edge edge,State target,String reason,boolean executing) {
        List<String> result=new ArrayList<>();
        String tenant=RequestContext.tenantId();
        if (!edge.effectiveRoles().contains(RequestContext.role())) result.add("当前角色不能执行该流转");
        if (mapper.hasChildren(tenant,line,item.get("id").toString())) result.add("主任务存在子任务，状态不可手工修改");
        if (!target.enabled()) result.add("目标状态已停用");
        String versionId=optional(Objects.toString(item.get("versionId"),null));
        if (versionId!=null) {
            Map<String,Object> version=mapper.version(tenant,line,versionId);
            if (version==null) result.add("关联版本不存在");
            else if ("已发布".equals(version.get("status"))) result.add("已发布版本只读");
        }
        boolean terminal=target.group()==WorkItemStatus.Group.COMPLETED || target.group()==WorkItemStatus.Group.CANCELLED;
        if(target.successful() && "requirement".equals(item.get("category")) && completion.governed(workflow(line,item)))
            result.addAll(completion.deliveryReasons(line,item));
        for(var blocker:relations.snapshot(line).getOrDefault(item.get("id").toString(),List.of())) {
            if(target.successful() || ("START".equals(blocker.scope()) && target.group()==WorkItemStatus.Group.IN_PROGRESS))
                result.add(blocker.reason()+"："+blocker.workItemId());
        }
        if (terminal && mapper.hasUnfinishedChildren(tenant,line,item.get("id").toString())) result.add("必要子任务尚未全部完成");
        String parentId=optional(Objects.toString(item.get("parentWorkItemId"),null));
        if (parentId!=null) {
            Map<String,Object> parent=mapper.item(tenant,line,parentId);
            if (parent==null || Set.of("COMPLETED","CANCELLED").contains(parent.get("statusGroup"))) result.add("父任务不存在或已结束，不能修改子任务状态");
        }
        for (String field:edge.effectiveRequiredFields()) {
            if ("reason".equals(field) && !executing) continue;
            Object value="reason".equals(field)?reason:item.get(field);
            if (value==null || value.toString().isBlank()) result.add("请补充"+label(field));
        }
        return result;
    }
    private Workflow workflow(String line,Map<String,Object> item) {
        Map<String,Object> workflow=configurations.requireWorkflow(line,item.get("workflowId").toString());
        if (!"PUBLISHED".equals(workflow.get("status")) || !item.get("category").equals(workflow.get("category"))) throw conflict("工作项绑定的流程无效");
        return configurations.decode(workflow.get("definition"));
    }
    private Map<String,Object> item(String line,String id) {
        Map<String,Object> item=mapper.item(RequestContext.tenantId(),line,id);
        if (item==null) throw missing();
        return item;
    }
    private static State target(Workflow workflow,Edge edge) { return workflow.states().stream().filter(s -> s.key().equals(edge.to())).findFirst().orElseThrow(() -> conflict("目标状态不存在")); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"工作项不存在"); }
    private static String label(String field) { return switch(field) { case "assigneeId" -> "负责人"; case "description" -> "任务描述"; case "expectedGoal" -> "验收目标"; case "plannedEndDate" -> "计划完成日期"; default -> "操作原因"; }; }
}

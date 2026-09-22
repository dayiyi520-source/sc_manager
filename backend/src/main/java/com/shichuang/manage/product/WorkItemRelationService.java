package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static com.shichuang.manage.product.WorkItemConfigurationService.*;
import static com.shichuang.manage.product.WorkItemDependencyGraph.*;

@Service
@Transactional(readOnly=true)
public class WorkItemRelationService {
    public record CreateRelation(String targetId,String type,String scope) {}
    public record View(List<Map<String,Object>> relations,boolean blocked,List<Blocker> blockers) {}
    private final WorkItemRelationMapper mapper;
    private final WorkItemStorageMapper storage;
    private final WorkItemAccess access;
    private final WorkItemConfigurationService configurations;
    private final WorkItemCompletionService completion;
    public WorkItemRelationService(WorkItemRelationMapper mapper,WorkItemStorageMapper storage,WorkItemAccess access,WorkItemConfigurationService configurations,WorkItemCompletionService completion) {
        this.mapper=mapper; this.storage=storage; this.access=access; this.configurations=configurations; this.completion=completion;
    }
    @Transactional public View list(String line,String id) {
        access.check(line,false); storage.lockLine(RequestContext.tenantId(),line); item(line,id);
        List<Blocker> blockers=snapshot(line).getOrDefault(id,List.of());
        return new View(rows(line).stream().filter(row->!enabled(row.get("deleted")) && (id.equals(row.get("sourceId")) || id.equals(row.get("targetId")))).toList(),!blockers.isEmpty(),blockers);
    }
    @Transactional public Map<String,Object> create(String line,String id,CreateRelation input) {
        access.check(line,true); required(input.targetId(),"目标工作项",36);
        if(id.equals(input.targetId())) throw new IllegalArgumentException("工作项不能关联自身");
        if(input.type()==null || !Set.of("BLOCKS","RELATES_TO","FOUND_DEFECT").contains(input.type())) throw new IllegalArgumentException("关系类型无效");
        String scope="BLOCKS".equals(input.type())?input.scope():"FINISH";
        if(scope==null || !Set.of("START","FINISH").contains(scope)) throw new IllegalArgumentException("请选择限制开始或限制完成");
        Map<String,Object> from=item(line,id),to=item(line,input.targetId());
        if ("WORK_ORDER".equals(Objects.toString(from.get("sourceType"),"")) || "WORK_ORDER".equals(Objects.toString(to.get("sourceType"),"")))
            throw conflict("协助事项下游任务的来源关联固定，不允许新增工作项关联");
        editable(line,from); editable(line,to);
        if("BLOCKS".equals(input.type()) && terminal(to)) throw conflict("已结束工作项不能新增阻塞依赖");
        if("FOUND_DEFECT".equals(input.type()) && (!"test".equals(from.get("category")) || !"bug".equals(to.get("category")))) throw new IllegalArgumentException("发现缺陷关系必须从测试指向缺陷");
        String source=id,target=input.targetId();
        if("RELATES_TO".equals(input.type()) && source.compareTo(target)>0) { String swap=source; source=target; target=swap; }
        Map<String,Object> existing=null;
        for(Map<String,Object> row:rows(line)) if(source.equals(row.get("sourceId")) && target.equals(row.get("targetId")) && input.type().equals(row.get("type"))) existing=row;
        if(existing!=null && !enabled(existing.get("deleted"))) {
            if(!scope.equals(existing.get("scope"))) throw conflict("关系已存在且限制不同，请先移除再创建");
            return existing;
        }
        Map<String,List<Blocker>> before=snapshot(line);
        boolean during="FOUND_DEFECT".equals(input.type()) && !terminal(from);
        String relationId=existing==null?UUID.randomUUID().toString():existing.get("id").toString();
        if(existing==null) mapper.insert(RequestContext.tenantId(),line,relationId,source,target,input.type(),scope,during,RequestContext.userId());
        else mapper.change(RequestContext.tenantId(),line,relationId,((Number)existing.get("revision")).intValue(),false,scope,during,RequestContext.userId());
        recordChanges(line,before);
        audit(line,source,target,"WORK_ITEM_RELATION_CREATED",relationId);
        return rows(line).stream().filter(row->relationId.equals(row.get("id"))).findFirst().orElseThrow();
    }
    @Transactional public void delete(String line,String id,String relationId,int revision) {
        access.check(line,true); item(line,id);
        Map<String,Object> relation=rows(line).stream().filter(row->relationId.equals(row.get("id")) && (id.equals(row.get("sourceId")) || id.equals(row.get("targetId")))).findFirst().orElseThrow(WorkItemRelationService::missing);
        if(enabled(relation.get("deleted"))) return;
        if("REQUIRES_REGRESSION".equals(relation.get("type"))) throw conflict("回归关系不能直接移除，请完成关联测试任务");
        String from=relation.get("sourceId").toString(),to=relation.get("targetId").toString();
        if ("WORK_ORDER".equals(Objects.toString(item(line,from).get("sourceType"),"")) || "WORK_ORDER".equals(Objects.toString(item(line,to).get("sourceType"),"")))
            throw conflict("协助事项下游任务的来源关联固定，不允许删除关联");
        editable(line,item(line,from)); editable(line,item(line,to));
        if(revision!=((Number)relation.get("revision")).intValue()) throw conflict("关系已变化，请刷新后重试");
        var before=snapshot(line);
        if(mapper.change(RequestContext.tenantId(),line,relationId,revision,true,relation.get("scope").toString(),enabled(relation.get("duringTesting")),RequestContext.userId())!=1) throw conflict("关系已变化");
        recordChanges(line,before); audit(line,from,to,"WORK_ITEM_RELATION_REMOVED",relationId);
    }
    Map<String,List<Blocker>> snapshot(String line) { return new WorkItemDependencyGraph(mapper.items(RequestContext.tenantId(),line),rows(line)).snapshot(); }
    void recordChanges(String line,Map<String,List<Blocker>> before) {
        snapshot(line).forEach((id,blockers)-> {
            List<Blocker> previous=before.getOrDefault(id,List.of());
            if(previous.equals(blockers)) return;
            mapper.touch(RequestContext.tenantId(),line,id,RequestContext.userId());
            storage.activity(RequestContext.tenantId(),line,id,blockers.isEmpty()?"WORK_ITEM_UNBLOCKED":"WORK_ITEM_BLOCKERS_CHANGED",configurations.encode(Map.of("before",previous,"after",blockers)),RequestContext.userId());
        });
        completion.reconcile(line);
    }
    private List<Map<String,Object>> rows(String line) { return mapper.relations(RequestContext.tenantId(),line); }
    private Map<String,Object> item(String line,String id) { Map<String,Object> item=storage.item(RequestContext.tenantId(),line,id); if(item==null) throw missing(); return item; }
    private void editable(String line,Map<String,Object> item) {
        if(item.get("versionId")==null) return;
        Map<String,Object> version=storage.version(RequestContext.tenantId(),line,item.get("versionId").toString());
        if(version==null || "已发布".equals(version.get("status"))) throw conflict("关联版本不存在或已发布，只读");
    }
    private void audit(String line,String from,String to,String event,String id) {
        String json=configurations.encode(Map.of("relationId",id,"sourceId",from,"targetId",to));
        storage.activity(RequestContext.tenantId(),line,from,event,json,RequestContext.userId());
        storage.activity(RequestContext.tenantId(),line,to,event,json,RequestContext.userId());
    }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"工作项或关系不存在"); }
}

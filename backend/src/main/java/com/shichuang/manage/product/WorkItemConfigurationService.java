package com.shichuang.manage.product;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;

@Service
@Transactional(readOnly=true)
public class WorkItemConfigurationService {
    private final WorkItemStorageMapper mapper;
    private final WorkItemAccess access;
    private final ObjectMapper json;
    public WorkItemConfigurationService(WorkItemStorageMapper mapper,WorkItemAccess access,ObjectMapper json) {
        this.mapper=mapper; this.access=access; this.json=json;
    }
    public List<Map<String,Object>> workflows(String line) {
        access.check(line,false);
        return mapper.workflows(RequestContext.tenantId(),line).stream().map(this::view).toList();
    }
    @Transactional public Map<String,Object> save(String line,String id,SaveWorkflow body) {
        access.check(line,true);
        category(body.category()); required(body.name(),"流程名称",128); validate(body.definition());
        validateApproval(line,body.category(),body.definition(),false);
        String tenant=RequestContext.tenantId(), user=RequestContext.userId();
        if (id==null) {
            id=UUID.randomUUID().toString();
            mapper.insertWorkflow(tenant,line,id,body.category(),body.name().trim(),encode(body.definition()),user);
        } else {
            Map<String,Object> current=requireWorkflow(line,id);
            if (!"DRAFT".equals(current.get("status"))) throw conflict("已发布流程不能修改，请创建新版本");
            if (!body.category().equals(current.get("category"))) throw new IllegalArgumentException("流程分类不能修改");
            if (body.revision()==null || mapper.updateWorkflow(tenant,line,id,body.revision(),body.name().trim(),encode(body.definition()),user)!=1)
                throw conflict("流程已变更，请刷新后重试");
        }
        mapper.activity(tenant,line,id,"WORKFLOW_SAVED",encode(Map.of("name",body.name())),user);
        return view(requireWorkflow(line,id));
    }
    @Transactional public Map<String,Object> publish(String line,String id,int revision) {
        access.check(line,true);
        Map<String,Object> current=requireWorkflow(line,id);
        if ("PUBLISHED".equals(current.get("status"))) return view(current);
        validate(decode(current.get("definition")));
        validateApproval(line,current.get("category").toString(),decode(current.get("definition")),true);
        if (mapper.publish(RequestContext.tenantId(),line,id,revision,RequestContext.userId())!=1) throw conflict("流程已变更，请刷新后重试");
        mapper.activity(RequestContext.tenantId(),line,id,"WORKFLOW_PUBLISHED","{}",RequestContext.userId());
        return view(requireWorkflow(line,id));
    }
    public List<Map<String,Object>> childRules(String line) { access.check(line,false); return mapper.childRules(RequestContext.tenantId(),line); }
    private void validateApproval(String line,String category,Workflow workflow,boolean publishing) {
        for (Edge edge:workflow.transitions()) {
            if(edge.autoComplete() && !"requirement".equals(category)) throw new IllegalArgumentException("自动完成仅适用于需求分类");
            ApprovalTasks tasks=edge.approvalTasks();
            if (tasks==null) continue;
            if (!"requirement".equals(category)) throw new IllegalArgumentException("只有需求流程支持评审自动下发");
            Map<String,String> types=Map.of("design",tasks.designTypeId(),"dev",tasks.devTypeId(),"test",tasks.testTypeId());
            types.forEach((kind,type)-> {
                requireType(line,type,kind,true);
                if (publishing && mapper.publishedWorkflow(RequestContext.tenantId(),line,kind)==null)
                    throw conflict("请先发布"+CATEGORIES.get(kind)+"分类流程");
            });
        }
    }
    @Transactional public List<Map<String,Object>> childRule(String line,ChildRule rule) {
        access.check(line,true);
        requireType(line,rule.parentTypeId(),null,rule.enabled());
        requireType(line,rule.childTypeId(),null,rule.enabled());
        mapper.childRule(RequestContext.tenantId(),line,rule.parentTypeId(),rule.childTypeId(),rule.enabled(),RequestContext.userId());
        mapper.activity(RequestContext.tenantId(),line,rule.parentTypeId(),"CHILD_RULE_CHANGED",encode(rule),RequestContext.userId());
        return mapper.childRules(RequestContext.tenantId(),line);
    }
    Map<String,Object> requireType(String line,String id,String category,boolean requireEnabled) {
        required(id,"任务类型",36);
        Map<String,Object> type=mapper.type(RequestContext.tenantId(),line,id);
        if (type==null || (requireEnabled && !enabled(type.get("enabled")))) throw new IllegalArgumentException("任务类型不存在或已停用");
        if (category!=null && !CATEGORIES.get(category).equals(type.get("category"))) throw new IllegalArgumentException("任务类型不属于当前分类");
        return type;
    }
    public Map<String,Object> requireTypeForLegacy(String line,String id,String category) {
        return requireType(line,id,category,true);
    }
    Map<String,Object> requireWorkflow(String line,String id) {
        Map<String,Object> value=mapper.workflow(RequestContext.tenantId(),line,id);
        if (value==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"流程不存在");
        return value;
    }
    Workflow decode(Object value) {
        try { return json.readValue(Objects.toString(value,""),Workflow.class); }
        catch (JsonProcessingException error) { throw new IllegalStateException("流程配置无法读取",error); }
    }
    String encode(Object value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException error) { throw new IllegalArgumentException("配置内容无法保存",error); }
    }
    private Map<String,Object> view(Map<String,Object> row) {
        Map<String,Object> result=new LinkedHashMap<>(row); result.put("definition",decode(row.get("definition"))); return result;
    }
    static boolean enabled(Object value) { return Boolean.TRUE.equals(value) || (value instanceof Number n && n.intValue()==1); }
    static ResponseStatusException conflict(String reason) { return new ResponseStatusException(HttpStatus.CONFLICT,reason); }
}

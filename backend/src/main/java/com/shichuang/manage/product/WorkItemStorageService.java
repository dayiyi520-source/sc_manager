package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static com.shichuang.manage.product.WorkItemConfigurationService.conflict;

@Service
@Transactional(readOnly=true)
public class WorkItemStorageService {
    private final WorkItemStorageMapper mapper;
    private final WorkItemAccess access;
    private final WorkItemConfigurationService configurations;
    public WorkItemStorageService(WorkItemStorageMapper mapper,WorkItemAccess access,WorkItemConfigurationService configurations) {
        this.mapper=mapper; this.access=access; this.configurations=configurations;
    }
    @Transactional public Map<String,Object> create(CreateItem body) {
        access.check(body.productLineId(),true);
        category(body.category()); required(body.title(),"标题",255); required(body.requestId(),"请求标识",64);
        if (body.priority()==null || !Set.of("P0","P1","P2","P3").contains(body.priority())) throw new IllegalArgumentException("优先级必须为P0至P3");
        if ((body.description()!=null && body.description().length()>200000) || (body.expectedGoal()!=null && body.expectedGoal().length()>10000))
            throw new IllegalArgumentException("描述或验收目标超出长度限制");
        if (body.plannedStartDate()!=null && body.plannedEndDate()!=null && body.plannedEndDate().isBefore(body.plannedStartDate())) throw new IllegalArgumentException("计划完成日期不能早于开始日期");
        if (body.estimatedHours()!=null && (body.estimatedHours().signum()<0 || body.estimatedHours().compareTo(new java.math.BigDecimal("99999999.99"))>0 || body.estimatedHours().scale()>2))
            throw new IllegalArgumentException("预计工时须为非负数，最多两位小数且不超过99999999.99");
        if (body.actualHours()!=null && (body.actualHours().signum()<0 || body.actualHours().compareTo(new java.math.BigDecimal("99999999.99"))>0 || body.actualHours().scale()>2))
            throw new IllegalArgumentException("实际工时须为非负数，最多两位小数且不超过99999999.99");
        String line=body.productLineId(),tenant=RequestContext.tenantId(),user=RequestContext.userId();
        String hash=hash(configurations.encode(body));
        Map<String,Object> duplicate=mapper.request(tenant,line,body.requestId());
        if (duplicate!=null) {
            if (!hash.equals(duplicate.get("requestHash")) || !user.equals(duplicate.get("creatorId"))) throw conflict("请求标识已被其他内容使用");
            return requireItem(line,duplicate.get("id").toString());
        }
        configurations.requireType(line,body.taskTypeId(),body.category(),true);
        String parentId=optional(body.parentWorkItemId()), requirementId=optional(body.requirementId()), versionId=optional(body.versionId());
        if (parentId!=null) {
            Map<String,Object> parent=requireItem(line,parentId);
            if (Set.of("COMPLETED","CANCELLED").contains(parent.get("statusGroup"))) throw conflict("已结束任务不能新增子任务");
            if (!mapper.childAllowed(tenant,line,parent.get("taskTypeId").toString(),body.taskTypeId())) throw new IllegalArgumentException("产品线未允许该父子任务类型组合");
            String inheritedVersion=optional(Objects.toString(parent.get("versionId"),null));
            String inheritedRequirement=optional(Objects.toString(parent.get("requirementId"),null));
            if (inheritedRequirement==null && "requirement".equals(parent.get("category"))) inheritedRequirement=parentId;
            if (versionId!=null && !versionId.equals(inheritedVersion)) throw new IllegalArgumentException("子任务必须继承父任务版本");
            if (requirementId!=null && !requirementId.equals(inheritedRequirement)) throw new IllegalArgumentException("子任务必须继承父任务需求");
            versionId=inheritedVersion; requirementId=inheritedRequirement;
        }
        if (requirementId!=null) {
            Map<String,Object> requirement=mapper.item(tenant,line,requirementId);
            if (requirement==null || !"requirement".equals(requirement.get("category")))
                throw new IllegalArgumentException("关联需求不存在或不属于当前产品线");
        }
        if (versionId!=null) {
            Map<String,Object> version=mapper.version(tenant,line,versionId);
            if (version==null) throw new IllegalArgumentException("版本不存在或不属于当前产品线");
            if ("已发布".equals(version.get("status"))) throw conflict("已发布版本只读");
        }
        String assigneeId=optional(body.assigneeId());
        String assigneeName=assigneeId==null?null:mapper.assignee(tenant,assigneeId);
        if (assigneeId!=null && assigneeName==null) throw new IllegalArgumentException("负责人不存在或已停用");
        Map<String,Object> workflow=mapper.publishedWorkflow(tenant,line,body.category(),body.taskTypeId());
        if (workflow==null) throw conflict("请先发布该工作项类型的状态配置");
        Workflow definition=configurations.decode(workflow.get("definition"));
        State initial=definition.states().stream().filter(State::initial).findFirst().orElseThrow();
        String id=UUID.randomUUID().toString(),code="WI-"+id;
        mapper.insertItem(tenant,id,code,body,versionId,requirementId,parentId,assigneeName,workflow.get("id").toString(),initial,hash,user);
        mapper.activity(tenant,line,id,"WORK_ITEM_CREATED",configurations.encode(Map.of("title",body.title(),"category",body.category())),user);
        return requireItem(line,id);
    }
    public Map<String,Object> detail(String line,String id) { access.check(line,false); requireItem(line,id); return mapper.timedItem(RequestContext.tenantId(),line,id); }
    public List<Map<String,Object>> activities(String line,String id) { access.check(line,false); requireItem(line,id); return mapper.activities(RequestContext.tenantId(),line,id); }
    @Transactional public Map<String,Object> update(String line,String id,UpdateItem body) {
        access.check(line,true);
        Map<String,Object> item=requireItem(line,id);
        if (body.revision()==null || body.revision()!=((Number)item.get("revision")).intValue()) throw conflict("任务已被其他人修改，请刷新后重试");
        if (body.title()!=null) required(body.title(),"标题",255);
        if (body.description()!=null && body.description().length()>200000) throw new IllegalArgumentException("描述超出长度限制");
        if (body.expectedGoal()!=null && body.expectedGoal().length()>10000) throw new IllegalArgumentException("验收目标超出长度限制");
        if (body.priority()!=null && !Set.of("P0","P1","P2","P3").contains(body.priority())) throw new IllegalArgumentException("优先级必须为P0至P3");
        if (body.plannedStartDate()!=null && body.plannedEndDate()!=null && body.plannedEndDate().isBefore(body.plannedStartDate())) throw new IllegalArgumentException("计划完成日期不能早于开始日期");
        validateHours(body.estimatedHours(),"预计工时");
        validateHours(body.actualHours(),"实际工时");
        String versionId=optional(body.versionId());
        if (versionId!=null && mapper.version(RequestContext.tenantId(),line,versionId)==null) throw new IllegalArgumentException("版本不存在或不属于当前产品线");
        String assigneeId=null,assigneeName=body.assigneeName();
        if (assigneeName!=null && !assigneeName.isBlank()) {
            Map<String,Object> assignee=mapper.assigneeByName(RequestContext.tenantId(),assigneeName.trim());
            if (assignee==null) throw new IllegalArgumentException("负责人不存在或已停用");
            assigneeId=assignee.get("id").toString(); assigneeName=assignee.get("name").toString();
        }
        int updated=mapper.updateItem(RequestContext.tenantId(),line,id,body,versionId,assigneeId,assigneeName,RequestContext.userId());
        if(updated!=1) throw conflict("任务已变化，请刷新后重试");
        mapper.activity(RequestContext.tenantId(),line,id,"WORK_ITEM_UPDATED",configurations.encode(Map.of("revision",body.revision())),RequestContext.userId());
        return requireItem(line,id);
    }
    @Transactional public void delete(String line,String id,int revision) {
        access.check(line,true);
        Map<String,Object> item=requireItem(line,id);
        if(mapper.hasChildren(RequestContext.tenantId(),line,id)) throw conflict("请先处理该任务下的子任务");
        if(revision!=((Number)item.get("revision")).intValue()) throw conflict("任务已被其他人修改，请刷新后重试");
        if(mapper.softDelete(RequestContext.tenantId(),line,id,revision,RequestContext.userId())!=1) throw conflict("任务已变化，请刷新后重试");
    }
    private Map<String,Object> requireItem(String line,String id) {
        Map<String,Object> item=mapper.item(RequestContext.tenantId(),line,id);
        if (item==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"统一工作项不存在");
        return item;
    }
    private static void validateHours(java.math.BigDecimal value,String label) {
        if(value!=null && (value.signum()<0 || value.compareTo(new java.math.BigDecimal("99999999.99"))>0 || value.scale()>2))
            throw new IllegalArgumentException(label+"须为非负数，最多两位小数且不超过99999999.99");
    }
    private static String hash(String input) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
}

package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;
import static com.shichuang.manage.product.WorkItemConfigurationService.conflict;

@Service
@Transactional(readOnly=true)
public class WorkItemRegressionService {
    public record CreateRegression(String requestId,Integer revision,String taskTypeId,String title,String versionId,String assigneeId,LocalDate plannedEndDate) {}
    private final WorkItemStorageService storage;
    private final WorkItemStorageMapper mapper;
    private final WorkItemOriginMapper origins;
    private final WorkItemRelationMapper relationMapper;
    private final WorkItemRelationService relations;
    private final WorkItemConfigurationService configurations;
    private final WorkItemAccess access;
    public WorkItemRegressionService(WorkItemStorageService storage,WorkItemStorageMapper mapper,WorkItemOriginMapper origins,
        WorkItemRelationMapper relationMapper,WorkItemRelationService relations,WorkItemConfigurationService configurations,WorkItemAccess access) {
        this.storage=storage; this.mapper=mapper; this.origins=origins; this.relationMapper=relationMapper;
        this.relations=relations; this.configurations=configurations; this.access=access;
    }
    @Transactional public Map<String,Object> onlineIssue(CreateItem input) {
        access.check(input.productLineId(),true);
        if(!"bug".equals(input.category()) || optional(input.parentWorkItemId())!=null) throw new IllegalArgumentException("线上问题须为独立缺陷工作项");
        String fingerprint=hash(configurations.encode(input));
        Map<String,Object> retry=retry(input.productLineId(),input.requestId(),"ONLINE_ISSUE_RECORDED",fingerprint);
        if(retry!=null) return retry;
        var item=storage.create(input);
        String id=item.get("id").toString();
        origins.source(RequestContext.tenantId(),input.productLineId(),id,"ONLINE_ISSUE");
        mapper.activity(RequestContext.tenantId(),input.productLineId(),id,"ONLINE_ISSUE_RECORDED",configurations.encode(Map.of("fingerprint",fingerprint)),RequestContext.userId());
        return storage.detail(input.productLineId(),id);
    }
    @Transactional public Map<String,Object> create(String line,String bugId,CreateRegression input) {
        access.check(line,true); required(bugId,"缺陷",36);
        String fingerprint=hash(configurations.encode(Map.of("bugId",bugId,"input",input)));
        var retry=retry(line,input.requestId(),"DEFECT_REGRESSION_CREATED",fingerprint);
        if(retry!=null) return retry;
        Map<String,Object> bug=mapper.item(RequestContext.tenantId(),line,bugId);
        if(bug==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"缺陷不存在");
        if(!"bug".equals(bug.get("category"))) throw new IllegalArgumentException("只有缺陷可以转入回归测试");
        if(input.revision()==null || input.revision()<0) throw new IllegalArgumentException("请提交缺陷当前版本号");
        if(input.revision()!=((Number)bug.get("revision")).intValue()) throw conflict("缺陷已变化，请刷新后重试");
        if(WorkItemDependencyGraph.terminal(bug)) throw conflict("已结束缺陷不能新建回归任务，请先按流程重开");
        if(bug.get("versionId")!=null) {
            var version=mapper.version(RequestContext.tenantId(),line,bug.get("versionId").toString());
            if(version==null || "已发布".equals(version.get("status"))) throw conflict("缺陷所属版本不存在或已发布，只读");
        }
        if(origins.hasPendingRegression(RequestContext.tenantId(),line,bugId)) throw conflict("已有未通过的回归任务，请继续处理原任务");
        var before=relations.snapshot(line);
        var test=storage.create(new CreateItem(input.requestId(),line,"test",input.taskTypeId(),input.title(),
            Objects.toString(bug.get("description"),null),Objects.toString(bug.get("expectedGoal"),null),input.versionId(),
            Objects.toString(bug.get("requirementId"),null),null,input.assigneeId(),bug.get("priority").toString(),null,input.plannedEndDate(),null));
        String id=test.get("id").toString(),tenant=RequestContext.tenantId(),user=RequestContext.userId();
        origins.source(tenant,line,id,"DEFECT_REGRESSION");
        relationMapper.insert(tenant,line,UUID.randomUUID().toString(),bugId,id,"REQUIRES_REGRESSION","FINISH",false,user);
        mapper.activity(tenant,line,id,"DEFECT_REGRESSION_CREATED",configurations.encode(Map.of("bugId",bugId,"fingerprint",fingerprint)),user);
        mapper.activity(tenant,line,bugId,"REGRESSION_REQUESTED",configurations.encode(Map.of("testId",id)),user);
        relations.recordChanges(line,before);
        return storage.detail(line,id);
    }
    private Map<String,Object> retry(String line,String requestId,String event,String fingerprint) {
        required(requestId,"请求标识",64);
        var duplicate=mapper.request(RequestContext.tenantId(),line,requestId);
        if(duplicate==null) return null;
        String id=duplicate.get("id").toString();
        if(!RequestContext.userId().equals(duplicate.get("creatorId")) || !fingerprint.equals(origins.fingerprint(RequestContext.tenantId(),line,id,event)))
            throw conflict("请求标识已被其他内容或操作使用");
        return storage.detail(line,id);
    }
    private static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
}

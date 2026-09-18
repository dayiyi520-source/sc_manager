package com.shichuang.manage.product;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import static com.shichuang.manage.product.TestExecutionDefinition.*;

@Service
@Transactional(readOnly=true)
public class TestExecutionService {
    private static final Set<String> EVIDENCE_TYPES=Set.of("image/png","image/jpeg","image/webp","text/plain","application/pdf","application/json");
    private final TestExecutionMapper mapper; private final WorkItemAccess access; private final WorkItemStorageMapper storage;
    private final WorkItemRelationService relations; private final ObjectMapper json;
    public TestExecutionService(TestExecutionMapper mapper,WorkItemAccess access,WorkItemStorageMapper storage,WorkItemRelationService relations,ObjectMapper json){this.mapper=mapper;this.access=access;this.storage=storage;this.relations=relations;this.json=json;}

    public Map<String,Object> plan(String workItem){Map<String,Object> item=requireItem(workItem,false);Map<String,Object> plan=mapper.plan(RequestContext.tenantId(),workItem);return planView(item,plan);}
    @Transactional public Map<String,Object> savePlan(String workItem,SavePlan input){
        Map<String,Object> item=requireExecutable(workItem,true);String tenant=RequestContext.tenantId(),line=item.get("productLineId").toString();
        List<String> ids=input.testCaseIds()==null?List.of():input.testCaseIds().stream().filter(Objects::nonNull).distinct().toList();for(String id:ids)requireEnabledCase(tenant,line,id);
        Map<String,Object> plan=mapper.plan(tenant,workItem);String planId;
        if(plan==null){if(input.revision()!=null&&input.revision()!=0)throw conflict("测试计划已变化，请刷新后重试");planId=UUID.randomUUID().toString();mapper.insertPlan(tenant,planId,item,input.environment(),RequestContext.userId());}
        else{planId=plan.get("id").toString();if(input.revision()==null||mapper.updatePlan(tenant,planId,input.revision(),input.environment(),RequestContext.userId())!=1)throw conflict("测试计划已变化，请刷新后重试");}
        mapper.replacePlanCases(tenant,planId,ids,RequestContext.userId());return plan(workItem);
    }
    public List<Map<String,Object>> executions(String workItem){requireExecutable(workItem,false);return mapper.executions(RequestContext.tenantId(),workItem);}
    @Transactional public Map<String,Object> createExecution(String workItem,CreateExecution input){
        Map<String,Object> item=requireExecutable(workItem,true);String tenant=RequestContext.tenantId(),line=item.get("productLineId").toString();Map<String,Object> plan=mapper.plan(tenant,workItem);if(plan==null)throw bad("请先创建测试计划");
        List<Map<String,Object>> planCases=mapper.planCases(tenant,plan.get("id").toString());if(planCases.isEmpty())throw bad("测试计划尚未选择用例");
        String request=required(input.requestId(),"请求标识",64),payload=input.scopeType()+"|"+Objects.toString(input.testCaseIds(),"")+"|"+Objects.toString(input.name(),"")+"|"+Objects.toString(input.environment(),"")+"|"+Objects.toString(input.buildVersion(),"");String hash=hash(payload);
        Map<String,Object> prior=mapper.executionRequest(tenant,workItem,request);if(prior!=null){if(!hash.equals(prior.get("requestHash")))throw conflict("请求标识已用于其他执行轮次");return execution(prior.get("id").toString());}
        List<String> ids=switch(input.scopeType()==null?ScopeType.ALL:input.scopeType()){
            case ALL->planCases.stream().map(v->v.get("testCaseId").toString()).toList();
            case CUSTOM->{List<String>wanted=input.testCaseIds()==null?List.of():input.testCaseIds().stream().distinct().toList();Set<String>allowed=new HashSet<>(planCases.stream().map(v->v.get("testCaseId").toString()).toList());if(wanted.isEmpty()||!allowed.containsAll(wanted))throw bad("自定义范围包含计划外用例或未选择用例");yield wanted;}
            case FAILED_ONLY->{Map<String,Object> previous=mapper.previousEnded(tenant,plan.get("id").toString());if(previous==null)throw bad("没有可回归的历史轮次");List<String>failed=mapper.failedCaseIds(tenant,previous.get("id").toString());if(failed.isEmpty())throw bad("上一轮没有失败用例");yield failed;}
        };
        int round=mapper.nextRound(tenant,plan.get("id").toString());String id=UUID.randomUUID().toString();String name=blank(input.name())==null?"第"+round+"轮测试":input.name().trim();
        mapper.insertExecution(tenant,id,plan.get("id").toString(),workItem,line,round,name,(input.scopeType()==null?ScopeType.ALL:input.scopeType()).name(),blank(input.environment())==null?Objects.toString(plan.get("environment"),null):input.environment().trim(),blank(input.buildVersion()),RequestContext.userId(),RequestContext.operatorName(),request,hash,RequestContext.userId());
        int sort=0;for(String caseId:ids){Map<String,Object> c=requireEnabledCase(tenant,line,caseId);try{mapper.insertExecutionCase(tenant,UUID.randomUUID().toString(),id,c,++sort,json.writeValueAsString(mapper.testCaseSteps(tenant,caseId)),RequestContext.userId());}catch(Exception e){throw new IllegalStateException("测试用例快照生成失败",e);}}
        return execution(id);
    }
    public Map<String,Object> execution(String id){
        String tenant=RequestContext.tenantId();Map<String,Object> execution=mapper.execution(tenant,id);if(execution==null)throw missing("测试执行不存在");access.check(execution.get("productLineId").toString(),false);
        List<Map<String,Object>> cases=mapper.executionCases(tenant,id);for(Map<String,Object> c:cases){try{c.put("steps",json.readValue(Objects.toString(c.get("steps"),"[]"),List.class));}catch(Exception e){c.put("steps",List.of());}c.put("evidence",mapper.evidence(tenant,c.get("id").toString()));c.put("defects",mapper.defects(tenant,c.get("id").toString()));}
        Map<String,Object> result=new LinkedHashMap<>(execution);result.put("cases",cases);result.put("total",cases.size());result.put("passed",cases.stream().filter(v->"PASSED".equals(v.get("result"))).count());result.put("failed",cases.stream().filter(v->"FAILED".equals(v.get("result"))).count());result.put("notExecuted",cases.stream().filter(v->"NOT_EXECUTED".equals(v.get("result"))).count());return result;
    }
    @Transactional public Map<String,Object> saveResult(String id,SaveResult input){
        Map<String,Object> row=requireResult(id,true);if(!"IN_PROGRESS".equals(row.get("executionStatus")))throw conflict("已结束或已取消的执行轮次不可修改");if(input.result()==null||input.result()==ResultStatus.NOT_EXECUTED)throw bad("请选择通过或失败");
        String actual=blank(input.actualResult());if(input.result()==ResultStatus.FAILED&&actual==null)throw bad("失败时必须填写实际结果");List<EvidenceInput> evidence=input.evidence()==null?List.of():input.evidence();evidence.forEach(this::validateEvidence);
        if(input.revision()==null||mapper.updateResult(RequestContext.tenantId(),id,input.revision(),input.result().name(),actual,RequestContext.userId(),RequestContext.operatorName(),RequestContext.userId())!=1)throw conflict("执行结果已被其他人修改，请刷新后重试");mapper.replaceEvidence(RequestContext.tenantId(),id,evidence,RequestContext.userId());return execution(row.get("executionId").toString());
    }
    @Transactional public Map<String,Object> end(String id,int revision){Map<String,Object> execution=mapper.execution(RequestContext.tenantId(),id);if(execution==null)throw missing("测试执行不存在");access.check(execution.get("productLineId").toString(),true);long remaining=mapper.executionCases(RequestContext.tenantId(),id).stream().filter(v->"NOT_EXECUTED".equals(v.get("result"))).count();if(remaining>0)throw conflict("仍有"+remaining+"条用例未执行");if(mapper.endExecution(RequestContext.tenantId(),id,revision,RequestContext.userId())!=1)throw conflict("执行轮次已变化，请刷新后重试");return execution(id);}
    @Transactional public Map<String,Object> linkDefect(String resultId,LinkDefect input){
        Map<String,Object> result=requireResult(resultId,true);if(!"FAILED".equals(result.get("result")))throw bad("只有失败结果可以关联缺陷");if(input.revision()==null||input.revision()!=((Number)result.get("revision")).intValue())throw conflict("执行结果已变化，请刷新后重试");
        String tenant=RequestContext.tenantId(),line=result.get("productLineId").toString();Map<String,Object> defect=mapper.item(tenant,required(input.defectWorkItemId(),"缺陷",36));if(defect==null||!"bug".equals(defect.get("category"))||!line.equals(defect.get("productLineId")))throw bad("缺陷不存在或不属于当前产品线");Map<String,Object> test=mapper.item(tenant,result.get("workItemId").toString());if(!Objects.equals(test.get("requirementId"),defect.get("requirementId")))throw bad("缺陷与测试任务不属于同一需求");
        try{mapper.insertDefectLink(tenant,line,resultId,input.defectWorkItemId(),RequestContext.userId());relations.create(line,test.get("id").toString(),new WorkItemRelationService.CreateRelation(input.defectWorkItemId(),"FOUND_DEFECT",null));}catch(DataIntegrityViolationException e){throw conflict("该缺陷已经关联当前失败结果");}
        return execution(result.get("executionId").toString());
    }
    public Map<String,Object> overview(String workItem){
        Map<String,Object> root=requireItem(workItem,false);String tenant=RequestContext.tenantId();List<Map<String,Object>> children=mapper.descendants(tenant,workItem);List<Map<String,Object>> targets=new ArrayList<>();targets.add(root);targets.addAll(children);
        List<Map<String,Object>> latestExecutions=new ArrayList<>();Set<String>caseIds=new HashSet<>();Map<String,Map<String,Object>> defects=new LinkedHashMap<>();Map<String,Map<String,Object>> latestDefects=new LinkedHashMap<>();
        for(Map<String,Object> child:targets){
            String childId=child.get("id").toString();Map<String,Object> plan=mapper.plan(tenant,childId);
            if(plan!=null)mapper.planCases(tenant,plan.get("id").toString()).forEach(v->caseIds.add(v.get("testCaseId").toString()));
            mapper.defectsForWorkItem(tenant,childId).forEach(defect->defects.put(defect.get("id").toString(),defect));
            Map<String,Object> latest=mapper.latestEndedExecution(tenant,childId);if(latest==null)continue;
            mapper.executionCases(tenant,latest.get("id").toString()).forEach(result->mapper.defects(tenant,result.get("id").toString()).forEach(defect->latestDefects.put(defect.get("id").toString(),defect)));
            latestExecutions.add(latest);
        }
        long total=latestExecutions.stream().mapToLong(v->num(v,"total")).sum(),passed=latestExecutions.stream().mapToLong(v->num(v,"passed")).sum(),failed=latestExecutions.stream().mapToLong(v->num(v,"failed")).sum(),unexecuted=latestExecutions.stream().mapToLong(v->num(v,"notExecuted")).sum();
        long incomplete=children.stream().filter(v->!enabled(v.get("successful"))).count();long blockingDefects=latestDefects.values().stream().filter(d->Set.of("P0","P1").contains(Objects.toString(d.get("priority"),""))&&!enabled(d.get("successful"))).count();
        List<String> blockers=new ArrayList<>();if(incomplete>0)blockers.add("REQUIRED_CHILD_INCOMPLETE");if(unexecuted>0)blockers.add("UNEXECUTED_CASES");if(blockingDefects>0)blockers.add("OPEN_BLOCKING_DEFECTS");
        String conclusion=!blockers.isEmpty()?"NOT_PASSED":latestDefects.isEmpty()?"PASSED":"CONDITIONAL_PASS";
        Map<String,Object> out=new LinkedHashMap<>();out.put("workItemId",root.get("id"));out.put("childCount",children.size());out.put("completedChildCount",children.size()-incomplete);out.put("caseCount",caseIds.size());out.put("executionCount",latestExecutions.size());out.put("total",total);out.put("passed",passed);out.put("failed",failed);out.put("notExecuted",unexecuted);out.put("defectCount",defects.size());out.put("blockingDefectCount",blockingDefects);out.put("conclusion",conclusion);out.put("blockers",blockers);out.put("defects",List.copyOf(defects.values()));out.put("children",children);return out;
    }
    private Map<String,Object> planView(Map<String,Object> item,Map<String,Object> plan){Map<String,Object> out=new LinkedHashMap<>();out.put("workItemId",item.get("id"));out.put("executable",true);if(plan==null){out.put("id",null);out.put("revision",0);out.put("environment","");out.put("cases",List.of());}else{out.putAll(plan);out.put("cases",mapper.planCases(RequestContext.tenantId(),plan.get("id").toString()));}return out;}
    private Map<String,Object> requireItem(String id,boolean write){Map<String,Object> item=mapper.item(RequestContext.tenantId(),id);if(item==null)throw missing("测试任务不存在");access.check(item.get("productLineId").toString(),write);if(!"test".equals(item.get("category")))throw bad("工作项不是测试分类");return item;}
    private Map<String,Object> requireExecutable(String id,boolean write){return requireItem(id,write);}
    private Map<String,Object> requireResult(String id,boolean write){Map<String,Object> row=mapper.result(RequestContext.tenantId(),id);if(row==null)throw missing("用例执行结果不存在");access.check(row.get("productLineId").toString(),write);return row;}
    private Map<String,Object> requireEnabledCase(String tenant,String line,String id){Map<String,Object> c=mapper.testCase(tenant,line,id);if(c==null||!enabled(c.get("enabled")))throw bad("测试用例不存在、已停用或不属于当前产品线");return c;}
    private void validateEvidence(EvidenceInput e){required(e.name(),"证据名称",255);if(!EVIDENCE_TYPES.contains(e.contentType()))throw bad("证据文件类型不支持");if(e.size()<0||e.size()>10L*1024*1024)throw bad("单个证据文件不能超过10MB");if(e.dataUrl()==null||!e.dataUrl().startsWith("data:"+e.contentType()+";base64,"))throw bad("证据内容格式无效");}
    private static String hash(String value){try{return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    private static String required(String value,String label,int max){String v=blank(value);if(v==null)throw bad("请填写"+label);if(v.length()>max)throw bad(label+"超出长度限制");return v;}
    private static String blank(String value){return value==null||value.trim().isEmpty()?null:value.trim();}
    private static boolean enabled(Object value){return value instanceof Boolean b?b:value instanceof Number n&&n.intValue()!=0;}
    private static long num(Map<String,Object> row,String key){return row.get(key)==null?0:((Number)row.get(key)).longValue();}
    private static IllegalArgumentException bad(String m){return new IllegalArgumentException(m);}private static ResponseStatusException conflict(String m){return new ResponseStatusException(HttpStatus.CONFLICT,m);}private static ResponseStatusException missing(String m){return new ResponseStatusException(HttpStatus.NOT_FOUND,m);}
}

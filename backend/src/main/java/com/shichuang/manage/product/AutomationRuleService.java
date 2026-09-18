package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;

@Service
@Transactional(readOnly=true)
public class AutomationRuleService {
    private final AutomationRuleMapper mapper;
    private final WorkItemAccess access;
    private final WorkItemConfigurationService configurations;
    private final WorkItemApprovalService approvals;
    public AutomationRuleService(AutomationRuleMapper mapper,WorkItemAccess access,WorkItemConfigurationService configurations,WorkItemApprovalService approvals){this.mapper=mapper;this.access=access;this.configurations=configurations;this.approvals=approvals;}
    public Map<String,Object> overview(String line,String keyword){access.check(line,false);return Map.of("enabled",mapper.setting(RequestContext.tenantId(),line),"rules",mapper.list(RequestContext.tenantId(),line,keyword));}
    public List<Map<String,Object>> logs(String line){access.check(line,false);return mapper.logs(RequestContext.tenantId(),line);}
    @Transactional public Map<String,Object> save(String line,String id,Map<String,Object> body){
        access.check(line,true); validate(line,body);
        String tenant=RequestContext.tenantId(),user=RequestContext.userId();
        if(id==null){id=UUID.randomUUID().toString();mapper.insert(tenant,line,id,body,user);}
        else {int revision=((Number)body.getOrDefault("revision",-1)).intValue();if(mapper.update(tenant,line,id,revision,body,user)!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"规则已被其他人修改，请刷新后重试");}
        return Objects.requireNonNull(mapper.one(tenant,line,id));
    }
    @Transactional public void delete(String line,String id){access.check(line,true);if(mapper.delete(RequestContext.tenantId(),line,id,RequestContext.userId())!=1)throw new NoSuchElementException("自动化规则不存在");}
    @Transactional public Map<String,Object> setting(String line,boolean enabled){access.check(line,true);mapper.setting(RequestContext.tenantId(),line,enabled,RequestContext.userId());return Map.of("enabled",enabled);}
    @Transactional public void statusChanged(String line,Map<String,Object> item){
        String tenant=RequestContext.tenantId(),workItemId=Objects.toString(item.get("id"),"");
        List<Map<String,Object>> rules=mapper.matching(tenant,line,Objects.toString(item.get("taskTypeId"),""),Objects.toString(item.get("statusKey"),""));
        for(Map<String,Object> rule:rules){
            if(!matches(rule,item)) continue;
            String action=Objects.toString(rule.get("actionType"),"");
            Map<String,Object> config=mapper.decodeConfig(rule.get("actionConfig"));
            switch(action){
                case "DISPATCH_REQUIREMENT_TASKS" -> approvals.dispatch(line,item,new WorkItemDefinition.ApprovalTasks(
                    Objects.toString(config.get("designTypeId"),""),Objects.toString(config.get("devTypeId"),""),Objects.toString(config.get("testTypeId"),"")));
                case "SET_ACTUAL_START_TIME" -> mapper.markActualStart(tenant,line,workItemId,RequestContext.userId());
                default -> {
                    mapper.log(tenant,line,Objects.toString(rule.get("id"),""),workItemId,"SKIPPED","当前版本尚未接入该动作的执行器："+action);
                    continue;
                }
            }
            mapper.log(tenant,line,Objects.toString(rule.get("id"),""),workItemId,"SUCCESS",Objects.toString(rule.get("name"),"")+"执行成功");
        }
    }
    private void validate(String line,Map<String,Object>b){
        String name=Objects.toString(b.get("name"),"").trim();if(name.isBlank()||name.length()>128)throw new IllegalArgumentException("规则名称不能为空且不能超过128字");b.put("name",name);
        if(!"STATUS_CHANGED".equals(b.get("triggerType")))throw new IllegalArgumentException("首版仅支持状态变化触发");
        String typeId=Objects.toString(b.get("triggerTypeId"),"");configurations.requireType(line,typeId,null,true);
        if(Objects.toString(b.get("triggerStateKey"),"").isBlank())throw new IllegalArgumentException("请选择触发状态");
        String conditionType=Objects.toString(b.getOrDefault("conditionType","NONE"));
        if(!Set.of("NONE","TASK_TYPE","PRIORITY","MULTI").contains(conditionType))throw new IllegalArgumentException("条件类型无效");
        if("MULTI".equals(conditionType)) {
            Object conditions=b.get("conditions");
            if(!(conditions instanceof List<?> list) || list.isEmpty()) throw new IllegalArgumentException("至少添加一个过滤条件");
            list.forEach(item -> { if(!(item instanceof Map<?,?> row) || Objects.toString(row.get("type"),"").isBlank() || Objects.toString(row.get("operator"),"").isBlank() || Objects.toString(row.get("value"),"").isBlank()) throw new IllegalArgumentException("过滤条件必须包含条件类型、逻辑判断和值"); });
            b.put("conditionValue", conditions);
        }
        String actionType=Objects.toString(b.get("actionType"));
        if(!Set.of("CREATE_SUBTASK","DERIVE_PARENT_STATUS","MULTI","DISPATCH_REQUIREMENT_TASKS","SET_ACTUAL_START_TIME").contains(actionType))throw new IllegalArgumentException("动作类型无效");
        if("DISPATCH_REQUIREMENT_TASKS".equals(actionType)){
            Map<String,Object> config=mapper.decodeConfig(b.get("actionConfig"));
            configurations.requireType(line,Objects.toString(config.get("designTypeId"),""),"design",true);
            configurations.requireType(line,Objects.toString(config.get("devTypeId"),""),"dev",true);
            configurations.requireType(line,Objects.toString(config.get("testTypeId"),""),"test",true);
        }
        if("MULTI".equals(actionType)) {
            Object actions=b.get("actions");
            if(!(actions instanceof List<?> list) || list.isEmpty()) throw new IllegalArgumentException("至少添加一个执行动作");
            list.forEach(item -> { if(!(item instanceof Map<?,?> row) || Objects.toString(row.get("type"),"").isBlank() || Objects.toString(row.get("result"),"").isBlank()) throw new IllegalArgumentException("执行动作必须包含动作类型和动作结果"); });
            b.put("actionConfig", Map.of("actions", actions));
        }
    }
    private boolean matches(Map<String,Object> rule,Map<String,Object> item){
        String condition=Objects.toString(rule.get("conditionType"),"NONE");
        if("NONE".equals(condition) || condition.isBlank()) return true;
        if("TASK_TYPE".equals(condition)) return Objects.equals(Objects.toString(item.get("taskTypeId"),""),Objects.toString(rule.get("conditionValue"),""));
        if("PRIORITY".equals(condition)) return Objects.equals(Objects.toString(item.get("priority"),""),Objects.toString(rule.get("conditionValue"),""));
        if(!"MULTI".equals(condition)) return false;
        Object raw=rule.get("conditionValue");
        List<?> conditions;
        try{conditions=new com.fasterxml.jackson.databind.ObjectMapper().readValue(Objects.toString(raw,"[]"),List.class);}
        catch(Exception error){throw new IllegalArgumentException("自动化过滤条件格式无效",error);}
        return conditions.stream().allMatch(value -> value instanceof Map<?,?> row && matchesCondition(row,item));
    }
    private boolean matchesCondition(Map<?,?> condition,Map<String,Object> item){
        String type=Objects.toString(condition.get("type"),""),operator=Objects.toString(condition.get("operator"),"EQUALS"),expected=Objects.toString(condition.get("value"),"");
        String actual="TASK_TYPE".equals(type)?Objects.toString(item.get("taskTypeId"),""):"PRIORITY".equals(type)?Objects.toString(item.get("priority"),""):"";
        return switch(operator){case "NOT_EQUALS" -> !actual.equals(expected);case "CONTAINS" -> actual.contains(expected);default -> actual.equals(expected);};
    }
}

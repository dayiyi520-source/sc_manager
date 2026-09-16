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
    public AutomationRuleService(AutomationRuleMapper mapper,WorkItemAccess access,WorkItemConfigurationService configurations){this.mapper=mapper;this.access=access;this.configurations=configurations;}
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
        if(!Set.of("CREATE_SUBTASK","DERIVE_PARENT_STATUS","MULTI").contains(actionType))throw new IllegalArgumentException("动作类型无效");
        if("MULTI".equals(actionType)) {
            Object actions=b.get("actions");
            if(!(actions instanceof List<?> list) || list.isEmpty()) throw new IllegalArgumentException("至少添加一个执行动作");
            list.forEach(item -> { if(!(item instanceof Map<?,?> row) || Objects.toString(row.get("type"),"").isBlank() || Objects.toString(row.get("result"),"").isBlank()) throw new IllegalArgumentException("执行动作必须包含动作类型和动作结果"); });
            b.put("actionConfig", Map.of("actions", actions));
        }
    }
}

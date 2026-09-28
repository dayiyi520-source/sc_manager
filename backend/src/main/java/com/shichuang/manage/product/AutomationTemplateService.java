package com.shichuang.manage.product;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class AutomationTemplateService {
 private final AutomationTemplateMapper mapper;
 private final WorkItemTemplateMapper types;
 private final AutomationRuleMapper productRules;
 private final ObjectMapper json;
 public AutomationTemplateService(AutomationTemplateMapper mapper,WorkItemTemplateMapper types,AutomationRuleMapper productRules,ObjectMapper json){this.mapper=mapper;this.types=types;this.productRules=productRules;this.json=json;}
 public Map<String,Object> overview(){AuthorizationService.requireRead("product");String tenant=RequestContext.tenantId();return Map.of("enabled",mapper.enabled(tenant),"rules",mapper.list(tenant));}
 @Transactional public Map<String,Object> setting(boolean enabled){AuthorizationService.requireWrite("product");mapper.setting(RequestContext.tenantId(),enabled,RequestContext.userId());return Map.of("enabled",enabled);}
 @Transactional public Map<String,Object> save(String id,Map<String,Object> input){
  AuthorizationService.requireWrite("product");String tenant=RequestContext.tenantId();Map<String,Object> body=validate(input);
  if(id==null){id=UUID.randomUUID().toString();mapper.insert(tenant,id,body,RequestContext.userId());}
  else {int revision=input.get("revision") instanceof Number number?number.intValue():-1;if(mapper.update(tenant,id,revision,body,RequestContext.userId())!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"规则已被其他人修改，请刷新后重试");}
  return Objects.requireNonNull(mapper.one(tenant,id));
 }
 @Transactional public void delete(String id){AuthorizationService.requireWrite("product");if(mapper.delete(RequestContext.tenantId(),id,RequestContext.userId())!=1)throw new NoSuchElementException("模板规则不存在");}
 public void requireUnreferenced(String typeId,Set<String> removedStates){
  for(Map<String,Object> rule:mapper.list(RequestContext.tenantId())){
   if(typeId.equals(rule.get("triggerTypeId"))&&(removedStates==null||removedStates.contains(rule.get("triggerStateKey"))))throw new IllegalArgumentException("工作项类型或状态已被自动化模板引用，请先修改规则");
   if(removedStates==null){Map<String,Object> config=productRules.decodeConfig(rule.get("actionConfig"));if(containsType(config,typeId)||containsType(decodeConditions(rule.get("conditionValue")),typeId))throw new IllegalArgumentException("工作项类型已被自动化模板引用，请先修改规则");}
  }
 }
 @Transactional public void copyToProduct(String line,Map<String,String> ids){
  String tenant=RequestContext.tenantId();productRules.setting(tenant,line,mapper.enabled(tenant),RequestContext.userId());
  for(Map<String,Object> original:mapper.list(tenant)){
   Map<String,Object> copy=new HashMap<>(original);
   copy.put("triggerTypeId",mapped(ids,original.get("triggerTypeId")));
   copy.put("actionConfig",remap(productRules.decodeConfig(original.get("actionConfig")),ids));
   if("TASK_TYPE".equals(original.get("conditionType")))copy.put("conditionValue",mapped(ids,original.get("conditionValue")));
   if("MULTI".equals(original.get("conditionType")))copy.put("conditionValue",encode(remap(decodeConditions(original.get("conditionValue")),ids)));
   productRules.insert(tenant,line,UUID.randomUUID().toString(),copy,RequestContext.userId());
  }
 }
 private Map<String,Object> validate(Map<String,Object> input){
  if(input==null)throw new IllegalArgumentException("规则不能为空");Map<String,Object> body=new HashMap<>(input);String name=Objects.toString(input.get("name"),"").trim();if(name.isEmpty()||name.length()>128)throw new IllegalArgumentException("规则名称不能为空且不能超过128字");body.put("name",name);
  if(!"STATUS_CHANGED".equals(input.get("triggerType")))throw new IllegalArgumentException("仅支持状态变化触发");
  String tenant=RequestContext.tenantId(),typeId=Objects.toString(input.get("triggerTypeId"),"");Map<String,Object> type=types.type(tenant,typeId);if(type==null||!WorkItemTemplateService.asBoolean(type.get("enabled")))throw new IllegalArgumentException("请选择已启用的模板工作项类型");
  String state=Objects.toString(input.get("triggerStateKey"),"");if(!stateExists(typeId,state))throw new IllegalArgumentException("触发状态不属于所选类型");
  String condition=Objects.toString(input.getOrDefault("conditionType","NONE"));if(!Set.of("NONE","MULTI","TASK_TYPE","PRIORITY").contains(condition))throw new IllegalArgumentException("条件类型无效");
  if("MULTI".equals(condition)){Object raw=input.get("conditions");if(!(raw instanceof List<?>))raw=decodeConditions(input.get("conditionValue"));if(!(raw instanceof List<?> rows)||rows.isEmpty())throw new IllegalArgumentException("过滤条件不能为空");for(Object value:rows){if(!(value instanceof Map<?,?> row)||!Set.of("TASK_TYPE","PRIORITY").contains(row.get("type"))||!Set.of("EQUALS","NOT_EQUALS","CONTAINS").contains(row.get("operator"))||Objects.toString(row.get("value"),"").isBlank())throw new IllegalArgumentException("过滤条件无效");if("TASK_TYPE".equals(row.get("type")))requireType(row.get("value"));else if(!Set.of("P0","P1","P2","P3").contains(row.get("value")))throw new IllegalArgumentException("优先级条件无效");}body.put("conditionValue",encode(rows));}
  else if("TASK_TYPE".equals(condition))requireType(input.get("conditionValue"));
  else if("PRIORITY".equals(condition)&&!Set.of("P0","P1","P2","P3").contains(input.get("conditionValue")))throw new IllegalArgumentException("优先级条件无效");
  String action=Objects.toString(input.get("actionType"),"");if(!Set.of("CREATE_SUBTASK","DERIVE_PARENT_STATUS","DISPATCH_REQUIREMENT_TASKS","SET_ACTUAL_START_TIME","MULTI").contains(action))throw new IllegalArgumentException("动作类型无效");
  Map<String,Object> config=productRules.decodeConfig(input.get("actionConfig"));if("MULTI".equals(action)){Object raw=input.get("actions");if(!(raw instanceof List<?>))raw=config.get("actions");if(!(raw instanceof List<?> actions)||actions.isEmpty())throw new IllegalArgumentException("执行动作不能为空");config=Map.of("actions",actions);}
  validateConfig(config);validateAction(action,config,typeId);body.put("actionConfig",encode(config));return body;
 }
 private void validateAction(String action,Map<String,Object> config,String triggerTypeId){
  if("CREATE_SUBTASK".equals(action))requireType(config.get("childTypeId"));
  if("DERIVE_PARENT_STATUS".equals(action)&&!stateExists(triggerTypeId,Objects.toString(config.get("result"),"")))throw new IllegalArgumentException("推导状态无效");
  if("DISPATCH_REQUIREMENT_TASKS".equals(action))for(String key:List.of("designTypeId","devTypeId","testTypeId"))requireType(config.get(key));
  if("MULTI".equals(action)){
   Object raw=config.get("actions");if(!(raw instanceof List<?> actions))throw new IllegalArgumentException("执行动作无效");
   for(Object value:actions){if(!(value instanceof Map<?,?> row))throw new IllegalArgumentException("执行动作无效");String kind=Objects.toString(row.get("type"),"");if(!Set.of("CREATE_SUBTASK","DERIVE_PARENT_STATUS").contains(kind))throw new IllegalArgumentException("组合动作类型无效");if("CREATE_SUBTASK".equals(kind))requireType(row.get("result"));else if(!stateExists(triggerTypeId,Objects.toString(row.get("result"),"")))throw new IllegalArgumentException("推导状态无效");}
  }
 }
 private void validateConfig(Object value){if(value instanceof Map<?,?> row){for(var entry:row.entrySet()){String key=Objects.toString(entry.getKey(),"");Object item=entry.getValue();if(Set.of("childTypeId","designTypeId","devTypeId","testTypeId").contains(key)&&!Objects.toString(item,"").isBlank())requireType(item);else if("result".equals(key)&&row.get("type")!=null&&"CREATE_SUBTASK".equals(row.get("type")))requireType(item);else validateConfig(item);}}else if(value instanceof List<?> list)list.forEach(this::validateConfig);}
 private void requireType(Object id){Map<String,Object> type=types.type(RequestContext.tenantId(),Objects.toString(id,""));if(type==null||!WorkItemTemplateService.asBoolean(type.get("enabled")))throw new IllegalArgumentException("自动化规则引用了无效的模板类型");}
 private boolean stateExists(String typeId,String state){Map<String,Object> workflow=types.workflow(RequestContext.tenantId(),typeId);if(workflow==null)return false;try{Map<?,?> definition=json.readValue(Objects.toString(workflow.get("definition"),"{}"),Map.class);Object states=definition.get("states");return states instanceof List<?> list&&list.stream().anyMatch(item->item instanceof Map<?,?> row&&state.equals(row.get("key"))&& !Boolean.FALSE.equals(row.get("enabled")));}catch(JsonProcessingException e){throw new IllegalStateException("模板状态格式无效",e);}}
 private String mapped(Map<String,String> ids,Object value){String id=Objects.toString(value,"");String result=ids.get(id);if(result==null)throw new IllegalArgumentException("自动化模板引用的工作项类型不在新产品中");return result;}
 private Object remap(Object value,Map<String,String> ids){if(value instanceof Map<?,?> row){Map<String,Object> copy=new LinkedHashMap<>();for(var entry:row.entrySet()){String key=Objects.toString(entry.getKey(),"");Object item=entry.getValue();copy.put(key,Set.of("childTypeId","designTypeId","devTypeId","testTypeId").contains(key)&&!Objects.toString(item,"").isBlank()?mapped(ids,item):"value".equals(key)&&"TASK_TYPE".equals(row.get("type"))?mapped(ids,item):"result".equals(key)&&"CREATE_SUBTASK".equals(row.get("type"))?mapped(ids,item):remap(item,ids));}return copy;}if(value instanceof List<?> list)return list.stream().map(item->remap(item,ids)).toList();return value;}
 private boolean containsType(Object value,String id){if(value instanceof Map<?,?> row){for(var entry:row.entrySet())if(Set.of("childTypeId","designTypeId","devTypeId","testTypeId").contains(entry.getKey())&&id.equals(entry.getValue())||"value".equals(entry.getKey())&&"TASK_TYPE".equals(row.get("type"))&&id.equals(entry.getValue())||"result".equals(entry.getKey())&&"CREATE_SUBTASK".equals(row.get("type"))&&id.equals(entry.getValue())||containsType(entry.getValue(),id))return true;}if(value instanceof List<?> list)return list.stream().anyMatch(item->containsType(item,id));return false;}
 private Object decodeConditions(Object raw){if(raw==null)return List.of();try{return json.readValue(Objects.toString(raw,"[]"),List.class);}catch(JsonProcessingException e){throw new IllegalArgumentException("过滤条件格式无效",e);}}
 private String encode(Object value){try{return json.writeValueAsString(value);}catch(JsonProcessingException e){throw new IllegalArgumentException("规则格式无效",e);}}
}

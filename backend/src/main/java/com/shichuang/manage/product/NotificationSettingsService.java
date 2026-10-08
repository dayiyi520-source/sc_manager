package com.shichuang.manage.product;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class NotificationSettingsService {
 private static final Map<String,List<String>> EVENTS=Map.of(
  "ASSIGNED",List.of("CREATOR","OWNER","PARTICIPANT","CC"),
  "STATUS_CHANGED",List.of("CREATOR","OWNER","PARTICIPANT","CC"),
  "COMMENTED",List.of("CREATOR","OWNER","PARTICIPANT","CC"),
  "DELETED",List.of("CREATOR","OWNER","PARTICIPANT","CC"),
  "REPLIED",List.of("REPLIED_USER"),"MENTIONED",List.of("MENTIONED_USER"),
  "CC_ADDED",List.of("ADDED_USER"),"PARTICIPANT_ADDED",List.of("ADDED_USER"));
 private static final List<String> ORDER=List.of("ASSIGNED","STATUS_CHANGED","COMMENTED","DELETED","REPLIED","MENTIONED","CC_ADDED","PARTICIPANT_ADDED");
 private final NotificationSettingsMapper mapper;
 private final ObjectMapper json;
 private final WorkItemAccess access;
 private final WorkItemCategoryService categories;
 public NotificationSettingsService(NotificationSettingsMapper mapper,ObjectMapper json,WorkItemAccess access,WorkItemCategoryService categories){this.mapper=mapper;this.json=json;this.access=access;this.categories=categories;}
 public Map<String,Object> template(){AuthorizationService.requireRead("product");return normalize(decode(mapper.readTemplate(RequestContext.tenantId())));}
 public Map<String,Object> product(String line){access.check(line,false);String stored=mapper.readProduct(RequestContext.tenantId(),line);return normalize(decode(stored));}
 @Transactional public Map<String,Object> saveTemplate(Map<String,Object> body){AuthorizationService.requireWrite("product");String encoded=encode(validate(body));mapper.saveTemplate(RequestContext.tenantId(),encoded,RequestContext.userId());return decode(encoded);}
 @Transactional public Map<String,Object> saveProduct(String line,Map<String,Object> body){access.check(line,true);String encoded=encode(validate(body));mapper.saveProduct(RequestContext.tenantId(),line,encoded,RequestContext.userId());return decode(encoded);}
 @Transactional public void copyToProduct(String line){String source=mapper.readTemplate(RequestContext.tenantId());mapper.saveProduct(RequestContext.tenantId(),line,encode(normalize(decode(source))),RequestContext.userId());}
 private Map<String,Object> defaults(){List<Map<String,Object>> rules=new ArrayList<>();for(String event:ORDER)rules.add(Map.of("event",event,"recipients",event.endsWith("_ADDED")?List.of("ADDED_USER"):EVENTS.get(event),"channels",List.of("IN_APP","DINGTALK")));return Map.of("rules",rules);}
 private Map<String,Object> validate(Map<String,Object> body){
  if(body==null||!(body.get("categories") instanceof List<?> entries))throw new IllegalArgumentException("通知分类配置不完整");
  List<String> allowed=categoryCodes(); Map<String,Object> result=new LinkedHashMap<>();
  for(Object entry:entries){if(!(entry instanceof Map<?,?> value))throw new IllegalArgumentException("通知分类配置格式无效");String code=Objects.toString(value.get("categoryCode"),"");if(!allowed.contains(code)||result.containsKey(code))throw new IllegalArgumentException("通知分类重复或无效");result.put(code,Map.of("categoryCode",code,"rules",validateRules(value.get("rules"))));}
  if(!result.keySet().containsAll(allowed))throw new IllegalArgumentException("通知分类配置不完整");
  return Map.of("categories",allowed.stream().map(result::get).toList());
 }
 private List<Map<String,Object>> validateRules(Object raw){
  if(!(raw instanceof List<?> rules)||rules.size()!=ORDER.size())throw new IllegalArgumentException("通知规则不完整");
  Map<String,Map<String,Object>> indexed=new HashMap<>();
  for(Object item:rules){if(!(item instanceof Map<?,?> rule))throw new IllegalArgumentException("通知规则格式无效");String event=Objects.toString(rule.get("event"),"");if(!EVENTS.containsKey(event)||indexed.containsKey(event))throw new IllegalArgumentException("通知事件重复或无效");
   if(!(rule.get("recipients") instanceof List<?> recipients)||recipients.stream().anyMatch(value->!EVENTS.get(event).contains(value))||new HashSet<>(recipients).size()!=recipients.size())throw new IllegalArgumentException("通知对象无效");
   if(!(rule.get("channels") instanceof List<?> channels)||channels.stream().anyMatch(value->!Set.of("IN_APP","DINGTALK").contains(value))||new HashSet<>(channels).size()!=channels.size())throw new IllegalArgumentException("通知渠道无效");
   indexed.put(event,Map.of("event",event,"recipients",recipients,"channels",channels));}
  return ORDER.stream().map(indexed::get).toList();
 }
 private Map<String,Object> normalize(Map<String,Object> stored){
  List<String> codes=categoryCodes(); Object legacy=stored.get("rules"); Map<String,Object> byCode=new HashMap<>();
  if(stored.get("categories") instanceof List<?> entries)for(Object entry:entries)if(entry instanceof Map<?,?> row)byCode.put(Objects.toString(row.get("categoryCode"),""),entry);
  List<Object> values=new ArrayList<>();for(String code:codes){Object existing=byCode.get(code);if(existing instanceof Map<?,?> row && row.get("rules") instanceof List<?>)values.add(existing);else values.add(Map.of("categoryCode",code,"rules",legacy instanceof List<?>?legacy:defaults().get("rules")));}
  return Map.of("categories",values);
 }
 private List<String> categoryCodes(){return categories.list().stream().filter(value->!Boolean.FALSE.equals(value.get("enabled"))).map(value->Objects.toString(value.get("code"),"")).filter(value->!value.isBlank()).toList();}
 private Map<String,Object> decode(String value){if(value==null)return defaults();try{return json.readValue(value,new com.fasterxml.jackson.core.type.TypeReference<>(){});}catch(JsonProcessingException e){throw new IllegalStateException("通知配置格式无效",e);}}
 private String encode(Object value){try{return json.writeValueAsString(value);}catch(JsonProcessingException e){throw new IllegalArgumentException("通知配置格式无效",e);}}
}

package com.shichuang.manage.product;

import com.fasterxml.jackson.databind.JsonNode;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Transactional
class ResearchTemplateSettingsIntegrationTest extends AbstractApiIntegrationTest {
 private String auth() throws Exception { return "Bearer " + loginToken(); }
 private JsonNode data(String response) throws Exception { return objectMapper.readTree(response).path("data"); }
 private String createLine(String auth,boolean template) throws Exception {
  String response=mockMvc.perform(post("/api/product-lines").header("Authorization",auth).contentType("application/json")
   .content(objectMapper.writeValueAsString(Map.of("name","继承配置测试","code","PREF-"+System.nanoTime(),"ownerUserId","user-admin","initializeWorkItemTemplate",template))))
   .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
  return data(response).path("id").asText();
 }
 @Test void iterationStatusSaveValidatesFinalPhasesAndRollsBackOnConflict() throws Exception {
  String token=auth();
  String path="/api/research-template/statuses";
  JsonNode existing=data(mockMvc.perform(get(path).param("scope","ITERATION").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  List<Map<String,Object>> originals=new ArrayList<>(),states=new ArrayList<>();
  String movedId="";
  for (JsonNode item:existing) {
   originals.add(Map.of("id",item.path("id").asText(),"revision",item.path("revision").asInt()));
   Map<String,Object> state=objectMapper.convertValue(item,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>() {});
   if ("进行中".equals(item.path("name").asText())) { state.put("phase","已完成"); movedId=item.path("id").asText(); }
   states.add(state);
  }
  assertFalse(movedId.isBlank());
  String newName="配置补位-"+System.nanoTime();
  Map<String,Object> added=new LinkedHashMap<>(Map.of("id","draft-"+System.nanoTime(),"name",newName,"phase","处理中","color","blue","initial",false,"enabled",true,"sort",10));
  states.add(added);
  String body=objectMapper.writeValueAsString(Map.of("originals",originals,"states",states));
  mockMvc.perform(put(path).param("scope","ITERATION").header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isOk());
  JsonNode saved=data(mockMvc.perform(get(path).param("scope","ITERATION").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  assertTrue(saved.toString().contains(newName));
  assertEquals("已完成",jdbc.queryForObject("SELECT phase_ FROM t_research_status_template WHERE id_=?",String.class,movedId));
  String before=saved.toString();
  mockMvc.perform(put(path).param("scope","ITERATION").header("Authorization",token).contentType("application/json").content(body)).andExpect(status().isConflict());
  assertEquals(before,data(mockMvc.perform(get(path).param("scope","ITERATION").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).toString());
  List<Map<String,Object>> refreshed=new ArrayList<>(),withoutPhase=new ArrayList<>();
  for (JsonNode item:saved) {
   refreshed.add(Map.of("id",item.path("id").asText(),"revision",item.path("revision").asInt()));
   Map<String,Object> state=objectMapper.convertValue(item,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>() {});
   if ("处理中".equals(item.path("phase").asText())) state.put("phase","已完成");
   withoutPhase.add(state);
  }
  mockMvc.perform(put(path).param("scope","ITERATION").header("Authorization",token).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("originals",refreshed,"states",withoutPhase)))).andExpect(status().isBadRequest());
  assertEquals(before,data(mockMvc.perform(get(path).param("scope","ITERATION").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).toString());
  List<Map<String,Object>> switched=new ArrayList<>();
  for (JsonNode item:saved) {
   Map<String,Object> state=objectMapper.convertValue(item,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>() {});
   state.put("initial",false);
   switched.add(state);
  }
  switched.add(new LinkedHashMap<>(Map.of("id","draft-default","name","新默认-"+System.nanoTime(),"phase","待开始","color","neutral","initial",true,"enabled",true,"sort",0)));
  mockMvc.perform(put(path).param("scope","ITERATION").header("Authorization",token).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("originals",refreshed,"states",switched)))).andExpect(status().isOk());
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM t_research_status_template WHERE tenant_id_='local-tenant' AND scope_='ITERATION' AND initial_=1 AND delete_flag_=0",Integer.class));
 }
 @Test void statusRenameUpdatesReferencedProductsAndVersionsIncludingLongNames() throws Exception {
  String token=auth(),line=createLine(token,false);
  String version=java.util.UUID.randomUUID().toString();
  jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,'local-tenant',?,?,'重命名验证','未开始','user-admin','user-admin',NOW(),NOW())",version,line,version);
  for(String scope:List.of("PRODUCT","ITERATION")) {
   String path="/api/research-template/statuses";
   JsonNode existing=data(mockMvc.perform(get(path).param("scope",scope).header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
   List<Map<String,Object>> originals=new ArrayList<>(),states=new ArrayList<>();
   String renamed="业务状态名称长度验证".repeat(5);
   for(JsonNode item:existing) {
    originals.add(Map.of("id",item.path("id").asText(),"revision",item.path("revision").asInt()));
    Map<String,Object> state=objectMapper.convertValue(item,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>() {});
    if(item.path("initial").asBoolean()) {
     String table="PRODUCT".equals(scope)?"t_product_line":"t_product_line_version";
     jdbc.update("UPDATE "+table+" SET status_=? WHERE id_=?",item.path("name").asText(),"PRODUCT".equals(scope)?line:version);
     state.put("name",renamed);
    }
    states.add(state);
   }
   mockMvc.perform(put(path).param("scope",scope).header("Authorization",token).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("originals",originals,"states",states)))).andExpect(status().isOk());
   String table="PRODUCT".equals(scope)?"t_product_line":"t_product_line_version";
   assertEquals(renamed,jdbc.queryForObject("SELECT status_ FROM "+table+" WHERE id_=?",String.class,"PRODUCT".equals(scope)?line:version));
  }
 }
 @Test void notificationTemplateCopiesToProductsAndOverridesRemainIndependent() throws Exception {
  String token=auth();
  JsonNode initial=data(mockMvc.perform(get("/api/notification-template").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  assertEquals(8,initial.path("rules").size());
  var changed=objectMapper.readTree(initial.toString());
  ((com.fasterxml.jackson.databind.node.ArrayNode)changed.path("rules").get(0).path("channels")).removeAll();
  mockMvc.perform(put("/api/notification-template").header("Authorization",token).contentType("application/json").content(changed.toString())).andExpect(status().isOk());
  String first=createLine(token,false),second=createLine(token,false);
  assertEquals(0,data(mockMvc.perform(get("/api/product-lines/{id}/notification-settings",first).header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("rules").get(0).path("channels").size());
  mockMvc.perform(put("/api/product-lines/{id}/notification-settings",first).header("Authorization",token).contentType("application/json").content(initial.toString())).andExpect(status().isOk());
  assertEquals(2,data(mockMvc.perform(get("/api/product-lines/{id}/notification-settings",first).header("Authorization",token)).andReturn().getResponse().getContentAsString()).path("rules").get(0).path("channels").size());
  assertEquals(0,data(mockMvc.perform(get("/api/product-lines/{id}/notification-settings",second).header("Authorization",token)).andReturn().getResponse().getContentAsString()).path("rules").get(0).path("channels").size());
 }
 @Test void rejectsInvalidNotificationEvent() throws Exception {
  String token=auth();
  mockMvc.perform(put("/api/notification-template").header("Authorization",token).contentType("application/json").content("{\"rules\":[{\"event\":\"UNKNOWN\",\"recipients\":[],\"channels\":[]}]"))
   .andExpect(status().isBadRequest());
 }
 @Test void automationTemplateMapsTypeIdsOnlyWhenWorkItemTemplateEnabled() throws Exception {
  String token=auth();
  JsonNode templates=data(mockMvc.perform(get("/api/work-item-template").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  JsonNode type=templates.get(0),state=type.path("workflow").path("definition").path("states").get(0);
  String rule=objectMapper.writeValueAsString(Map.of("name","继承规则","enabled",true,"triggerType","STATUS_CHANGED","triggerTypeId",type.path("id").asText(),"triggerStateKey",state.path("key").asText(),"conditionType","NONE","actionType","SET_ACTUAL_START_TIME","actionConfig",Map.of()));
  mockMvc.perform(post("/api/automation-template/rules").header("Authorization",token).contentType("application/json").content(rule)).andExpect(status().isOk());
  String enabled=createLine(token,true),disabled=createLine(token,false);
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM t_product_automation_rule WHERE product_line_id_=? AND delete_flag_=0",Integer.class,enabled));
  assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM t_product_automation_rule WHERE product_line_id_=? AND delete_flag_=0",Integer.class,disabled));
  String copiedId=jdbc.queryForObject("SELECT trigger_type_id_ FROM t_product_automation_rule WHERE product_line_id_=?",String.class,enabled);
  assertNotEquals(type.path("id").asText(),copiedId);
  assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM t_product_line_work_item_type WHERE product_line_id_=? AND id_=?",Integer.class,enabled,copiedId));
 }
 @Test void automationTemplateRejectsInvalidReferencesAndCanToggleSavedRule() throws Exception {
  String token=auth();
  JsonNode templates=data(mockMvc.perform(get("/api/work-item-template").header("Authorization",token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  JsonNode type=templates.get(0),state=type.path("workflow").path("definition").path("states").get(0);
  Map<String,Object> body=new java.util.HashMap<>(Map.of("name","组合规则","enabled",true,"triggerType","STATUS_CHANGED","triggerTypeId",type.path("id").asText(),"triggerStateKey",state.path("key").asText(),"conditionType","MULTI","conditions",java.util.List.of(Map.of("type","TASK_TYPE","operator","EQUALS","value",type.path("id").asText())),"actionType","MULTI","actions",java.util.List.of(Map.of("type","CREATE_SUBTASK","result",type.path("id").asText()))));
  JsonNode saved=data(mockMvc.perform(post("/api/automation-template/rules").header("Authorization",token).contentType("application/json").content(objectMapper.writeValueAsString(body))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
  body.clear();saved.properties().forEach(entry->body.put(entry.getKey(),objectMapper.convertValue(entry.getValue(),Object.class)));
  body.put("enabled",false);
  mockMvc.perform(put("/api/automation-template/rules/{id}",saved.path("id").asText()).header("Authorization",token).contentType("application/json").content(objectMapper.writeValueAsString(body))).andExpect(status().isOk());
  body.put("revision",1);body.put("triggerStateKey","missing-state");
  mockMvc.perform(put("/api/automation-template/rules/{id}",saved.path("id").asText()).header("Authorization",token).contentType("application/json").content(objectMapper.writeValueAsString(body))).andExpect(status().isBadRequest());
 }
}

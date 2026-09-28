package com.shichuang.manage.product;

import com.fasterxml.jackson.databind.JsonNode;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
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

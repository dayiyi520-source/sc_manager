package com.shichuang.manage.okr;

import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.List;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@Transactional
class OkrIntegrationTest extends AbstractApiIntegrationTest {
 private String login(String user)throws Exception{return objectMapper.readTree(mockMvc.perform(post("/api/auth/dev-login").contentType("application/json").content("{\"username\":\""+user+"\"}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("data").path("token").asText();}
 private void reporting(String token,String id,String supervisor,boolean root)throws Exception{
  var response=mockMvc.perform(get("/api/okr/people").header("Authorization","Bearer "+token)).andReturn().getResponse().getContentAsString();int version=-1;
  for(var p:objectMapper.readTree(response).path("data"))if(id.equals(p.path("id").asText()))version=p.path("version").asInt();
  mockMvc.perform(put("/api/okr/people/"+id).header("Authorization","Bearer "+token).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("supervisorId",supervisor,"root",root,"version",version)))).andExpect(status().isOk());
 }
 private String create(String token,String kind,Map<String,Object> payload)throws Exception{
  return objectMapper.readTree(mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+token).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind",kind,"periodKey","2026-09","payload",payload)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("data").path("id").asText();
 }
 private void action(String token,String id,String action,int version)throws Exception{
  mockMvc.perform(patch("/api/okr/records/"+id).header("Authorization","Bearer "+token).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("action",action,"version",version)))).andExpect(status().isOk());
 }
 @Test void persistsAlignmentRejectsSelfApprovalAndStaleVersion()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  var kr=List.of(Map.of("id","kr-root","title","验收结果","weight",100,"progress",0));
  String parent=create(admin,"objective",Map.of("title","根目标","keyResults",kr));action(admin,parent,"submit",0);
  String child=create(tech,"objective",Map.of("title","承接目标","parentObjectiveId",parent,"parentKeyResultId","kr-root","keyResults",kr));action(tech,child,"submit",0);
  mockMvc.perform(patch("/api/okr/records/"+child).header("Authorization","Bearer "+tech).contentType("application/json").content("{\"action\":\"approve\",\"version\":1}")).andExpect(status().isBadRequest());
  action(admin,child,"approve",1);
  mockMvc.perform(patch("/api/okr/records/"+child).header("Authorization","Bearer "+tech).contentType("application/json").content("{\"action\":\"complete\",\"version\":1}")).andExpect(status().isConflict());
  var row=jdbc.queryForMap("SELECT status_,payload_ FROM t_okr_record WHERE id_=?",child);assertEquals("active",row.get("status_"));assertTrue(row.get("payload_").toString().contains(parent));
 }
 @Test void rejectsPeerParentAndOrganizationCycles()throws Exception{
  String admin=login("admin"),tech=login("tech"),sales=login("sales");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);reporting(admin,"user-sales","",true);
  var p=Map.of("title","同级目标","keyResults",List.of(Map.of("id","kr","title","结果","weight",100,"progress",0)));String peer=create(sales,"objective",p);action(sales,peer,"submit",0);
  mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind","objective","periodKey","2026-09","payload",Map.of("title","非法承接","parentObjectiveId",peer,"keyResults",p.get("keyResults")))))).andExpect(status().isNotFound());
  mockMvc.perform(put("/api/okr/people/user-admin").header("Authorization","Bearer "+admin).contentType("application/json").content("{\"supervisorId\":\"user-tech\",\"root\":false,\"version\":0}")).andExpect(status().isBadRequest());
 }
 @Test void returnsAndResubmitsReviewRetainsZeroScore()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  String id=create(tech,"review",Map.of("title","九月复盘","startDate","2026-09-01","endDate","2026-09-30","items",List.of()));action(tech,id,"submit",0);
  mockMvc.perform(patch("/api/okr/records/"+id).header("Authorization","Bearer "+admin).contentType("application/json").content("{\"action\":\"return\",\"version\":1,\"feedback\":\"补充产出\"}")).andExpect(status().isOk());action(tech,id,"submit",2);
  mockMvc.perform(patch("/api/okr/records/"+id).header("Authorization","Bearer "+admin).contentType("application/json").content("{\"action\":\"approve\",\"version\":3,\"finalScore\":0,\"feedback\":\"已核实\",\"evaluation\":\"未形成交付结果\"}")).andExpect(status().isOk());
  assertEquals(0,objectMapper.readTree(jdbc.queryForObject("SELECT payload_ FROM t_okr_record WHERE id_=?",String.class,id)).path("finalScore").asInt(-1));
 }
 @Test void persistsWorkLinksAndFreezesSubmittedEvidence()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  var krs=List.of(Map.of("id","kr","title","交付结果","weight",100,"progress",0));String parent=create(admin,"objective",Map.of("title","组织方向","keyResults",krs));action(admin,parent,"submit",0);
  String objective=create(tech,"objective",Map.of("title","个人方向","parentObjectiveId",parent,"keyResults",krs));action(tech,objective,"submit",0);action(admin,objective,"approve",1);
  var response=mockMvc.perform(get("/api/okr/work?ownerId=user-tech").header("Authorization","Bearer "+tech)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  var work=objectMapper.readTree(response).path("data").get(0);assertNotNull(work);String workId=work.path("id").asText();
  mockMvc.perform(put("/api/okr/work/link").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("workId",workId,"objectiveId",objective,"keyResultId","kr","version",work.path("linkVersion").asInt())))).andExpect(status().isOk());
  var reviewPayload=Map.<String,Object>of("title","工作证据复盘","startDate","2026-09-01","endDate","2026-09-30","finalScore",100,"items",List.of(Map.of("workId",workId,"result","紧急支持已交付","impact","占用目标执行时间","affectedObjectiveId",objective,"affectedKeyResultId","kr","included",true)));
  String review=create(tech,"review",reviewPayload);action(tech,review,"submit",0);
  var saved=objectMapper.readTree(jdbc.queryForObject("SELECT payload_ FROM t_okr_record WHERE id_=?",String.class,review));assertFalse(saved.has("finalScore"));assertFalse(saved.path("items").get(0).has("included"));assertFalse(saved.path("items").get(0).path("title").asText().isBlank());
  assertEquals(objective,saved.path("items").get(0).path("affectedObjectiveId").asText());
  mockMvc.perform(patch("/api/okr/records/"+objective).header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("action","progress","version",2,"keyResults",List.of(Map.of("id","kr","progress",80)))))).andExpect(status().isOk());
  mockMvc.perform(patch("/api/okr/records/"+review).header("Authorization","Bearer "+admin).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("action","approve","version",1,"finalScore",88,"feedback","认可临时支持","evaluation","结合交付证据确认","includedWorkIds",List.of(workId))))).andExpect(status().isOk());
  saved=objectMapper.readTree(jdbc.queryForObject("SELECT payload_ FROM t_okr_record WHERE id_=?",String.class,review));assertTrue(saved.path("items").get(0).path("included").asBoolean());assertEquals(88,saved.path("finalScore").asInt());
  for(var snapshot:saved.path("objectiveSnapshots"))if(objective.equals(snapshot.path("id").asText()))assertEquals(0,snapshot.path("payload").path("progress").asInt());
 }
}

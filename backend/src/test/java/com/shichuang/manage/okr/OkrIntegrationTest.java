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
 @Test void organizationRootCanSubmitReviewWithoutSupervisor()throws Exception{
  String admin=login("admin");reporting(admin,"user-admin","",true);
  var payload=new java.util.LinkedHashMap<String,Object>();
  payload.put("title","组织根周复盘");payload.put("startDate","2026-09-14");payload.put("endDate","2026-09-20");payload.put("reviewMode","structured");payload.put("reviewType","week");payload.put("selfScore",90);payload.put("summary","");payload.put("krReviews",List.of());payload.put("assistance",List.of());payload.put("extraWork",Map.of("workIds",List.of(),"description","","impact","none"));payload.put("syncKrProgress",false);payload.put("items",List.of());
  String response=mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+admin).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind","review","periodKey","2026-09-14/2026-09-20","payload",payload,"submit",true)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String id=objectMapper.readTree(response).path("data").path("id").asText();
  assertEquals("submitted",jdbc.queryForObject("SELECT status_ FROM t_okr_record WHERE id_=?",String.class,id));
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
 @Test void simpleReviewLinksCompletedWorkWithoutKrOrPerItemNarrative()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  jdbc.update("UPDATE t_product_requirement SET owner_name_=?,status_=?,update_time_=? WHERE tenant_id_=? AND id_=?","王浩然","已完成","2026-09-14 12:00:00","local-tenant","req-1");
  String workJson=mockMvc.perform(get("/api/okr/work?ownerId=user-tech").header("Authorization","Bearer "+tech)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String workId="";for(var w:objectMapper.readTree(workJson).path("data"))if("req-1".equals(w.path("sourceId").asText())){workId=w.path("id").asText();assertEquals("product_requirement",w.path("kind").asText());}assertFalse(workId.isBlank());
  var payload=new java.util.LinkedHashMap<String,Object>();
  payload.put("title","完成工作关联验收");payload.put("startDate","2026-09-14");payload.put("endDate","2026-09-20");payload.put("reviewMode","completed");payload.put("reviewType","week");payload.put("summary","完成本周任务");payload.put("selfScore",90);payload.put("sendTo",List.of());payload.put("items",List.of(Map.of("workId",workId)));
  var request=Map.of("kind","review","periodKey","2026-09-14/2026-09-20","payload",payload,"submit",true);
  String response=mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(request))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String id=objectMapper.readTree(response).path("data").path("id").asText();var saved=objectMapper.readTree(jdbc.queryForObject("SELECT payload_ FROM t_okr_record WHERE id_=?",String.class,id));assertEquals(workId,saved.path("items").get(0).path("workId").asText());assertEquals("已完成",saved.path("items").get(0).path("status").asText());
  jdbc.update("UPDATE t_product_requirement SET status_=? WHERE tenant_id_=? AND id_=?","研发中","local-tenant","req-1");
  mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(request))).andExpect(status().isBadRequest());
 }
 @Test void includesUnifiedWorkItemsInOkrEvidence()throws Exception{
  jdbc.update("""
   INSERT INTO t_product_work_item
   (id_,tenant_id_,product_line_id_,category_,task_type_id_,code_,title_,workflow_id_,status_key_,status_name_,status_group_,assignee_id_,assignee_name_,priority_,planned_end_date_,estimated_hours_,actual_hours_,source_type_,request_id_,request_hash_,create_by_,update_by_,create_time_,update_time_,delete_flag_,version_)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(6),NOW(6),0,0)
   """, "okr-core-work", "local-tenant", "line-okr", "development", "type-dev", "WI-OKR-CORE", "统一研发工作项", "workflow-okr", "doing", "开发中", "ACTIVE", "user-tech", "王浩然", "P1", "2026-09-30", 8, 3, "MANUAL", "okr-core-request", "okr-core-hash", "user-tech", "user-tech");
  String tech=login("tech");
  var response=mockMvc.perform(get("/api/okr/work?ownerId=user-tech").header("Authorization","Bearer "+tech))
    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  boolean found=false;
  for(var item:objectMapper.readTree(response).path("data")){
   if("okr-core-work".equals(item.path("sourceId").asText())){assertEquals("core:okr-core-work",item.path("id").asText());found=true;}
  }
  assertTrue(found,"统一工作项应进入 OKR 工作项证据列表");
 }
 @Test void transferredRequirementWorkItemCanBeSubmittedFromLegacyReviewDraft()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  jdbc.update("""
   INSERT INTO t_requirement_work_item
   (id_,tenant_id_,requirement_id_,task_type_,title_,assignee_name_,note_,status_,sync_status_,retry_count_,create_by_,update_by_,create_time_,update_time_,delete_flag_,version_)
   VALUES (?,?,?,?,?,?,?,'处理中','SUCCESS',0,?,?,?, ?,0,0)
   ""","okr-transferred-ticket","local-tenant","req-1","development","转派给我的工单","王浩然","处理转派工单","user-admin","user-admin","2026-09-14 09:00:00","2026-09-15 10:00:00");
  String workJson=mockMvc.perform(get("/api/okr/work?ownerId=user-tech").header("Authorization","Bearer "+tech)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String workId="";for(var item:objectMapper.readTree(workJson).path("data"))if("okr-transferred-ticket".equals(item.path("sourceId").asText())){workId=item.path("id").asText();assertEquals("requirement_work_item",item.path("kind").asText());}assertFalse(workId.isBlank());
  var payload=new java.util.LinkedHashMap<String,Object>();
  payload.put("title","旧草稿兼容提交");payload.put("startDate","2026-09-14");payload.put("endDate","2026-09-20");payload.put("reviewMode","structured");payload.put("reviewType","week");payload.put("selfScore",90);payload.put("krReviews",List.of());payload.put("assistance",List.of());payload.put("extraWork",Map.of("workIds",List.of(workId),"description","","impact","无明显影响"));payload.put("syncKrProgress",false);payload.put("items",List.of(Map.of("workId",workId)));
  String draft=create(tech,"review",payload);
  action(tech,draft,"submit",0);
  var saved=objectMapper.readTree(jdbc.queryForObject("SELECT payload_ FROM t_okr_record WHERE id_=?",String.class,draft));
  assertEquals("none",saved.path("extraWork").path("impact").asText());assertEquals("ticket",saved.path("items").get(0).path("workType").asText());
  assertEquals("submitted",jdbc.queryForObject("SELECT status_ FROM t_okr_record WHERE id_=?",String.class,draft));
 }
 @Test void simpleReviewPersistsOriginalFieldsAndSubmitsAtomically()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  var payload=new java.util.LinkedHashMap<String,Object>();
  payload.put("title","原表单周复盘");payload.put("startDate","2026-09-14");payload.put("endDate","2026-09-20");payload.put("reviewMode","completed");payload.put("reviewType","week");payload.put("summary","已完成交付");payload.put("selfScore",88);payload.put("suggestions","改进协作");payload.put("helpNeeded","资源支持");payload.put("uncompletedReason","等待确认");payload.put("sendTo",List.of("部门主管"));payload.put("items",List.of());
  String response=mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind","review","periodKey","2026-09-14/2026-09-20","payload",payload,"submit",true)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String id=objectMapper.readTree(response).path("data").path("id").asText();
  var row=jdbc.queryForMap("SELECT status_,payload_ FROM t_okr_record WHERE id_=?",id);
  assertEquals("submitted",row.get("status_"));var saved=objectMapper.readTree(row.get("payload_").toString());assertEquals(88,saved.path("selfScore").asInt());assertEquals("资源支持",saved.path("helpNeeded").asText());
  payload.put("selfScore",101);
  mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind","review","periodKey","2026-09","payload",payload,"submit",true)))).andExpect(status().isBadRequest());
 }
 @Test void monthlyReviewSnapshotsOnlyOwnedSubmittedWeeksAndPersistsPlans()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  var weekPayload=new java.util.LinkedHashMap<String,Object>();weekPayload.put("title","九月第一周");weekPayload.put("startDate","2026-09-01");weekPayload.put("endDate","2026-09-07");weekPayload.put("reviewMode","structured");weekPayload.put("reviewType","week");weekPayload.put("selfScore",90);weekPayload.put("krReviews",List.of());weekPayload.put("assistance",List.of());weekPayload.put("extraWork",Map.of("workIds",List.of(),"description","","impact","none"));weekPayload.put("syncKrProgress",false);weekPayload.put("items",List.of());
  String submittedWeek=create(tech,"review",weekPayload);action(tech,submittedWeek,"submit",0);
  weekPayload.put("title","未提交周报");weekPayload.put("startDate","2026-09-08");weekPayload.put("endDate","2026-09-14");String draftWeek=create(tech,"review",weekPayload);
  var monthPayload=new java.util.LinkedHashMap<String,Object>();monthPayload.put("title","九月月复盘");monthPayload.put("startDate","2026-09-01");monthPayload.put("endDate","2026-09-30");monthPayload.put("reviewMode","monthly");monthPayload.put("reviewType","month");monthPayload.put("selfScore",80);monthPayload.put("summary","月".repeat(2500));monthPayload.put("weeklyReviewIds",List.of(submittedWeek));monthPayload.put("weeklyReviewSnapshots",List.of(Map.of("id","forged")));monthPayload.put("krReviews",List.of());monthPayload.put("assistance",List.of());monthPayload.put("extraWork",Map.of("workIds",List.of(),"description","","impact","none"));monthPayload.put("monthlyOtherTasks",List.of(Map.of("id","task-1","content","支持上线","result","已完成","status","已完成")));monthPayload.put("otherNotes","其他补充说明");monthPayload.put("nextMonthArrangement","推进下一阶段");monthPayload.put("nextMonthPlans",List.of());monthPayload.put("syncKrProgress",false);monthPayload.put("items",List.of());
  String response=mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind","review","periodKey","2026-09-01/2026-09-30","payload",monthPayload,"submit",true)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String monthId=objectMapper.readTree(response).path("data").path("id").asText();var saved=objectMapper.readTree(jdbc.queryForObject("SELECT payload_ FROM t_okr_record WHERE id_=?",String.class,monthId));assertEquals(submittedWeek,saved.path("weeklyReviewSnapshots").get(0).path("id").asText());assertEquals(2500,saved.path("summary").asText().length());assertEquals("推进下一阶段",saved.path("nextMonthArrangement").asText());assertEquals("其他补充说明",saved.path("otherNotes").asText());assertEquals("支持上线",saved.path("monthlyOtherTasks").get(0).path("content").asText());
  monthPayload.put("weeklyReviewIds",List.of(draftWeek));
  mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind","review","periodKey","2026-09-01/2026-09-30","payload",monthPayload,"submit",true)))).andExpect(status().isBadRequest());
 }
}

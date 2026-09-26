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
 private String login(String user)throws Exception{
  if("admin".equals(user))return loginToken();
  return switch(user){
   case "tech" -> tokens.issue("user-tech","tech_lead","local-tenant","王浩然");
   case "sales" -> tokens.issue("user-sales","sales_director","local-tenant","陈雅婷");
   default -> throw new IllegalArgumentException("未知测试身份: "+user);
  };
 }
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
 @Test void adminViewerScopeOwnsDraftAndNonAdminCannotForgeIt()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  var payload=Map.<String,Object>of("title","陈宇璋视角周报","startDate","2026-09-21","endDate","2026-09-27","reviewMode","completed","reviewType","week","selfScore",80,"sendTo",List.of(),"items",List.of());
  String response=mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+admin).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind","review","periodKey","2026-09-21/2026-09-27","payload",payload,"submit",false,"viewerId","user-tech")))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String id=objectMapper.readTree(response).path("data").path("id").asText();
  assertEquals("user-tech",jdbc.queryForObject("SELECT owner_id_ FROM t_okr_record WHERE id_=?",String.class,id));
  mockMvc.perform(get("/api/okr/records?viewerId=user-admin").header("Authorization","Bearer "+tech)).andExpect(status().isForbidden());
 }
 @Test void allowsRootObjectivesForEndedAndUpcomingPeriods()throws Exception{
  String admin=login("admin");reporting(admin,"user-admin","",true);
  var payload=Map.<String,Object>of("title","跨周期目标","keyResults",List.of(Map.of("id","kr-cross-period","title","完成跨周期计划","weight",100,"progress",0)));
  String ended=java.time.YearMonth.now().minusMonths(1).toString();
  String upcoming=java.time.YearMonth.now().plusMonths(1).toString();
  String endedResponse=mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+admin).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind","objective","periodKey",ended,"payload",payload,"submit",false)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String endedId=objectMapper.readTree(endedResponse).path("data").path("id").asText();
  action(admin,endedId,"submit",0);
  String upcomingResponse=mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+admin).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("kind","objective","periodKey",upcoming,"payload",payload,"submit",false)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String upcomingId=objectMapper.readTree(upcomingResponse).path("data").path("id").asText();
  assertEquals("active",jdbc.queryForObject("SELECT status_ FROM t_okr_record WHERE id_=?",String.class,endedId));
  assertEquals("draft",jdbc.queryForObject("SELECT status_ FROM t_okr_record WHERE id_=?",String.class,upcomingId));
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
 @Test void updatesActionDraftInPlaceAndSubmitsWithoutDuplication()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  var keyResults=List.of(Map.of("id","kr-action-draft","title","完成客户满意度提升动作","weight",100,"progress",0,"assigneeIds",List.of("user-tech")));
  String objective=create(admin,"objective",Map.of("title","客户满意度提升到9分","keyResults",keyResults));action(admin,objective,"submit",0);
  var draftPayload=new java.util.LinkedHashMap<String,Object>();draftPayload.put("title","梳理客服问题分类");draftPayload.put("department","软件研发部");draftPayload.put("parentObjectiveId",objective);draftPayload.put("parentActionId","kr-action-draft");draftPayload.put("structureType","product");draftPayload.put("productLine","客户服务平台");draftPayload.put("milestone","完成问题分类方案评审");draftPayload.put("deadline","2026-09-30");draftPayload.put("weight",40);draftPayload.put("commitmentWeight",100);draftPayload.put("assigneeIds",List.of("user-tech"));
  String response=mockMvc.perform(post("/api/okr/actions").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("periodKey","2026-09","payload",draftPayload,"submit",false)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String actionId=objectMapper.readTree(response).path("data").path("id").asText();draftPayload.put("title","完成客服问题分类与看板");
  mockMvc.perform(patch("/api/okr/records/"+actionId).header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("action","submit","version",0,"payload",draftPayload)))).andExpect(status().isOk());
  var saved=jdbc.queryForMap("SELECT status_,version_,payload_ FROM t_okr_record WHERE tenant_id_='local-tenant' AND id_=?",actionId);assertEquals("active",saved.get("status_"));assertEquals(1,((Number)saved.get("version_")).intValue());assertEquals("完成客服问题分类与看板",objectMapper.readTree(saved.get("payload_").toString()).path("title").asText());assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM t_okr_record WHERE tenant_id_='local-tenant' AND id_=?",Integer.class,actionId));
 }
 @Test void assignedActionParentsAreRoleScopedAndSubmittedActionsCannotBeEdited()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  var keyResults=List.of(Map.of("id","assigned-kr","title","主管负责的结果","weight",100,"progress",0,"assigneeIds",List.of("user-tech")));
  String objective=create(admin,"objective",Map.of("title","公司目标树","keyResults",keyResults));action(admin,objective,"submit",0);
  var parentsJson=mockMvc.perform(get("/api/okr/actions/parents?periodKey=2026-09").header("Authorization","Bearer "+tech)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();assertEquals(1,objectMapper.readTree(parentsJson).path("data").size());assertEquals("assigned-kr",objectMapper.readTree(parentsJson).path("data").get(0).path("parentKeyResultId").asText());
  var payload=new java.util.LinkedHashMap<String,Object>();payload.put("title","主管拆解动作");payload.put("department","软件研发部");payload.put("parentObjectiveId",objective);payload.put("parentActionId","assigned-kr");payload.put("parentKeyResultId","assigned-kr");payload.put("structureType","product");payload.put("productLine","内部系统");payload.put("milestone","完成设计");payload.put("deadline","2026-09-30");payload.put("weight",100);payload.put("commitmentWeight",100);payload.put("assigneeIds",List.of("user-tech"));
  String actionResponse=mockMvc.perform(post("/api/okr/actions").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("periodKey","2026-09","payload",payload,"submit",true)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();String actionId=objectMapper.readTree(actionResponse).path("data").path("id").asText();
  mockMvc.perform(patch("/api/okr/records/"+actionId).header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("action","save","version",0,"payload",payload)))).andExpect(status().isForbidden());
  var rootRecords=mockMvc.perform(get("/api/okr/records").header("Authorization","Bearer "+admin)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();assertTrue(rootRecords.contains(actionId));
 }
 @Test void actionParentsExposeOnlyTheActualAssignedUpstreamAtEachLevel()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  var rootKr=List.of(Map.of("id","tree-kr","title","公司关键动作","weight",100,"progress",0,"assigneeIds",List.of("user-tech")));
  String rootObjective=create(admin,"objective",Map.of("title","公司 O","keyResults",rootKr));action(admin,rootObjective,"submit",0);
  var managerAction=new java.util.LinkedHashMap<String,Object>();managerAction.put("title","主管拆解 A");managerAction.put("department","软件研发部");managerAction.put("parentObjectiveId",rootObjective);managerAction.put("parentActionId","tree-kr");managerAction.put("parentKeyResultId","tree-kr");managerAction.put("structureType","product");managerAction.put("productLine","平台");managerAction.put("milestone","设计完成");managerAction.put("deadline","2026-09-30");managerAction.put("weight",100);managerAction.put("commitmentWeight",100);managerAction.put("assigneeIds",List.of("user-tech"));
  String managerActionId=objectMapper.readTree(mockMvc.perform(post("/api/okr/actions").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("periodKey","2026-09","payload",managerAction,"submit",true)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("data").path("id").asText();
  var employeeParentsJson=mockMvc.perform(get("/api/okr/actions/parents?periodKey=2026-09").header("Authorization","Bearer "+tech)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  var employeeParents=objectMapper.readTree(employeeParentsJson).path("data");assertEquals(2,employeeParents.size());assertTrue(java.util.stream.StreamSupport.stream(employeeParents.spliterator(),false).anyMatch(parent->managerActionId.equals(parent.path("id").asText())));assertFalse(java.util.stream.StreamSupport.stream(employeeParents.spliterator(),false).anyMatch(parent->"user-tech".equals(parent.path("ownerId").asText())&&managerActionId.equals(parent.path("id").asText())&&managerAction.get("parentActionId").equals(parent.path("id").asText())));
  var employeeAction=new java.util.LinkedHashMap<String,Object>();employeeAction.putAll(managerAction);employeeAction.put("title","员工继续拆解");employeeAction.put("parentActionId",managerActionId);employeeAction.put("parentObjectiveId",rootObjective);employeeAction.put("parentKeyResultId","tree-kr");employeeAction.put("assigneeIds",List.of());
  String employeeActionId=objectMapper.readTree(mockMvc.perform(post("/api/okr/actions").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(Map.of("periodKey","2026-09","payload",employeeAction,"submit",true)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("data").path("id").asText();
  var recordsJson=mockMvc.perform(get("/api/okr/records").header("Authorization","Bearer "+admin)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();assertTrue(recordsJson.contains(managerActionId));assertTrue(recordsJson.contains(employeeActionId));
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
  jdbc.update("UPDATE t_product_work_item SET assignee_id_='user-tech',assignee_name_='王浩然' WHERE tenant_id_='local-tenant' AND delete_flag_=0 ORDER BY create_time_ LIMIT 1");
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
  String requirementId=jdbc.queryForObject("SELECT id_ FROM t_product_work_item WHERE tenant_id_='local-tenant' AND category_='requirement' AND delete_flag_=0 LIMIT 1",String.class);
  jdbc.update("UPDATE t_product_work_item SET assignee_id_='user-tech',assignee_name_=?,status_name_=?,status_group_='COMPLETED',successful_=1,update_time_=? WHERE tenant_id_=? AND id_=?","王浩然","已完成","2026-09-14 12:00:00","local-tenant",requirementId);
  String workJson=mockMvc.perform(get("/api/okr/work?ownerId=user-tech").header("Authorization","Bearer "+tech)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String workId="";for(var w:objectMapper.readTree(workJson).path("data"))if(requirementId.equals(w.path("sourceId").asText())){workId=w.path("id").asText();assertEquals("requirement",w.path("kind").asText());}assertFalse(workId.isBlank());
  var payload=new java.util.LinkedHashMap<String,Object>();
  payload.put("title","完成工作关联验收");payload.put("startDate","2026-09-14");payload.put("endDate","2026-09-20");payload.put("reviewMode","completed");payload.put("reviewType","week");payload.put("summary","完成本周任务");payload.put("selfScore",90);payload.put("sendTo",List.of());payload.put("items",List.of(Map.of("workId",workId)));
  var request=Map.of("kind","review","periodKey","2026-09-14/2026-09-20","payload",payload,"submit",true);
  String response=mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(request))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String id=objectMapper.readTree(response).path("data").path("id").asText();var saved=objectMapper.readTree(jdbc.queryForObject("SELECT payload_ FROM t_okr_record WHERE id_=?",String.class,id));assertEquals(workId,saved.path("items").get(0).path("workId").asText());assertEquals("已完成",saved.path("items").get(0).path("status").asText());
  jdbc.update("UPDATE t_product_work_item SET status_name_=?,status_group_='IN_PROGRESS',successful_=0 WHERE tenant_id_=? AND id_=?","研发中","local-tenant",requirementId);
  mockMvc.perform(post("/api/okr/records").header("Authorization","Bearer "+tech).contentType("application/json").content(objectMapper.writeValueAsString(request))).andExpect(status().isBadRequest());
 }
 @Test void includesUnifiedWorkItemsInOkrEvidence()throws Exception{
  jdbc.update("""
   INSERT INTO t_product_work_item
   (id_,tenant_id_,product_line_id_,category_,task_type_id_,code_,title_,workflow_id_,status_key_,status_name_,status_group_,assignee_id_,assignee_name_,priority_,planned_end_date_,estimated_hours_,actual_hours_,source_type_,request_id_,request_hash_,create_by_,update_by_,create_time_,update_time_,delete_flag_,version_)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(6),NOW(6),0,0)
   """, "okr-core-work", "local-tenant", "line-okr", "dev", "type-dev", "WI-OKR-CORE", "统一研发工作项", "workflow-okr", "doing", "开发中", "IN_PROGRESS", "user-tech", "王浩然", "P1", "2026-09-30", 8, 3, "MANUAL", "okr-core-request", "okr-core-hash", "user-tech", "user-tech");
  String tech=login("tech");
  var response=mockMvc.perform(get("/api/okr/work?ownerId=user-tech").header("Authorization","Bearer "+tech))
    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  boolean found=false;
  for(var item:objectMapper.readTree(response).path("data")){
   if("okr-core-work".equals(item.path("sourceId").asText())){assertEquals("work_item:okr-core-work",item.path("id").asText());found=true;}
  }
  assertTrue(found,"统一工作项应进入 OKR 工作项证据列表");
 }
 @Test void transferredRequirementWorkItemCanBeSubmittedFromLegacyReviewDraft()throws Exception{
  String admin=login("admin"),tech=login("tech");reporting(admin,"user-admin","",true);reporting(admin,"user-tech","user-admin",false);
  String transferredId=jdbc.queryForObject("SELECT id_ FROM t_product_work_item WHERE tenant_id_='local-tenant' AND category_='dev' AND delete_flag_=0 LIMIT 1",String.class);
  String sourceRequirementId=jdbc.queryForObject("SELECT id_ FROM t_product_work_item WHERE tenant_id_='local-tenant' AND category_='requirement' AND delete_flag_=0 LIMIT 1",String.class);
  jdbc.update("UPDATE t_product_work_item SET title_='转派给我的工单',assignee_id_='user-tech',assignee_name_='王浩然',requirement_id_=?,source_type_='WORK_ORDER',work_order_type_='研发任务',update_time_='2026-09-15 10:00:00' WHERE id_=?",sourceRequirementId,transferredId);
  String workJson=mockMvc.perform(get("/api/okr/work?ownerId=user-tech").header("Authorization","Bearer "+tech)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
  String workId="";for(var item:objectMapper.readTree(workJson).path("data"))if(transferredId.equals(item.path("sourceId").asText())){workId=item.path("id").asText();assertEquals("dev",item.path("kind").asText());}assertFalse(workId.isBlank());
  var payload=new java.util.LinkedHashMap<String,Object>();
  payload.put("title","旧草稿兼容提交");payload.put("startDate","2026-09-14");payload.put("endDate","2026-09-20");payload.put("reviewMode","structured");payload.put("reviewType","week");payload.put("selfScore",90);payload.put("krReviews",List.of());payload.put("assistance",List.of());payload.put("extraWork",Map.of("workIds",List.of(workId),"description","","impact","无明显影响"));payload.put("syncKrProgress",false);payload.put("items",List.of(Map.of("workId",workId)));
  String draft=create(tech,"review",payload);
  action(tech,draft,"submit",0);
  var saved=objectMapper.readTree(jdbc.queryForObject("SELECT payload_ FROM t_okr_record WHERE id_=?",String.class,draft));
  assertEquals("none",saved.path("extraWork").path("impact").asText());assertEquals("task",saved.path("items").get(0).path("workType").asText());
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

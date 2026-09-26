package com.shichuang.manage.okr.service;
import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.okr.mapper.OkrMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
@Service public class OkrService {
 private final OkrMapper mapper; private final ObjectMapper json;
 public OkrService(OkrMapper mapper,ObjectMapper json){this.mapper=mapper;this.json=json;}
 public List<Map<String,Object>> people(){AuthorizationService.requireRead("okr"); return mapper.people(RequestContext.tenantId());}
 private String supervisor(String owner){return people().stream().filter(p->owner.equals(p.get("id"))).map(p->Objects.toString(p.get("supervisorId"),"")).findFirst().orElse("");}
 public List<Map<String,Object>> records(){
  AuthorizationService.requireRead("okr");
  String me=RequestContext.userId();var reporting=people();
  var meProfile=reporting.stream().filter(p->me.equals(p.get("id"))).findFirst().orElse(Map.of());
  String boss=Objects.toString(meProfile.get("supervisorId"),"");
  var reports=new HashSet<String>();for(var p:reporting)if(me.equals(p.get("supervisorId")))reports.add(p.get("id").toString());
  var all=mapper.records(RequestContext.tenantId());var visibleOwners=new HashSet<String>();visibleOwners.add(me);visibleOwners.addAll(reports);
  boolean root=((Number)meProfile.getOrDefault("rootFlag",0)).intValue()==1;
  if(root){
   for(var record:all)if("objective".equals(record.get("kind"))&&me.equals(record.get("ownerId")))for(var kr:rows(payload(record.get("payload")).getOrDefault("keyResults",List.of()))){Object ids=kr.get("assigneeIds");if(ids instanceof List<?> assignees)for(Object id:assignees)visibleOwners.add(Objects.toString(id,""));}
   for(var record:all)if("action".equals(record.get("kind"))&&me.equals(record.get("ownerId"))){var action=payload(record.get("payload"));String parentId=Objects.toString(action.get("parentActionId"),"");if(!parentId.isBlank()&&all.stream().anyMatch(candidate->"action".equals(candidate.get("kind"))&&parentId.equals(candidate.get("id"))&&me.equals(candidate.get("ownerId")))){Object ids=action.get("assigneeIds");if(ids instanceof List<?> assignees)for(Object id:assignees)visibleOwners.add(Objects.toString(id,""));}}
   boolean changed;do{changed=false;for(var record:all)if("action".equals(record.get("kind"))&&visibleOwners.contains(record.get("ownerId"))){Object ids=payload(record.get("payload")).get("assigneeIds");if(ids instanceof List<?> assignees)for(Object id:assignees)changed|=visibleOwners.add(Objects.toString(id,""));}}while(changed);
  }
  return all.stream().filter(r->visibleOwners.contains(r.get("ownerId"))||"objective".equals(r.get("kind"))&&boss.equals(r.get("ownerId"))).toList();
 }
 public List<Map<String,Object>> actionParents(String period){
  AuthorizationService.requireRead("okr");
  String me=RequestContext.userId();
  var people=people();
  String boss=people.stream().filter(p->me.equals(p.get("id"))).map(p->Objects.toString(p.get("supervisorId"),"")).findFirst().orElse("");
  var all=mapper.records(RequestContext.tenantId());
  var result=new ArrayList<Map<String,Object>>();
  var actionsById=new HashMap<String,Map<String,Object>>();for(var record:all)if("action".equals(record.get("kind"))&&period.equals(record.get("periodKey")))actionsById.put(Objects.toString(record.get("id")),record);
  var seen=new HashSet<String>();
  for(var record:all){
   if(!"objective".equals(record.get("kind"))||!period.equals(record.get("periodKey"))||!Set.of("active","submitted","reviewed").contains(record.get("status"))||!boss.equals(Objects.toString(record.get("ownerId"),"")))continue;
   for(var kr:rows(payload(record.get("payload")).getOrDefault("keyResults",List.of())))if(assignedTo(kr,me)){
    String id=Objects.toString(kr.get("id"),"");if(seen.add(id)){var item=new LinkedHashMap<String,Object>();item.put("id",id);item.put("kind","action");item.put("ownerId",record.get("ownerId"));item.put("periodKey",period);item.put("status",record.get("status"));item.put("version",record.get("version"));item.put("parentObjectiveId",record.get("id"));item.put("parentKeyResultId",id);item.put("payload",Map.of("title",kr.get("title"),"parentObjectiveId",record.get("id"),"parentActionId",id,"parentKeyResultId",id));result.add(item);}
   }
  }
  var currentProfile=people.stream().filter(p->me.equals(p.get("id"))).findFirst().orElse(Map.of());boolean organizationRoot=((Number)currentProfile.getOrDefault("rootFlag",0)).intValue()==1;
  for(var child:actionsById.values()){
   if(organizationRoot||!Set.of("active","submitted","reviewed").contains(child.get("status"))||!me.equals(child.get("ownerId")))continue;
   var childPayload=payload(child.get("payload"));String parentId=Objects.toString(childPayload.get("parentActionId"),"");var parent=actionsById.get(parentId);
   if(parent==null||me.equals(parent.get("ownerId")))continue;
   var parentPayload=payload(parent.get("payload"));String objectiveId=Objects.toString(parentPayload.get("parentObjectiveId"),"");String keyResultId=Objects.toString(parentPayload.getOrDefault("parentKeyResultId",parentId),parentId);String key=parentId+":"+objectiveId+":"+keyResultId;
   if(!seen.add(key))continue;
   var item=new LinkedHashMap<String,Object>();item.put("id",parentId);item.put("kind","action");item.put("ownerId",parent.get("ownerId"));item.put("periodKey",period);item.put("status",parent.get("status"));item.put("version",parent.get("version"));item.put("parentObjectiveId",objectiveId);item.put("parentKeyResultId",keyResultId);item.put("payload",Map.of("title",parentPayload.get("title"),"parentObjectiveId",objectiveId,"parentActionId",parentId,"parentKeyResultId",keyResultId));result.add(item);
  }
  return result;
 }
 private boolean assignedTo(Map<String,Object> payload,String user){Object ids=payload.get("assigneeIds");if(ids instanceof List<?> list&&list.stream().map(Object::toString).anyMatch(user::equals))return true;return user.equals(Objects.toString(payload.get("assigneeId"),""));}
 @Transactional public Map<String,Object> createAction(Map<String,Object> body){
  String period=required(body,"periodKey");var input=payload(body.getOrDefault("payload",Map.of()));String creator=RequestContext.userId();
  required(input,"title");String parentAction=required(input,"parentActionId");String parentObjective=required(input,"parentObjectiveId");String parentKeyResult=Objects.toString(input.get("parentKeyResultId"),parentAction);
  var parents=actionParents(period);var parent=parents.stream().filter(r->parentAction.equals(r.get("id"))&&parentObjective.equals(r.get("parentObjectiveId"))&&parentKeyResult.equals(r.get("parentKeyResultId"))).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN,"上级动作未指定给当前用户或已变更"));
  String department=required(input,"department"),type=required(input,"structureType");
  if(!Set.of("product","presales","delivery","support").contains(type))throw new IllegalArgumentException("部门结构类型无效");
  required(input,"deadline");try{java.time.LocalDate.parse(input.get("deadline").toString());}catch(Exception e){throw new IllegalArgumentException("完成时间无效");}
  integer(input.get("weight"),1,100);if(type.equals("support"))required(input,"acceptanceStandard");else required(input,"milestone");
  if(type.equals("product"))required(input,"productLine");else if(Set.of("presales","delivery").contains(type))required(input,"businessObject");
  String assignee=Objects.toString(input.get("assigneeId"),"");if(!assignee.isBlank())person(assignee);
  if(input.containsKey("assigneeIds")){if(!(input.get("assigneeIds") instanceof List<?> ids)||ids.size()>100)throw new IllegalArgumentException("承接人员格式无效");for(Object id:ids)person(Objects.toString(id,""));}
  input.put("creatorId",creator);input.put("parentActionId",parentAction);input.put("parentObjectiveId",parentObjective);input.put("parentKeyResultId",parentKeyResult);
  boolean submit=Boolean.TRUE.equals(body.get("submit"));String state=submit?"active":"draft";
  String id=UUID.randomUUID().toString(),data=encode(input);mapper.insert(RequestContext.tenantId(),id,"action",creator,period,state,data);mapper.event(RequestContext.tenantId(),id,submit?"submit_action":"draft_action",creator,data);return Map.of("id",id,"status",state,"version",0);
 }
 private Map<String,Object> record(String id){return records().stream().filter(r->id.equals(r.get("id"))).findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"记录不存在或无权访问"));}
 public List<Map<String,Object>> events(String id){record(id);return mapper.events(RequestContext.tenantId(),id);}
 private String encode(Object v){try{return json.writeValueAsString(v);}catch(Exception e){throw new IllegalArgumentException("数据格式无效",e);}}
 private String required(Map<String,Object>b,String k){String v=Objects.toString(b.get(k),"").trim();if(v.isBlank()||v.length()>2000)throw new IllegalArgumentException("请检查字段："+k);return v;}
 private Map<String,Object> payload(Object value){
  try { if(value instanceof String text)return json.readValue(text,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});return json.convertValue(value,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){}); }
  catch(Exception e){throw new IllegalArgumentException("记录格式无效",e);}
 }
 private Map<String,Object> person(String id){return people().stream().filter(p->id.equals(p.get("id"))).findFirst().orElseThrow(()->new IllegalArgumentException("人员不存在或已停用"));}
 private Map<String,Object> inputPayload(Object input,String kind){
  var value=payload(input);var result=new LinkedHashMap<String,Object>();
  var keys="objective".equals(kind)?List.of("title","parentObjectiveId","parentKeyResultId","alignments","keyResults","weight","deadline","objectiveType","note"):List.of("title","startDate","endDate","summary","items","reviewMode","reviewType","selfScore","uncompletedReason","suggestions","helpNeeded","sendTo","krReviews","assistance","extraWork","syncKrProgress","weeklyReviewIds","monthlyOtherTasks","nextMonthPlans","otherNotes","nextMonthArrangement");
  for(String key:keys)if(value.containsKey(key))result.put(key,value.get(key));
  if("review".equals(kind)){
   var items=new ArrayList<Map<String,Object>>();
   for(var entry:rows(result.getOrDefault("items",List.of()))){var clean=new LinkedHashMap<String,Object>();for(String key:List.of("workId","objectiveId","keyResultId","affectedObjectiveId","affectedKeyResultId","result","impact"))if(entry.containsKey(key))clean.put(key,entry.get(key));items.add(clean);}
   result.put("items",items);
   if(Set.of("structured","monthly").contains(Objects.toString(result.get("reviewMode"),""))){
    var reviews=new ArrayList<Map<String,Object>>();
    for(var entry:rows(result.getOrDefault("krReviews",List.of()))){var clean=new LinkedHashMap<String,Object>();for(String key:List.of("objectiveId","objectiveTitle","keyResultId","keyResultTitle","previousProgress","currentProgress","health","achievement","blocker","nextPlan","evidenceNote","workIds"))if(entry.containsKey(key))clean.put(key,entry.get(key));reviews.add(clean);}result.put("krReviews",reviews);
    var assistance=new ArrayList<Map<String,Object>>();for(var entry:rows(result.getOrDefault("assistance",List.of()))){var clean=new LinkedHashMap<String,Object>();for(String key:List.of("subject","result"))if(entry.containsKey(key))clean.put(key,entry.get(key));assistance.add(clean);}result.put("assistance",assistance);
    if(result.containsKey("extraWork")){var source=payload(result.get("extraWork"));var clean=new LinkedHashMap<String,Object>();for(String key:List.of("workIds","description","impact","notes"))if(source.containsKey(key))clean.put(key,source.get(key));result.put("extraWork",clean);}
    if("monthly".equals(result.get("reviewMode"))){
     var tasks=new ArrayList<Map<String,Object>>();for(var entry:rows(result.getOrDefault("monthlyOtherTasks",List.of()))){var clean=new LinkedHashMap<String,Object>();for(String key:List.of("id","content","result","status","sourceReviewId","workId"))if(entry.containsKey(key))clean.put(key,entry.get(key));tasks.add(clean);}result.put("monthlyOtherTasks",tasks);
     var plans=new ArrayList<Map<String,Object>>();for(var entry:rows(result.getOrDefault("nextMonthPlans",List.of()))){var clean=new LinkedHashMap<String,Object>();for(String key:List.of("id","content","objectiveId","keyResultId","plannedDate"))if(entry.containsKey(key))clean.put(key,entry.get(key));plans.add(clean);}result.put("nextMonthPlans",plans);
    }
   }
  }
  return result;
 }
 private boolean root(String id){return ((Number)person(id).get("rootFlag")).intValue()==1;}
 private String normalizeImpact(Object value){
  return switch(Objects.toString(value,"").trim()){
   case "无明显影响" -> "none";
   case "挤占 KR 投入" -> "block";
   case "支持 KR" -> "support";
   default -> Objects.toString(value,"").trim();
  };
 }
 private int integer(Object value,int min,int max){if(!(value instanceof Number n)||n.doubleValue()!=n.intValue()||n.intValue()<min||n.intValue()>max)throw new IllegalArgumentException("数值范围须为 "+min+" 至 "+max);return n.intValue();}
 private List<Map<String,Object>> rows(Object value){if(!(value instanceof List<?> list)||list.size()>500)throw new IllegalArgumentException("请检查明细数量");return list.stream().map(this::payload).toList();}
 private void validateObjective(String owner,String period,Map<String,Object> p){
  required(p,"title");
  String objectiveType=Objects.toString(p.getOrDefault("objectiveType","target"),"");
  if(!Set.of("target","challenge").contains(objectiveType))throw new IllegalArgumentException("目标类型须为目标型或挑战型");
  p.put("objectiveType",objectiveType);
  if(p.containsKey("note")&&(!(p.get("note") instanceof String note)||note.length()>2000))throw new IllegalArgumentException("备注不能超过 2000 字");
  if(p.containsKey("weight"))integer(p.get("weight"),0,100);
  if(p.containsKey("deadline"))try{java.time.LocalDate.parse(required(p,"deadline"));}catch(java.time.format.DateTimeParseException e){throw new IllegalArgumentException("目标截止日期无效");}
  java.time.YearMonth month;
  try{month=java.time.YearMonth.parse(period);}catch(Exception e){throw new IllegalArgumentException("目标周期须为月份");}
  String boss=supervisor(owner);
  var alignments=new ArrayList<Map<String,Object>>(p.containsKey("alignments")?rows(p.get("alignments")):List.of());
  if(alignments.size()>20)throw new IllegalArgumentException("对齐目标不能超过 20 个");
  if(alignments.isEmpty()&&!Objects.toString(p.get("parentObjectiveId"),"").isBlank())alignments.add(new LinkedHashMap<>(Map.of("parentObjectiveId",p.get("parentObjectiveId"),"parentKeyResultId",Objects.toString(p.get("parentKeyResultId"),""))));
  var parentIds=new HashSet<String>();
  for(var alignment:alignments){
   String parentId=Objects.toString(alignment.get("parentObjectiveId"),"");String kr=Objects.toString(alignment.get("parentKeyResultId"),"");
   if(parentId.isBlank())throw new IllegalArgumentException("对齐目标不能为空");
   if(!parentIds.add(parentId))throw new IllegalArgumentException("同一目标只能添加一次对齐");
   Map<String,Object> parent=record(parentId);
   OkrPolicy.requireParent(owner,boss.isBlank()?null:boss,parent.get("ownerId").toString(),parent.get("status").toString(),root(owner));
   if(!"objective".equals(parent.get("kind"))||!period.equals(parent.get("periodKey")))throw new IllegalArgumentException("请选择同周期的上级目标");
   if(!kr.isBlank()&&rows(payload(parent.get("payload")).get("keyResults")).stream().noneMatch(r->kr.equals(r.get("id"))))throw new IllegalArgumentException("上级 KR 已变更");
   var clean=new LinkedHashMap<String,Object>();clean.put("parentObjectiveId",parentId);if(!kr.isBlank())clean.put("parentKeyResultId",kr);alignment.clear();alignment.putAll(clean);
  }
  p.put("alignments",alignments);
  if(!alignments.isEmpty()){p.put("parentObjectiveId",alignments.get(0).get("parentObjectiveId"));if(alignments.get(0).containsKey("parentKeyResultId"))p.put("parentKeyResultId",alignments.get(0).get("parentKeyResultId"));else p.remove("parentKeyResultId");}
  var krs=rows(p.get("keyResults"));var ids=new HashSet<String>();
  for(var kr:krs){
   if(!ids.add(required(kr,"id")))throw new IllegalArgumentException("KR 不能重复");required(kr,"title");integer(kr.getOrDefault("progress",0),0,100);
   if(kr.containsKey("assigneeIds")){if(!(kr.get("assigneeIds") instanceof List<?> assignees)||assignees.size()>100)throw new IllegalArgumentException("动作承接人员格式无效");for(Object assignee:assignees)person(Objects.toString(assignee,""));}
   if(kr.containsKey("deadline"))try{
    var date=java.time.LocalDate.parse(required(kr,"deadline"));
    if(p.containsKey("deadline")&&date.isAfter(java.time.LocalDate.parse(p.get("deadline").toString())))throw new IllegalArgumentException("KR 截止日期不能晚于目标截止日期");
   }catch(java.time.format.DateTimeParseException e){throw new IllegalArgumentException("KR 截止日期无效");}
  }
  OkrPolicy.weights(krs.stream().map(kr->integer(kr.get("weight"),1,100)).toList());
  p.put("progress",OkrPolicy.progress(krs.stream().map(kr->((Number)kr.get("weight")).intValue()).toList(),krs.stream().map(kr->((Number)kr.getOrDefault("progress",0)).intValue()).toList()));
 }
 public List<Map<String,Object>> work(String owner){
  String me=RequestContext.userId();if(!owner.equals(me)&&!me.equals(supervisor(owner)))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"无权查询该人员工作项");
  String name=person(owner).get("name").toString();
  if(people().stream().filter(p->name.equals(p.get("name"))).count()!=1)throw new IllegalArgumentException("存在同名人员，需先完善工作项负责人标识");
  var work=mapper.work(RequestContext.tenantId(),name);var links=mapper.links(RequestContext.tenantId(),owner);
  for(var item:work){var link=links.stream().filter(l->item.get("id").equals(l.get("workId"))).findFirst();item.put("linkVersion",-1);link.ifPresent(item::putAll);}
  return work;
 }
 private void validateReview(String owner,Map<String,Object> p,boolean submitting){
  required(p,"title");
  java.time.LocalDate start,end;try{start=java.time.LocalDate.parse(required(p,"startDate"));end=java.time.LocalDate.parse(required(p,"endDate"));}catch(java.time.format.DateTimeParseException e){throw new IllegalArgumentException("复盘日期无效");}
  OkrPolicy.period(start,end);
  String reviewMode=Objects.toString(p.get("reviewMode"),"");
  boolean completedOnly="completed".equals(reviewMode);
  boolean monthly="monthly".equals(reviewMode),structured="structured".equals(reviewMode)||monthly;
  if(!reviewMode.isBlank()&&!completedOnly&&!structured)throw new IllegalArgumentException("复盘模式无效");
  if(structured){
   if(!Set.of("week","month").contains(Objects.toString(p.get("reviewType"),"")))throw new IllegalArgumentException("请选择周或月复盘");
   if(monthly&&!"month".equals(p.get("reviewType")))throw new IllegalArgumentException("月复盘模式只能保存月报");
   integer(p.get("selfScore"),0,100);var reviewIds=new HashSet<String>();
   for(var entry:rows(p.getOrDefault("krReviews",List.of()))){
    String objectiveId=required(entry,"objectiveId"),krId=required(entry,"keyResultId");if(!reviewIds.add(krId))throw new IllegalArgumentException("同一 KR 不能重复复盘");
    var objective=record(objectiveId);if(!owner.equals(objective.get("ownerId"))||!"objective".equals(objective.get("kind")))throw new IllegalArgumentException("只能复盘本人的目标");
    var kr=rows(payload(objective.get("payload")).get("keyResults")).stream().filter(k->krId.equals(k.get("id"))).findFirst().orElseThrow(()->new IllegalArgumentException("KR 不存在或已变更"));
    entry.put("objectiveTitle",payload(objective.get("payload")).get("title"));entry.put("keyResultTitle",kr.get("title"));integer(entry.get("previousProgress"),0,100);integer(entry.get("currentProgress"),0,100);
    if(!Set.of("normal","risk","blocked").contains(Objects.toString(entry.get("health"),"")))throw new IllegalArgumentException("KR 健康状态无效");
    for(String key:List.of("achievement","blocker","nextPlan","evidenceNote"))if(Objects.toString(entry.get(key),"").length()>2000)throw new IllegalArgumentException("KR 复盘文本不能超过2000字");
    if(monthly&&submitting&&Objects.toString(entry.get("achievement"),"").isBlank())throw new IllegalArgumentException("请补充所有 KR 的本月结果");
    if(submitting&&!"normal".equals(entry.get("health"))&&Objects.toString(entry.get("blocker"),"").isBlank())throw new IllegalArgumentException("风险或阻塞 KR 必须填写风险原因及所需支持");
    if(!(entry.getOrDefault("workIds",List.of()) instanceof List<?> ids)||ids.size()>100)throw new IllegalArgumentException("KR 工作证据格式无效");
   }
   for(var entry:rows(p.getOrDefault("assistance",List.of())))for(String key:List.of("subject","result"))if(Objects.toString(entry.get(key),"").length()>500)throw new IllegalArgumentException("协助事项不能超过500字");
   var extra=payload(p.getOrDefault("extraWork",Map.of()));String impact=normalizeImpact(extra.get("impact"));extra.put("impact",impact);p.put("extraWork",extra);for(String key:List.of("description","impact"))if(Objects.toString(extra.get(key),"").length()>2000)throw new IllegalArgumentException("额外工作说明不能超过2000字");if(!Set.of("","none","support","block").contains(impact))throw new IllegalArgumentException("额外工作影响类型无效");if(!(extra.getOrDefault("workIds",List.of()) instanceof List<?> ids)||ids.size()>100)throw new IllegalArgumentException("额外工作关联格式无效");if(extra.containsKey("notes")){var notes=payload(extra.get("notes"));if(notes.size()>100||notes.values().stream().anyMatch(value->Objects.toString(value,"").length()>500)||notes.keySet().stream().anyMatch(key->!ids.contains(key)))throw new IllegalArgumentException("额外工作说明格式无效");}
   if(!(p.getOrDefault("syncKrProgress",false) instanceof Boolean))throw new IllegalArgumentException("同步进度选项无效");
   if(monthly)validateMonthlyReview(owner,start,end,p,submitting);
  }
  if(completedOnly){
   if(!Set.of("week","month").contains(Objects.toString(p.get("reviewType"),"")))throw new IllegalArgumentException("请选择周或月复盘");
   integer(p.get("selfScore"),0,100);
   if(submitting)required(p,"summary");
   for(String key:List.of("summary","uncompletedReason","suggestions","helpNeeded"))if(Objects.toString(p.get(key),"").length()>2000)throw new IllegalArgumentException("复盘文本不能超过2000字");
   if(!(p.get("sendTo") instanceof List<?> recipients)||recipients.size()>100||recipients.stream().anyMatch(v->!(v instanceof String text)||text.length()>100))throw new IllegalArgumentException("参与人格式无效");
  }
  var available=work(owner);var seen=new HashSet<String>();
  var entries=rows(p.getOrDefault("items",List.of()));
  for(var entry:entries){
   String id=required(entry,"workId");if(!seen.add(id))throw new IllegalArgumentException("同一工作项不能重复计入复盘");
   var source=available.stream().filter(w->id.equals(w.get("id"))).findFirst().orElseThrow(()->new IllegalArgumentException("关联工作项已删除或不属于本人"));
   var created=java.time.LocalDate.parse(source.get("createdAt").toString().substring(0,10));
   var updated=java.time.LocalDate.parse(source.get("updatedAt").toString().substring(0,10));
   if(created.isAfter(end)||Set.of("已完成","已发布","已验收","已关闭","已取消","已驳回").contains(source.get("status"))&&updated.isBefore(start))throw new IllegalArgumentException("工作项不在本期范围内，请重新归集");
   entry.put("title",source.get("title"));entry.put("status",source.get("status"));entry.put("sourceWorkOrderIds",source.get("sourceWorkOrderIds"));String sourceKind=Objects.toString(source.get("kind"),"").toLowerCase();entry.put("workType",sourceKind.contains("work_order")||sourceKind.contains("ticket")||"product_requirement".equals(sourceKind)||"requirement_work_item".equals(sourceKind)?"ticket":"task");
   if(completedOnly){
    OkrPolicy.completedWork(source.get("status").toString(),updated,start,end);
    entry.remove("objectiveId");entry.remove("keyResultId");entry.remove("affectedObjectiveId");entry.remove("affectedKeyResultId");
   }else if(!structured&&submitting)required(entry,"result");
   String affected=Objects.toString(entry.get("affectedObjectiveId"),"");
   if(!affected.isBlank()){
    var target=record(affected);
    if(!owner.equals(target.get("ownerId"))||!"objective".equals(target.get("kind")))throw new IllegalArgumentException("受影响目标必须属于本人");
    var month=java.time.YearMonth.parse(target.get("periodKey").toString());
    if(month.atEndOfMonth().isBefore(start)||month.atDay(1).isAfter(end))throw new IllegalArgumentException("受影响目标不属于复盘周期");
    String affectedKr=required(entry,"affectedKeyResultId");
    if(rows(payload(target.get("payload")).get("keyResults")).stream().noneMatch(k->affectedKr.equals(k.get("id"))))throw new IllegalArgumentException("受影响 KR 不存在");
    if(submitting)required(entry,"impact");
   }else entry.remove("affectedKeyResultId");
   String objective=Objects.toString(entry.get("objectiveId"),"");
   if(!objective.isBlank()){
    var o=record(objective);if(!owner.equals(o.get("ownerId"))||!"objective".equals(o.get("kind")))throw new IllegalArgumentException("工作项只能归入本人目标");
    var month=java.time.YearMonth.parse(o.get("periodKey").toString());if(month.atEndOfMonth().isBefore(start)||month.atDay(1).isAfter(end))throw new IllegalArgumentException("关联目标不属于复盘周期");
    String kr=required(entry,"keyResultId");if(rows(payload(o.get("payload")).get("keyResults")).stream().noneMatch(k->kr.equals(k.get("id"))))throw new IllegalArgumentException("关联 KR 不存在");
   }
  }
  if(structured){
   var selected=new HashSet<String>();
   for(var review:rows(p.getOrDefault("krReviews",List.of())))for(Object value:(List<?>)review.getOrDefault("workIds",List.of()))if(!selected.add(Objects.toString(value,"")))throw new IllegalArgumentException("同一工作项只能关联一次");
   var extra=payload(p.getOrDefault("extraWork",Map.of()));for(Object value:(List<?>)extra.getOrDefault("workIds",List.of()))if(!selected.add(Objects.toString(value,"")))throw new IllegalArgumentException("同一工作项只能关联一次");
   if(!seen.equals(selected))throw new IllegalArgumentException("工作证据与关联明细不一致");
  }
  p.put("items",entries);
  if(submitting&&!root(owner)&&supervisor(owner).isBlank())throw new IllegalArgumentException("尚未配置复盘评价人");
 }
 private void validateMonthlyReview(String owner,java.time.LocalDate start,java.time.LocalDate end,Map<String,Object> p,boolean submitting){
  var month=java.time.YearMonth.from(start);
  if(!start.equals(month.atDay(1))||!end.equals(month.atEndOfMonth()))throw new IllegalArgumentException("月复盘周期须为完整自然月");
  String summary=Objects.toString(p.get("summary"),"").trim();if(submitting&&summary.isBlank())throw new IllegalArgumentException("请填写本月总结");
  Object sourceIds=p.getOrDefault("weeklyReviewIds",List.of());if(!(sourceIds instanceof List<?> ids)||ids.size()>10||ids.stream().anyMatch(value->!(value instanceof String)))throw new IllegalArgumentException("周复盘引用格式无效");
  var snapshots=new ArrayList<Map<String,Object>>();var uniqueIds=new LinkedHashSet<String>();
  for(Object value:ids){
   String id=value.toString();if(!uniqueIds.add(id))throw new IllegalArgumentException("同一周复盘不能重复引用");
   var source=record(id);var sourcePayload=payload(source.get("payload"));
   if(!owner.equals(source.get("ownerId"))||!"review".equals(source.get("kind"))||!"week".equals(sourcePayload.get("reviewType"))||!Set.of("submitted","reviewed").contains(source.get("status")))throw new IllegalArgumentException("只能引用本人已提交或已评价的周复盘");
   java.time.LocalDate sourceStart,sourceEnd;try{sourceStart=java.time.LocalDate.parse(required(sourcePayload,"startDate"));sourceEnd=java.time.LocalDate.parse(required(sourcePayload,"endDate"));}catch(java.time.format.DateTimeParseException e){throw new IllegalArgumentException("引用的周复盘日期无效");}
   if(sourceEnd.isBefore(start)||sourceStart.isAfter(end))throw new IllegalArgumentException("只能引用当前月份内的周复盘");
   var snapshot=new LinkedHashMap<String,Object>();snapshot.put("id",id);snapshot.put("title",sourcePayload.get("title"));snapshot.put("startDate",sourceStart.toString());snapshot.put("endDate",sourceEnd.toString());snapshot.put("status",source.get("status"));snapshot.put("summary",Objects.toString(sourcePayload.get("summary"),""));snapshot.put("krReviews",sourcePayload.getOrDefault("krReviews",List.of()));snapshot.put("assistance",sourcePayload.getOrDefault("assistance",List.of()));snapshot.put("extraWork",sourcePayload.getOrDefault("extraWork",Map.of()));snapshot.put("items",sourcePayload.getOrDefault("items",List.of()));snapshots.add(snapshot);
  }
  p.put("weeklyReviewIds",new ArrayList<>(uniqueIds));p.put("weeklyReviewSnapshots",snapshots);
  if(!(p.getOrDefault("otherNotes","") instanceof String))throw new IllegalArgumentException("其他补充格式无效");
  if(!(p.getOrDefault("nextMonthArrangement","") instanceof String nextMonthArrangement))throw new IllegalArgumentException("下个月安排格式无效");
  if(submitting&&nextMonthArrangement.trim().isBlank())throw new IllegalArgumentException("请填写下个月安排");
  var tasks=rows(p.getOrDefault("monthlyOtherTasks",List.of()));var taskIds=new HashSet<String>();
  for(var task:tasks){if(!taskIds.add(required(task,"id")))throw new IllegalArgumentException("其他任务不能重复");required(task,"content");if(Objects.toString(task.get("result"),"").length()>1000)throw new IllegalArgumentException("其他任务结果不能超过 1000 字");if(!Set.of("待处理","处理中","已完成","已阻塞").contains(Objects.toString(task.get("status"),"")))throw new IllegalArgumentException("其他任务状态无效");}
  var plans=rows(p.getOrDefault("nextMonthPlans",List.of()));var planIds=new HashSet<String>();
  for(var plan:plans){if(!planIds.add(required(plan,"id")))throw new IllegalArgumentException("下月安排不能重复");required(plan,"content");String date=Objects.toString(plan.get("plannedDate"),"");if(!date.isBlank())try{java.time.LocalDate.parse(date);}catch(java.time.format.DateTimeParseException e){throw new IllegalArgumentException("下月安排日期无效");}String objectiveId=Objects.toString(plan.get("objectiveId"),""),krId=Objects.toString(plan.get("keyResultId"),"");if(!krId.isBlank()&&objectiveId.isBlank())throw new IllegalArgumentException("下月安排关联目标无效");if(!objectiveId.isBlank()){var objective=record(objectiveId);if(!owner.equals(objective.get("ownerId"))||!"objective".equals(objective.get("kind")))throw new IllegalArgumentException("下月安排只能关联本人的目标");if(!krId.isBlank()&&rows(payload(objective.get("payload")).get("keyResults")).stream().noneMatch(kr->krId.equals(kr.get("id"))))throw new IllegalArgumentException("下月安排关联 KR 已变更");}}
 }
 private void syncReviewProgress(String owner,Map<String,Object> p){
  if(!Boolean.TRUE.equals(p.get("syncKrProgress")))return;
  var reviews=rows(p.getOrDefault("krReviews",List.of()));
  for(String objectiveId:reviews.stream().map(r->r.get("objectiveId").toString()).distinct().toList()){
   var record=record(objectiveId);if(!owner.equals(record.get("ownerId")))throw new IllegalArgumentException("只能同步本人的 KR");var payload=payload(record.get("payload"));var krs=rows(payload.get("keyResults"));
   for(var kr:krs)reviews.stream().filter(r->objectiveId.equals(r.get("objectiveId"))&&kr.get("id").equals(r.get("keyResultId"))).findFirst().ifPresent(r->kr.put("progress",r.get("currentProgress")));
   payload.put("keyResults",krs);payload.put("progress",OkrPolicy.progress(krs.stream().map(k->integer(k.get("weight"),1,100)).toList(),krs.stream().map(k->integer(k.get("progress"),0,100)).toList()));
   int version=((Number)record.get("version")).intValue();if(mapper.update(RequestContext.tenantId(),objectiveId,version,record.get("status").toString(),encode(payload),owner)!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"目标进度已变更，请刷新后重试");
  }
 }
 @Transactional public Map<String,Object> create(Map<String,Object>b){
  String kind=required(b,"kind"),period=required(b,"periodKey");if(!Set.of("objective","review").contains(kind))throw new IllegalArgumentException("记录类型无效");
  var p=inputPayload(b.getOrDefault("payload",Map.of()),kind);String owner=RequestContext.userId();
  boolean submit=Boolean.TRUE.equals(b.get("submit"));
  if("objective".equals(kind))validateObjective(owner,period,p);else {validateReview(owner,p,submit);if(submit)syncReviewProgress(owner,p);}
  String state=submit?("objective".equals(kind)?(root(owner)?"active":"pending_review"):"submitted"):"draft";
  String id=UUID.randomUUID().toString(),data=encode(p);mapper.insert(RequestContext.tenantId(),id,kind,owner,period,state,data);mapper.event(RequestContext.tenantId(),id,submit?"submit":"create",owner,data);return Map.of("id",id,"status",state,"version",0);
 }
 @Transactional public void update(String id,Map<String,Object>b){
  Map<String,Object>s=record(id);String owner=s.get("ownerId").toString(),state=s.get("status").toString(),action=required(b,"action"),kind=s.get("kind").toString();
  boolean own=owner.equals(RequestContext.userId()),reviewer=!own&&RequestContext.userId().equals(supervisor(owner));
  var p=payload(s.get("payload"));String next;
  if("action".equals(kind)){
   if(!own||!Set.of("draft").contains(state)||!Set.of("save","submit").contains(action))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"仅可编辑本人拆解动作草稿");
   p=payload(b.get("payload"));required(p,"title");required(p,"parentActionId");required(p,"parentObjectiveId");required(p,"department");required(p,"deadline");integer(p.get("weight"),1,100);String type=required(p,"structureType");if(!Set.of("product","presales","delivery","support").contains(type))throw new IllegalArgumentException("部门结构类型无效");if(type.equals("support"))required(p,"acceptanceStandard");else required(p,"milestone");if(type.equals("product"))required(p,"productLine");else if(Set.of("presales","delivery").contains(type))required(p,"businessObject");
   if(p.containsKey("assigneeIds")){if(!(p.get("assigneeIds") instanceof List<?> ids)||ids.size()>100)throw new IllegalArgumentException("承接人员格式无效");for(Object assigneeId:ids)person(Objects.toString(assigneeId,""));}
   String parentActionId=p.get("parentActionId").toString(), parentObjectiveId=p.get("parentObjectiveId").toString(),parentKeyResultId=Objects.toString(p.get("parentKeyResultId"),parentActionId);boolean parent=actionParents(s.get("periodKey").toString()).stream().anyMatch(r->parentActionId.equals(r.get("id"))&&parentObjectiveId.equals(r.get("parentObjectiveId"))&&parentKeyResultId.equals(r.get("parentKeyResultId")));if(!parent)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"上级动作未指定给当前用户或已变更");p.put("parentKeyResultId",parentKeyResultId);
   String actionState="submit".equals(action)?"active":"draft";int version=integer(b.get("version"),0,Integer.MAX_VALUE);
   if(mapper.update(RequestContext.tenantId(),id,version,actionState,encode(p),RequestContext.userId())!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"拆解动作已变更，请刷新后重试");
   mapper.event(RequestContext.tenantId(),id,action,RequestContext.userId(),encode(Map.of("from",state,"to",actionState,"payload",p)));return;
  }
  if("save".equals(action)&&own&&Set.of("draft","returned").contains(state)){next=state;p=inputPayload(b.get("payload"),kind);}
  else if("progress".equals(action)&&own&&"active".equals(state)&&"objective".equals(kind)){
   next=state;var values=rows(b.get("keyResults"));var existing=rows(p.get("keyResults"));
   if(values.size()!=existing.size())throw new IllegalArgumentException("KR 数量已变化");
   for(var kr:existing){var value=values.stream().filter(v->kr.get("id").equals(v.get("id"))).findFirst().orElseThrow(()->new IllegalArgumentException("KR 已变化"));kr.put("progress",integer(value.get("progress"),0,100));}
   p.put("keyResults",existing);
  }else if("submit".equals(action)&&own&&root(owner)&&"objective".equals(kind)&&Set.of("draft","returned").contains(state))next="active";
  else next=OkrPolicy.transition(kind,state,action,own,reviewer);
  if("objective".equals(kind)){
   if(Set.of("save","submit","approve").contains(action))validateObjective(owner,s.get("periodKey").toString(),p);
   else {var krs=rows(p.get("keyResults"));p.put("progress",OkrPolicy.progress(krs.stream().map(k->integer(k.get("weight"),1,100)).toList(),krs.stream().map(k->integer(k.get("progress"),0,100)).toList()));}
  }else if(Set.of("save","submit").contains(action))validateReview(owner,p,"submit".equals(action));
  if("return".equals(action))p.put("feedback",required(b,"feedback"));
  if("submit".equals(action)&&"review".equals(kind)){
   p.put("objectiveSnapshots",records().stream().filter(r->owner.equals(r.get("ownerId"))&&"objective".equals(r.get("kind"))).map(r->Map.of("id",r.get("id"),"period",r.get("periodKey"),"payload",payload(r.get("payload")))).toList());
  }
  if("approve".equals(action)&&"review".equals(kind)){
   p.put("feedback",required(b,"feedback"));p.put("finalScore",integer(b.get("finalScore"),0,100));p.put("evaluation",required(b,"evaluation"));
   var entries=rows(p.getOrDefault("items",List.of()));var included=b.getOrDefault("includedWorkIds",List.of());
   if(!(included instanceof List<?> selected))throw new IllegalArgumentException("请确认计划外贡献");
   for(var entry:entries)entry.put("included",!Objects.toString(entry.get("objectiveId"),"").isBlank()||selected.contains(entry.get("workId")));
   p.put("items",entries);
  }
  int version=integer(b.get("version"),0,Integer.MAX_VALUE);
  if(mapper.update(RequestContext.tenantId(),id,version,next,encode(p),RequestContext.userId())!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"记录已变更，请刷新后重试");
  mapper.event(RequestContext.tenantId(),id,action,RequestContext.userId(),encode(Map.of("from",state,"to",next,"payload",p)));
 }
 @Transactional public void reporting(String employee,Map<String,Object> b){
  if(!"admin".equals(RequestContext.role()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"仅管理员可配置组织关系");
  mapper.lockOrganization(RequestContext.tenantId());person(employee);String supervisor=Objects.toString(b.get("supervisorId"),"");boolean root=Boolean.TRUE.equals(b.get("root"));
  if(root&&!supervisor.isBlank()||!root&&supervisor.isBlank())throw new IllegalArgumentException("组织根目标负责人和直属上级只能选择一种");
  if(!supervisor.isBlank()){person(supervisor);String cursor=supervisor;var visited=new HashSet<String>();while(!cursor.isBlank()){if(employee.equals(cursor)||!visited.add(cursor))throw new IllegalArgumentException("直属关系不能形成循环");cursor=supervisor(cursor);}}
  if(mapper.reporting(RequestContext.tenantId(),employee,supervisor.isBlank()?null:supervisor,root,integer(b.get("version"),-1,Integer.MAX_VALUE),RequestContext.userId())!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"关系已更新，请刷新");
  mapper.event(RequestContext.tenantId(),employee,"reporting",RequestContext.userId(),encode(b));
 }
 @Transactional public void link(Map<String,Object>b){
  String owner=RequestContext.userId(),id=required(b,"workId"),objective=Objects.toString(b.get("objectiveId"),""),kr=Objects.toString(b.get("keyResultId"),"");
  if(work(owner).stream().noneMatch(w->id.equals(w.get("id"))))throw new IllegalArgumentException("工作项不存在或无权关联");
  if(!objective.isBlank()){
   var o=record(objective);if(!owner.equals(o.get("ownerId"))||!"objective".equals(o.get("kind"))||!"active".equals(o.get("status")))throw new IllegalArgumentException("请选择本人执行中的目标");
   if(rows(payload(o.get("payload")).get("keyResults")).stream().noneMatch(k->kr.equals(k.get("id"))))throw new IllegalArgumentException("请选择目标下的 KR");
  }
  if(mapper.link(RequestContext.tenantId(),owner,id,objective.isBlank()?null:objective,objective.isBlank()?null:kr,integer(b.get("version"),-1,Integer.MAX_VALUE))!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"关联已变更，请刷新");
  mapper.event(RequestContext.tenantId(),owner,"link",owner,encode(b));
 }
}

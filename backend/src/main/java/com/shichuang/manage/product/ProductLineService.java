package com.shichuang.manage.product;
import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.auth.AuthorizationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class ProductLineService {
 private final ProductLineMapper mapper;
 private final RequirementService requirementService;
 private final WorkItemAccess workItemAccess;
 private final WorkItemConfigurationService workItemConfigurations;
 public ProductLineService(ProductLineMapper mapper,RequirementService requirementService,WorkItemAccess workItemAccess,WorkItemConfigurationService workItemConfigurations){this.mapper=mapper;this.requirementService=requirementService;this.workItemAccess=workItemAccess;this.workItemConfigurations=workItemConfigurations;}
 public List<Map<String,Object>> list(String keyword){
  AuthorizationService.requireRead("product");
  String tenant=RequestContext.tenantId();
  List<Map<String,Object>> lines=mapper.list(tenant,keyword==null?"":keyword.trim(),RequestContext.userId(),"admin".equals(RequestContext.role()));
  List<String> ids=lines.stream().map(line->String.valueOf(line.get("id"))).toList();
  Map<String,List<Map<String,Object>>> members=groupByLine(mapper.membersForLines(tenant,ids));
  Map<String,List<Map<String,Object>>> types=groupByLine(mapper.workItemTypesForLines(tenant,ids));
  Map<String,List<Map<String,Object>>> versions=groupByLine(mapper.versionsForLines(tenant,ids));
  Map<String,List<Map<String,Object>>> activities=groupByLine(mapper.activitiesForLines(tenant,ids));
  Map<String,Map<String,Object>> stats=mapper.workItemStatsForLines(tenant,ids).stream().collect(java.util.stream.Collectors.toMap(row->String.valueOf(row.get("productLineId")),row->row));
  lines.forEach(line->{String id=String.valueOf(line.get("id"));line.put("members",members.getOrDefault(id,List.of()));line.put("workItemTypes",types.getOrDefault(id,List.of()));line.put("versions",versions.getOrDefault(id,List.of()));line.put("activities",activities.getOrDefault(id,List.of()));line.put("pendingRequirementCount",stats.getOrDefault(id,Map.of()).getOrDefault("pendingRequirementCount",0));});
  return lines;
 }
 public Map<String,Object> detail(String id){AuthorizationService.requireRead("product"); Map<String,Object> line=mapper.find(RequestContext.tenantId(),id); if(line==null) throw new NoSuchElementException("产品线不存在"); line.put("requirements",mapper.requirements(RequestContext.tenantId(),id)); return enrich(line);}
 @Transactional public Map<String,Object> create(Map<String,Object>b){ AuthorizationService.requireWrite("product");
  if(String.valueOf(b.getOrDefault("name","")).isBlank()) throw new IllegalArgumentException("产品线名称不能为空");
  if(b.containsKey("website")) b.put("website",normalizeWebsite(b.get("website")));
  if(!b.containsKey("description") || String.valueOf(b.get("description")).isBlank()) b.put("description","该产品线还没有任何简介内容。");
  resolveResponsibility(b,"ownerUserId","ownerName",true,null);
  resolveResponsibility(b,"requirementOwnerUserId","requirementOwner",false,null);
  resolveResponsibility(b,"techOwnerUserId","techOwner",false,null);
  resolveResponsibility(b,"testOwnerUserId","testOwner",false,null);
  String id=UUID.randomUUID().toString(); String code=String.valueOf(b.getOrDefault("code","PL-"+String.format("%03d",mapper.count(RequestContext.tenantId())+1)));
  mapper.insert(RequestContext.tenantId(),id,code,b,RequestContext.userId()); mapper.addActivity(RequestContext.tenantId(),id,"创建产品线",String.valueOf(b.get("name")),RequestContext.operatorName());
  List<Object> members=new ArrayList<>(); if(b.get("members") instanceof List<?> requested) members.addAll(requested);
  String ownerUserId=Objects.toString(b.get("ownerUserId"),"");
  if(members.stream().noneMatch(member -> ownerUserId.equals(memberUserId(member)))) members.add(0,Map.of("userId",ownerUserId,"role","管理员"));
   replaceMembers(id,members);
   for(String field:List.of("requirementOwnerUserId","techOwnerUserId","testOwnerUserId")){String userId=Objects.toString(b.get(field),"");if(!userId.isBlank()&&!mapper.activeMemberUser(RequestContext.tenantId(),id,userId))throw new IllegalArgumentException("三大关键负责人必须从产品线成员中选择");}
   if(Boolean.TRUE.equals(b.get("initializeWorkItemTemplate"))) initializeWorkItemTemplate(id);
   return Map.of("id",id,"code",code);
 }
 @Transactional public void update(String id,Map<String,Object>b){requireWriteLine(id); if(b.containsKey("visibility") && !Set.of("公开","私密","仅创建者可见").contains(String.valueOf(b.get("visibility")))) throw new IllegalArgumentException("可见范围无效"); if(b.containsKey("status") && !Set.of("启用中","已停用").contains(String.valueOf(b.get("status")))) throw new IllegalArgumentException("状态无效"); if(b.containsKey("website")) b.put("website",normalizeWebsite(b.get("website"))); Map<String,Object> before=mapper.find(RequestContext.tenantId(),id); if(before==null) throw new NoSuchElementException("产品线不存在"); resolveResponsibility(b,"ownerUserId","ownerName",false,id); resolveResponsibility(b,"requirementOwnerUserId","requirementOwner",false,id); resolveResponsibility(b,"techOwnerUserId","techOwner",false,id); resolveResponsibility(b,"testOwnerUserId","testOwner",false,id); if(b.containsKey("ownerUserId")&&Objects.toString(b.get("ownerUserId"),"").isBlank())throw new IllegalArgumentException("产品线负责人不能为空"); if(mapper.update(RequestContext.tenantId(),id,b,RequestContext.userId())==0) throw new NoSuchElementException("产品线不存在"); if(b.containsKey("ownerUserId"))ensureOwnerMember(id,Objects.toString(b.get("ownerUserId"),""),Objects.toString(b.get("ownerName"),"")); recordChanges(id,b,before); if(b.get("members") instanceof List<?> members) replaceMembers(id,members);}
 @Transactional public void status(String id,String status){requireWriteLine(id); if(!Set.of("启用中","已停用").contains(status)) throw new IllegalArgumentException("状态无效"); if(mapper.status(RequestContext.tenantId(),id,status,RequestContext.userId())==0) throw new NoSuchElementException("产品线不存在"); mapper.addActivity(RequestContext.tenantId(),id,"修改产品线状态",status,RequestContext.operatorName());}
 public List<Map<String,Object>> members(String id){requireReadLine(id); return mapper.members(RequestContext.tenantId(),id);} @Transactional public void addMember(String id,Map<String,Object>b){requireWriteLine(id); String tenant=RequestContext.tenantId(); String role=String.valueOf(b.getOrDefault("role","")).trim(); String userId=String.valueOf(b.getOrDefault("userId","")).trim(); if(userId.isBlank()) throw new IllegalArgumentException("请选择团队组织中的成员"); if(!Set.of("管理员","产品","研发","设计","测试","交付主管","参与人").contains(role)) throw new IllegalArgumentException("成员角色无效"); Map<String,Object> employee=mapper.activeEmployee(tenant,userId); if(employee==null) throw new IllegalArgumentException("员工不存在或已停用"); String name=String.valueOf(employee.get("name")); if(mapper.activeMemberExists(tenant,id,userId,name)) throw new ResponseStatusException(HttpStatus.CONFLICT,"成员已在产品线中"); Map<String,Object> member=new HashMap<>(); member.put("memberName",name); member.put("role",role); member.put("userId",userId); mapper.addMember(tenant,id,member,RequestContext.userId()); mapper.addActivity(tenant,id,"添加成员角色",name+" · "+role,RequestContext.operatorName());}
 @Transactional public void updateMember(String id,String memberId,Map<String,Object>b){requireWriteLine(id); String role=String.valueOf(b.getOrDefault("role","")).trim(); if(!Set.of("管理员","产品","研发","设计","测试","交付主管","参与人").contains(role)) throw new IllegalArgumentException("成员角色无效"); Map<String,Object> member=mapper.member(RequestContext.tenantId(),id,memberId); if(member==null || mapper.updateMemberRole(RequestContext.tenantId(),id,memberId,role,RequestContext.userId())==0) throw new NoSuchElementException("成员不存在"); mapper.addActivity(RequestContext.tenantId(),id,"修改成员角色",member.get("name")+" · "+role,RequestContext.operatorName());}
 @Transactional public void removeMember(String id,String memberId){requireWriteLine(id); Map<String,Object> member=mapper.member(RequestContext.tenantId(),id,memberId); if(member==null) throw new NoSuchElementException("成员不存在"); String userId=Objects.toString(member.get("userId"),""); if(!userId.isBlank()&&mapper.assignedResponsibility(RequestContext.tenantId(),id,userId)) throw new ResponseStatusException(HttpStatus.CONFLICT,"该成员仍是产品线负责人，请先调整负责人配置"); if(mapper.removeMember(RequestContext.tenantId(),id,memberId,RequestContext.userId())==0) throw new NoSuchElementException("成员不存在"); mapper.addActivity(RequestContext.tenantId(),id,"移除成员角色",member.get("name")+" · "+member.get("role"),RequestContext.operatorName());}
 public List<Map<String,Object>> workItemTypes(String id,String category){workItemAccess.check(id,false);requireLine(id); if(category!=null && !Set.of("需求","设计","研发","测试","缺陷","用例").contains(category)) throw new IllegalArgumentException("工作项类型分类无效"); return mapper.workItemTypes(RequestContext.tenantId(),id,category); }
  @Transactional public Map<String,Object> addWorkItemType(String id,Map<String,Object>b){workItemAccess.check(id,true);requireLine(id); String category=String.valueOf(b.getOrDefault("category","")).trim(); String name=String.valueOf(b.getOrDefault("name","")).trim(); if(!Set.of("需求","设计","研发","测试","缺陷","用例").contains(category)) throw new IllegalArgumentException("工作项类型分类无效"); if(name.isBlank()) throw new IllegalArgumentException("工作项类型名称不能为空"); boolean enabled=!b.containsKey("enabled")||Boolean.TRUE.equals(b.get("enabled")); boolean isDefault=enabled&&Boolean.TRUE.equals(b.get("isDefault")); b.put("category",category); b.put("name",name); b.put("description",String.valueOf(b.getOrDefault("description","")).trim()); b.put("enabled",enabled); b.put("isDefault",isDefault); String tenant=RequestContext.tenantId(),user=RequestContext.userId(); mapper.lockLine(tenant,id); if(isDefault)mapper.clearDefaultWorkItemType(tenant,id,category,user); String typeId=UUID.randomUUID().toString(); mapper.addWorkItemType(tenant,id,typeId,b,user,RequestContext.operatorName()); mapper.addActivity(tenant,id,"新增工作项类型",category+" · "+name,RequestContext.operatorName()); return Map.of("id",typeId); }
 @Transactional public Map<String,Object> addWorkItemTypeWithWorkflow(String id,WorkItemDefinition.CreateWorkItemType input){
  if(input==null || input.workflow()==null) throw new IllegalArgumentException("请配置初始状态");
  Map<String,Object> body=new HashMap<>();
   body.put("category",input.category()); body.put("name",input.name()); body.put("description",input.description()); body.put("enabled",input.enabled()==null || input.enabled()); body.put("isDefault",Boolean.TRUE.equals(input.isDefault()));
  Map<String,Object> type=addWorkItemType(id,body);
  String typeId=type.get("id").toString();
  Map<String,Object> workflow=workItemConfigurations.save(id,typeId,null,input.workflow());
  Map<String,Object> published=workItemConfigurations.publish(id,workflow.get("id").toString(),((Number)workflow.get("revision")).intValue());
  return Map.of("id",typeId,"workflowId",published.get("id"));
 }
  @Transactional public void updateWorkItemType(String id,String typeId,Map<String,Object>b){workItemAccess.check(id,true);requireLine(id); String tenant=RequestContext.tenantId(),user=RequestContext.userId(); mapper.lockLine(tenant,id); Map<String,Object> current=mapper.workItemType(tenant,id,typeId); if(current==null) throw new NoSuchElementException("工作项类型不存在"); boolean categoryChanged=b.containsKey("category")&&!Objects.equals(b.get("category"),current.get("category")); if(categoryChanged&&mapper.workItemTypeReferenced(tenant,typeId)) throw new IllegalArgumentException("已使用的任务类型不能更换分类"); if(b.containsKey("category")&&!Set.of("需求","设计","研发","测试","缺陷","用例").contains(String.valueOf(b.get("category")))) throw new IllegalArgumentException("工作项类型分类无效"); if(b.containsKey("name")&&String.valueOf(b.get("name")).trim().isBlank()) throw new IllegalArgumentException("工作项类型名称不能为空"); boolean enabled=b.containsKey("enabled")?Boolean.TRUE.equals(b.get("enabled")):WorkItemConfigurationService.enabled(current.get("enabled")); boolean defaultRequested=b.containsKey("isDefault")?Boolean.TRUE.equals(b.get("isDefault")):WorkItemConfigurationService.enabled(current.get("isDefault")); if(!enabled)b.put("isDefault",false); else if(categoryChanged&&defaultRequested)b.put("isDefault",true); boolean setDefault=enabled&&Boolean.TRUE.equals(b.get("isDefault")); if(setDefault)mapper.clearDefaultWorkItemType(tenant,id,Objects.toString(b.getOrDefault("category",current.get("category"))),user); if(mapper.updateWorkItemType(tenant,id,typeId,b,user)==0) throw new NoSuchElementException("工作项类型不存在"); mapper.addActivity(tenant,id,"修改工作项类型",String.valueOf(b.getOrDefault("name",current.get("name"))),RequestContext.operatorName()); }
  @Transactional public void deleteWorkItemType(String id,String typeId){workItemAccess.check(id,true);requireLine(id); if(mapper.workItemTypeReferenced(RequestContext.tenantId(),typeId)) throw new IllegalArgumentException("已使用的任务类型不能删除，请停用"); Map<String,Object> current=mapper.workItemType(RequestContext.tenantId(),id,typeId); if(current==null || mapper.deleteWorkItemType(RequestContext.tenantId(),id,typeId,RequestContext.userId())==0) throw new NoSuchElementException("工作项类型不存在"); mapper.addActivity(RequestContext.tenantId(),id,"删除工作项类型",String.valueOf(current.get("name")),RequestContext.operatorName()); }
  private void initializeWorkItemTemplate(String id){
   Map<String,String> typeIds=new HashMap<>();
   for(WorkItemTemplate.Type type:WorkItemTemplate.types()) {
    Map<String,Object> created=addWorkItemTypeWithWorkflow(id,new WorkItemDefinition.CreateWorkItemType(type.category(),type.name(),"",true,type.isDefault(),WorkItemTemplate.workflow(type)));
    typeIds.put(type.name(),created.get("id").toString());
   }
   String parentTypeId=typeIds.get("测试任务");
   for(String childName:List.of("用例编写","测试任务","测试验收","安全测试","回归测试"))
    workItemConfigurations.childRule(id,new WorkItemDefinition.ChildRule(parentTypeId,typeIds.get(childName),true));
  }
 public List<Map<String,Object>> versions(String id){requireReadLine(id); return mapper.versions(RequestContext.tenantId(),id);}
 @Transactional public void addVersion(String id,Map<String,Object> input){
  requireWriteLine(id);
  Map<String,Object> line=mapper.find(RequestContext.tenantId(),id);
  if(line==null) throw new NoSuchElementException("产品线不存在");
  Map<String,Object> body=normalizeVersionDates(input,Map.of());
  if(Objects.toString(body.get("ownerName"),"").isBlank()) body.put("ownerName",line.get("ownerName"));
  mapper.addVersion(RequestContext.tenantId(),id,body,RequestContext.userId());
  mapper.updateCurrentVersion(RequestContext.tenantId(),id,String.valueOf(body.get("code")),RequestContext.userId());
  mapper.addActivity(RequestContext.tenantId(),id,"创建版本",String.valueOf(body.get("code")),RequestContext.operatorName());
 }
 @Transactional public void updateVersion(String lineId,String versionId,Map<String,Object> input){
  requireWriteLine(lineId);
  Map<String,Object> version=mapper.version(RequestContext.tenantId(),versionId);
  if(version==null || !lineId.equals(String.valueOf(version.get("productLineId")))) throw new NoSuchElementException("版本不存在");
  Map<String,Object> body=normalizeVersionDates(input,version);
  if(mapper.updateVersion(RequestContext.tenantId(),versionId,body,RequestContext.userId())==0) throw new NoSuchElementException("版本不存在");
  mapper.addActivity(RequestContext.tenantId(),lineId,"修改版本",String.valueOf(version.get("code")),RequestContext.operatorName());
 }
 static Map<String,Object> normalizeVersionDates(Map<String,Object> input,Map<String,Object> previous){
  Map<String,Object> result=new HashMap<>(input);
  for(String key:List.of("startDate","endDate")){
   if(!input.containsKey(key)) continue;
   String value=Objects.toString(input.get(key),"").trim();
   result.put(key,value.isEmpty()?null:parseVersionDate(value).toString());
  }
  Object start=result.containsKey("startDate")?result.get("startDate"):previous.get("startDate");
  Object end=result.containsKey("endDate")?result.get("endDate"):previous.get("endDate");
  if(start!=null && end!=null && parseVersionDate(start.toString()).isAfter(parseVersionDate(end.toString())))
   throw new IllegalArgumentException("结束日期不能早于开始日期");
  return result;
 }
 private static java.time.LocalDate parseVersionDate(String value){
  try{return java.time.LocalDate.parse(value);}
  catch(java.time.format.DateTimeParseException error){throw new IllegalArgumentException("版本日期必须为有效的 YYYY-MM-DD 日期");}
 }
 private static String normalizeWebsite(Object value){
  String website=Objects.toString(value,"").trim();
  if(website.isEmpty()) return "";
  try{
   java.net.URI uri=java.net.URI.create(website);
   if(("http".equalsIgnoreCase(uri.getScheme())||"https".equalsIgnoreCase(uri.getScheme()))&&uri.getHost()!=null&&!uri.getHost().isBlank()) return website;
  }catch(IllegalArgumentException ignored){}
  throw new IllegalArgumentException("产品线网址必须是有效的 HTTP 或 HTTPS 地址");
 }
 @Transactional public void deleteVersion(String lineId,String versionId){requireWriteLine(lineId); Map<String,Object> version=mapper.version(RequestContext.tenantId(),versionId); if(version==null || !lineId.equals(String.valueOf(version.get("productLineId"))) || mapper.deleteVersion(RequestContext.tenantId(),lineId,versionId,RequestContext.userId())==0) throw new NoSuchElementException("版本不存在"); mapper.addActivity(RequestContext.tenantId(),lineId,"删除版本",String.valueOf(version.get("code")),RequestContext.operatorName());}
 @Transactional public void assignRequirement(String lineId,String versionId,String requirementId){requireWriteLine(lineId); Map<String,Object> line=mapper.find(RequestContext.tenantId(),lineId); Map<String,Object> version=mapper.version(RequestContext.tenantId(),versionId); if(line==null || version==null || !lineId.equals(String.valueOf(version.get("productLineId")))) throw new NoSuchElementException("迭代版本不存在"); requirementService.update(requirementId,Map.of("versionId",versionId,"versionName",String.valueOf(version.get("name")),"productLineId",lineId,"productLineName",String.valueOf(line.get("name")))); mapper.addActivity(RequestContext.tenantId(),lineId,"规划工作项",requirementId+" → "+String.valueOf(version.get("code")),RequestContext.operatorName());}
 @Transactional public void assignWorkItem(String lineId,String versionId,String kind,String itemId){requireWriteLine(lineId); Map<String,Object> line=mapper.find(RequestContext.tenantId(),lineId); Map<String,Object> version=mapper.version(RequestContext.tenantId(),versionId); Map<String,Object> item=mapper.workItem(RequestContext.tenantId(),kind,itemId); if(line==null || version==null || item==null || !lineId.equals(String.valueOf(version.get("productLineId"))) || !lineId.equals(String.valueOf(item.get("productLineId")))) throw new NoSuchElementException("工作项或迭代版本不存在"); if(mapper.assignWorkItem(RequestContext.tenantId(),kind,itemId,versionId,String.valueOf(version.get("name")),RequestContext.userId())==0) throw new NoSuchElementException("工作项不存在"); mapper.addActivity(RequestContext.tenantId(),lineId,"规划工作项",kind+":"+itemId+" → "+String.valueOf(version.get("code")),RequestContext.operatorName()); }
 @Transactional public void unassignWorkItem(String lineId,String versionId,String kind,String itemId){requireWriteLine(lineId); Map<String,Object> line=mapper.find(RequestContext.tenantId(),lineId); Map<String,Object> version=mapper.version(RequestContext.tenantId(),versionId); Map<String,Object> item=mapper.workItem(RequestContext.tenantId(),kind,itemId); if(line==null || version==null || item==null || !lineId.equals(String.valueOf(version.get("productLineId"))) || !lineId.equals(String.valueOf(item.get("productLineId")))) throw new NoSuchElementException("工作项或迭代版本不存在"); if(mapper.unassignWorkItem(RequestContext.tenantId(),kind,itemId,RequestContext.userId())==0) throw new NoSuchElementException("工作项不存在"); mapper.addActivity(RequestContext.tenantId(),lineId,"移出迭代",kind+":"+itemId+" ← "+String.valueOf(version.get("code")),RequestContext.operatorName()); }
 public List<Map<String,Object>> activities(String id){requireReadLine(id); return mapper.activities(RequestContext.tenantId(),id);}
 private Map<String,Object> enrich(Map<String,Object> line){String id=String.valueOf(line.get("id")); line.put("members",mapper.members(RequestContext.tenantId(),id)); line.put("workItemTypes",mapper.workItemTypes(RequestContext.tenantId(),id,null)); line.put("versions",mapper.versions(RequestContext.tenantId(),id)); line.put("activities",mapper.activities(RequestContext.tenantId(),id)); Map<String,Object> stats=mapper.workItemStatsForLines(RequestContext.tenantId(),List.of(id)).stream().findFirst().orElse(Map.of());line.put("pendingRequirementCount",stats.getOrDefault("pendingRequirementCount",0));return line;}
 private Map<String,List<Map<String,Object>>> groupByLine(List<Map<String,Object>> rows){Map<String,List<Map<String,Object>>> grouped=new HashMap<>();for(Map<String,Object> row:rows){String id=String.valueOf(row.remove("productLineId"));grouped.computeIfAbsent(id,key->new ArrayList<>()).add(row);}return grouped;}
 private void recordChanges(String id,Map<String,Object> body,Map<String,Object> before){Map<String,String> labels=Map.ofEntries(Map.entry("name","修改产品线名称"),Map.entry("ownerName","修改综合负责人"),Map.entry("requirementOwner","修改需求负责人"),Map.entry("techOwner","修改技术负责人"),Map.entry("testOwner","修改测试负责人"),Map.entry("website","修改产品线网址"),Map.entry("visibility","修改可见范围"),Map.entry("status","修改产品线状态")); labels.forEach((field,action)->{if(!body.containsKey(field)) return; Object next=body.get(field); String previous=String.valueOf(before.getOrDefault(field,"")); String current=next==null?"":String.valueOf(next); if(!Objects.equals(previous,current)) mapper.addActivity(RequestContext.tenantId(),id,action,current.isBlank()?"未设置":current,RequestContext.operatorName());});}
 private void replaceMembers(String id,List<?> members){String tenant=RequestContext.tenantId();List<Map<String,Object>> previous=mapper.members(tenant,id);mapper.removeAllMembers(tenant,id,RequestContext.userId());Set<String> added=new HashSet<>();for(Object value:members){if(!(value instanceof Map<?,?> raw))continue;String userId=Objects.toString(raw.get("userId"),"").trim();String role=Objects.toString(raw.get("role"),"").trim();if(userId.isBlank())throw new IllegalArgumentException("请选择团队组织中的成员");if(!Set.of("管理员","产品","研发","设计","测试","交付主管","参与人").contains(role))throw new IllegalArgumentException("成员角色无效");if(!added.add(userId))continue;Map<String,Object> employee=mapper.activeEmployee(tenant,userId);if(employee==null)throw new IllegalArgumentException("员工不存在或已停用");Map<String,Object> member=new HashMap<>();member.put("memberName",employee.get("name"));member.put("userId",userId);member.put("role",role);mapper.addMember(tenant,id,member,RequestContext.userId());mapper.addActivity(tenant,id,"添加成员角色",employee.get("name")+" · "+role,RequestContext.operatorName());}for(Map<String,Object> member:previous)mapper.addActivity(tenant,id,"移除成员角色",member.get("name")+" · "+member.get("role"),RequestContext.operatorName());}
 private void resolveResponsibility(Map<String,Object> body,String userField,String nameField,boolean required,String lineId){if(!body.containsKey(userField)){if(required)throw new IllegalArgumentException("产品线负责人不能为空");return;}String userId=Objects.toString(body.get(userField),"").trim();if(userId.isBlank()){if(required)throw new IllegalArgumentException("产品线负责人不能为空");body.put(nameField,"");return;}Map<String,Object> employee=mapper.activeEmployee(RequestContext.tenantId(),userId);if(employee==null)throw new IllegalArgumentException("负责人不存在或已停用");if(lineId!=null&&!"ownerUserId".equals(userField)&&!mapper.activeMemberUser(RequestContext.tenantId(),lineId,userId))throw new IllegalArgumentException("三大关键负责人必须从产品线成员中选择");body.put(userField,userId);body.put(nameField,employee.get("name"));}
 private void ensureOwnerMember(String lineId,String userId,String name){String tenant=RequestContext.tenantId();if(mapper.activeMemberUser(tenant,lineId,userId))return;Map<String,Object> member=new HashMap<>();member.put("memberName",name);member.put("userId",userId);member.put("role","管理员");mapper.addMember(tenant,lineId,member,RequestContext.userId());mapper.addActivity(tenant,lineId,"添加成员角色",name+" · 管理员",RequestContext.operatorName());}
 private String memberUserId(Object value){if(!(value instanceof Map<?,?> raw))return "";return Objects.toString(raw.get("userId"),"").trim();}
 private void requireLine(String id){if(mapper.find(RequestContext.tenantId(),id)==null) throw new NoSuchElementException("产品线不存在");}
 private void requireReadLine(String id){AuthorizationService.requireRead("product"); workItemAccess.check(id,false);}
 private void requireWriteLine(String id){AuthorizationService.requireWrite("product"); workItemAccess.check(id,true);}
}

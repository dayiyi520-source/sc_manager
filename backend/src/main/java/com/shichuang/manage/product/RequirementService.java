package com.shichuang.manage.product;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.api.PageResult;
import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class RequirementService {
    private final RequirementMapper mapper;
    private final TaskAliasMapper taskMapper;
    private final TaskAliasService tasks;
    private final WorkItemStorageService storage;
    private final WorkItemTransitionService transitions;
    private final WorkOrderService workOrders;
    private final ObjectMapper objectMapper;
    private final AssistanceWorkflowService assistanceWorkflow;
    private final AttachmentResourceService attachments;

    public RequirementService(RequirementMapper mapper,TaskAliasMapper taskMapper,TaskAliasService tasks,WorkItemStorageService storage,
        WorkItemTransitionService transitions,WorkOrderService workOrders,ObjectMapper objectMapper,AssistanceWorkflowService assistanceWorkflow,AttachmentResourceService attachments) {
        this.mapper=mapper;this.taskMapper=taskMapper;this.tasks=tasks;this.storage=storage;this.transitions=transitions;this.workOrders=workOrders;this.objectMapper=objectMapper;this.assistanceWorkflow=assistanceWorkflow;this.attachments=attachments;
    }

    public PageResult<Map<String,Object>> list(int page,int pageSize,String keyword,String productLine,String department,String priority,String status,String ownerName,String workItemKind) {
        AuthorizationService.requireRead("product");
        int current=Math.max(1,page),size=Math.min(100,Math.max(1,pageSize));
        String like="%"+safe(keyword)+"%",kind="design".equalsIgnoreCase(workItemKind)?"design":"requirement";
        String where="tenant_id_=? AND delete_flag_=0 AND work_item_kind_=? AND (title_ LIKE ? OR description_ LIKE ? OR owner_name_ LIKE ? OR product_line_name_ LIKE ? OR department_ LIKE ?) AND (?='' OR product_line_name_=?) AND (?='' OR department_=?) AND (?='' OR priority_=?) AND (?='' OR status_=?) AND (?='' OR owner_name_=?)";
        Object[] args={RequestContext.tenantId(),kind,like,like,like,like,like,safe(productLine),safe(productLine),safe(department),safe(department),safe(priority),safe(priority),safe(status),safe(status),safe(ownerName),safe(ownerName)};
        return new PageResult<>(mapper.list(where,args,size,(current-1)*size),current,size,mapper.count(where,args));
    }

    public TaskPageResult<Map<String,Object>> list(int page,int pageSize,TaskListFilter filter) {
        AuthorizationService.requireRead("product");
        int current=Math.max(1,page),size=Math.min(100,Math.max(1,pageSize));
        TaskListPredicate predicate=TaskListPredicate.build(RequestContext.tenantId(),"","owner_name_",filter,true);
        String where=predicate.sql()+" AND work_item_kind_='requirement'";
        TaskListPredicate groupPredicate=TaskListPredicate.build(RequestContext.tenantId(),"","owner_name_",filter.withoutGroupValue(),true);
        String groupWhere=groupPredicate.sql()+" AND work_item_kind_='requirement'";
        String expression=TaskListPredicate.groupExpression("","owner_name_",filter.groupBy(),true);
        List<Map<String,Object>> groups=expression==null?List.of():mapper.groups(groupWhere,groupPredicate.args(),expression);
        return new TaskPageResult<>(mapper.listFiltered(where,predicate.args(),size,(current-1)*size),current,size,mapper.count(where,predicate.args()),groups);
    }

    public List<Map<String,Object>> departments(){AuthorizationService.requireRead("product");return mapper.departments(RequestContext.tenantId());}

    public Map<String,Object> detail(String id) {
        AuthorizationService.requireRead("product");
        List<Map<String,Object>> rows=mapper.find(RequestContext.tenantId(),id);
        if(rows.isEmpty())throw notFound("需求不存在");
        Map<String,Object> result=new LinkedHashMap<>(rows.get(0));
        result.put("events",mapper.events(RequestContext.tenantId(),id));
        List<Map<String,Object>> workItems = mapper.workItems(RequestContext.tenantId(),id);
        workItems.forEach(item -> item.put("events", mapper.workItemEvents(RequestContext.tenantId(), String.valueOf(item.get("id")))));
        result.put("workItems",workItems);
        return assistanceWorkflow.enrich(result);
    }

    public List<Map<String,Object>> events(String id,String eventType,String operatorName){AuthorizationService.requireRead("product");requirement(id);return mapper.events(RequestContext.tenantId(),id,safe(eventType),safe(operatorName));}

    public PageResult<Map<String,Object>> auditEvents(int page,int pageSize,String requirementId,String eventType,String operatorName,String from,String to){
        AuthorizationService.requireRead("product");int current=Math.max(1,page),size=Math.min(100,Math.max(1,pageSize));LocalDateTime fromTime=parseDateTime(from,false),toTime=parseDateTime(to,true);
        return new PageResult<>(mapper.auditEvents(RequestContext.tenantId(),safe(requirementId),safe(eventType),safe(operatorName),fromTime,toTime,size,(current-1)*size),current,size,mapper.auditCount(RequestContext.tenantId(),safe(requirementId),safe(eventType),safe(operatorName),fromTime,toTime));
    }

    @Transactional public Map<String,Object> create(Map<String,Object> body) {
        AuthorizationService.requireWrite("product");
        String customerId=text(body,"customerId");
        if(!customerId.isBlank()&&mapper.customerExists(RequestContext.tenantId(),customerId)==0)throw new IllegalArgumentException("关联客户无效");
        Map<String,Object> created=tasks.create("requirement",body);
        String owner=text(body,"ownerName");
        if(!owner.isBlank())mapper.notifyOwner(RequestContext.tenantId(),owner,text(body,"title"),created.get("id").toString());
        return created;
    }

    @Transactional public void update(String id,Map<String,Object> body){AuthorizationService.requireWrite("product");requirement(id);tasks.update("requirement",id,body);}

    @Transactional public void comment(String id,Map<String,Object> body){
        AuthorizationService.requireWrite("product");requirement(id);String content=text(body,"content");if(content.isBlank())throw new IllegalArgumentException("评论内容不能为空");event(id,"评论","","",content,Map.of("content",content));
    }

    @Transactional public void transition(String id,Map<String,Object> body){
        AuthorizationService.requireWrite("product");Map<String,Object> current=requirement(id);String action=text(body,"action"),target=switch(action){case "hold"->"已搁置";case "reject"->"已驳回";default->text(body,"status");};
        executeStatus(current,target,text(body,"reason"));
    }

    @Transactional public Map<String,Object> reassign(String id,Map<String,Object> body){
        AuthorizationService.requireWrite("product");
        Map<String,Object> current=requirement(id);
        requireRevision(current,body);
        rejectTerminal(current);
        String reason=text(body,"reason");
        if(reason.isBlank())throw new IllegalArgumentException("转派原因不能为空");
        String assigneeId=text(body,"assigneeId");
        Map<String,Object> employee=assigneeId.isBlank()?null:taskMapper.activeUser(assigneeId);
        if(employee==null)throw new IllegalArgumentException("负责人不存在或已停用");
        String oldOwner=Objects.toString(current.get("ownerName"),"");
        String from=Objects.toString(current.get("status"),"");
        if(!"处理中".equals(from)){
            executeStatus(current,"处理中",reason);
            current=requirement(id);
        }
        int currentRevision=((Number)current.get("revision")).intValue();
        String assigneeName=Objects.toString(employee.get("name"),"");
        String pendingId=UUID.randomUUID().toString();
        mapper.createPendingReassignment(RequestContext.tenantId(), id, pendingId, assigneeId, reason, text(body,"handoffNote"), RequestContext.userId());
        attachments.bindAll(body.get("attachmentIds"), "ASSISTANCE_REASSIGNMENT", pendingId, "PARTICIPANTS");
        event(id,"转派待受理",from,Objects.toString(current.get("status"),from),reason,Map.of("fromAssigneeName",oldOwner,"assigneeId",assigneeId,"assigneeName",assigneeName,"pendingReassignmentId",pendingId));
        Map<String,Object> response = new LinkedHashMap<>(detail(id));
        response.put("pendingReassignmentId", pendingId);
        response.put("owner", oldOwner);
        response.put("revision", currentRevision);
        return response;
    }

    @Transactional public Map<String,Object> memo(String id,Map<String,Object> body){
        AuthorizationService.requireWrite("product");
        Map<String,Object> current=requirement(id);
        requireRevision(current,body);
        rejectTerminal(current);
        String content=text(body,"content");
        if(content.isBlank())throw new IllegalArgumentException("个人备忘内容不能为空");
        assistanceWorkflow.memo(id, content, body.get("attachmentIds"));
        return detail(id);
    }

    @Transactional public Map<String,Object> createWorkItem(String id,Map<String,Object> body){
        AuthorizationService.requireWrite("product");Map<String,Object> current=requirement(id);String taskType=text(body,"taskType"),category=TaskTypes.category(taskType);
        if(category==null)throw new IllegalArgumentException("工单仅支持转需求、设计、研发或缺陷");
        String assignee=text(body,"assigneeName");if(assignee.isBlank())throw new IllegalArgumentException("请选择下一步负责人");
        String assigneeId=taskMapper.userId(assignee);if(assigneeId==null)throw new IllegalArgumentException("负责人不存在或已停用");
        String line=String.valueOf(current.get("productLineId")),typeId=text(body,"workItemTypeId");if(typeId.isBlank())typeId=taskMapper.defaultType(line,category);
        if(typeId==null||typeId.isBlank())throw new IllegalArgumentException("请先配置并启用目标分类的工作项类型");
        String title=defaultText(body,"title",String.valueOf(current.get("title"))),note=text(body,"note");
        WorkItemDefinition.CreateItem input=new WorkItemDefinition.CreateItem("work-order-"+UUID.randomUUID(),line,category,typeId,title,note,"",nullable(current.get("versionId")),id,null,assigneeId,priority(current.get("priority")),null,date(current.get("dueDate")),BigDecimal.ZERO,BigDecimal.ZERO);
        Map<String,Object> created=storage.create(input);
        mapper.markWorkOrder(RequestContext.tenantId(),created.get("id").toString(),taskType,id,String.valueOf(current.get("title")),note,RequestContext.userId());
        mapper.setAssistanceTaskMeta(RequestContext.tenantId(), created.get("id").toString(), Boolean.parseBoolean(String.valueOf(body.getOrDefault("blocksClosure", true))));
        attachments.bindAll(body.get("attachmentIds"), "ASSISTANCE_WORK_ITEM", created.get("id").toString(), "PARTICIPANTS");
        jdbcSetAssistanceProcessing(id);
        event(id,"转任务",String.valueOf(current.get("status")),String.valueOf(current.get("status")),note,Map.of("taskType",taskType,"taskId",created.get("id"),"taskTitle",title,"assigneeName",assignee,"targetPage",targetPage(category)));
        return Map.of("id",created.get("id"),"taskType",taskType,"syncStatus","SUCCESS","retryCount",0);
    }

    @Transactional public Map<String,Object> createWorkItemsBatch(String id, List<Map<String,Object>> inputs) {
        if (inputs == null || inputs.isEmpty()) throw new IllegalArgumentException("至少创建一条下游任务");
        List<Map<String,Object>> items = inputs.stream().map(input -> createWorkItem(id, input)).toList();
        return Map.of("items", items, "count", items.size());
    }

    private void jdbcSetAssistanceProcessing(String id) {
        // 通过现有工作项状态机保持兼容；专属状态列仅用于协助事项投影。
        mapper.setAssistanceStatus(RequestContext.tenantId(), id, "处理中");
    }

    public List<Map<String,Object>> workItems(String type){AuthorizationService.requireRead("product");return workOrders.list(RequestContext.tenantId(),safe(type));}
    public List<Map<String,Object>> workOrderCandidates(String keyword,String type,String requirementId,int limit){AuthorizationService.requireRead("product");return mapper.workOrderCandidates(RequestContext.tenantId(),safe(keyword),safe(type),safe(requirementId),Math.min(200,Math.max(1,limit)));}

    public PageResult<Map<String,Object>> syncStatus(int page,int pageSize,String taskType,String syncStatus){AuthorizationService.requireRead("product");int current=Math.max(1,page),size=Math.min(100,Math.max(1,pageSize));if(!safe(syncStatus).isBlank()&&!"SUCCESS".equalsIgnoreCase(syncStatus))return new PageResult<>(List.of(),current,size,0);return new PageResult<>(workOrders.syncStatus(RequestContext.tenantId(),safe(taskType),"SUCCESS",size,(current-1)*size),current,size,workOrders.syncStatusCount(RequestContext.tenantId(),safe(taskType),"SUCCESS"));}

    @Transactional public void updateWorkItemStatus(String id,Map<String,Object> body){AuthorizationService.requireWrite("product");workOrders.updateStatus(RequestContext.tenantId(),id,text(body,"status"),RequestContext.userId());mapper.refreshAssistanceTask(RequestContext.tenantId(), id);}
    @Transactional public Map<String,Object> updateWorkItemProgress(String id,Map<String,Object> body){
        AuthorizationService.requireWrite("product"); int progress=((Number)body.getOrDefault("progress",-1)).intValue();
        if(progress<0||progress>100) throw new IllegalArgumentException("进度必须为0至100");
        Map<String,Object> item=workOrders.find(RequestContext.tenantId(),id); int revision=((Number)body.getOrDefault("revision",item.get("revision"))).intValue();
        if(isTerminal(item)) throw new IllegalArgumentException("已完成或已取消的任务不能更新进度");
        if(!isParticipant(item, RequestContext.userId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"仅任务参与者可以更新进度");
        int previous=((Number)item.getOrDefault("progress",0)).intValue();
        if(storage.updateProgress(RequestContext.tenantId(),String.valueOf(item.get("productLineId")),id,revision,progress,RequestContext.userId())!=1) throw conflict();
        try {
            storage.activity(RequestContext.tenantId(),String.valueOf(item.get("productLineId")),id,"WORK_ITEM_PROGRESS_UPDATED",objectMapper.writeValueAsString(Map.of("fromProgress",previous,"toProgress",progress,"reason",text(body,"reason"))),RequestContext.userId());
        } catch (Exception error) {
            throw new IllegalArgumentException("进度记录格式无效", error);
        }
        return Map.of("id",id,"progress",progress,"revision",revision+1);
    }
    public List<Map<String,Object>> myTasks(){
        AuthorizationService.requireRead("product"); String user=RequestContext.userId();
        return mapper.myTasks(RequestContext.tenantId(),user);
    }
    @Transactional public Map<String,Object> acceptAssistanceTask(String assistanceId, String workItemId) {
        AuthorizationService.requireWrite("product");
        Map<String,Object> assistance = mapper.assistance(RequestContext.tenantId(), assistanceId);
        if (assistance == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "事项不存在");
        if (!RequestContext.userId().equals(Objects.toString(assistance.get("create_by_"), ""))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "仅事项发起人可以验收");
        if (mapper.markAssistanceTaskAccepted(RequestContext.tenantId(), assistanceId, workItemId) != 1) throw conflict();
        mapper.refreshAssistanceTask(RequestContext.tenantId(), workItemId);
        event(assistanceId,"任务验收通过",Objects.toString(assistance.get("assistance_status_"),"处理中"),Objects.toString(mapper.assistance(RequestContext.tenantId(), assistanceId).get("assistance_status_"),"处理中"),"发起人确认任务结果",Map.of("taskId",workItemId));
        return Map.of("id", workItemId, "status", "已验收");
    }
    public Map<String,Object> retryWorkItem(String id){AuthorizationService.requireWrite("product");workOrders.find(RequestContext.tenantId(),id);return Map.of("syncStatus","SUCCESS","retryableFailures",0);}

    private Map<String,Object> requirement(String id){List<Map<String,Object>> rows=mapper.find(RequestContext.tenantId(),id);if(rows.isEmpty())throw notFound("需求不存在");return rows.get(0);}
    private static void requireRevision(Map<String,Object> current,Map<String,Object> body){Object value=body.get("revision");if(!(value instanceof Number revision))throw new IllegalArgumentException("请提交工单当前版本号");if(revision.intValue()!=((Number)current.get("revision")).intValue())throw conflict();}
    private static void rejectTerminal(Map<String,Object> current){if(Set.of("已完成","已取消","已驳回").contains(Objects.toString(current.get("status"),"")))throw new ResponseStatusException(HttpStatus.CONFLICT,"当前工单已结束，不能继续操作");}
    private static ResponseStatusException conflict(){return new ResponseStatusException(HttpStatus.CONFLICT,"工单已变化，请刷新后重试");}
    private static boolean isTerminal(Map<String,Object> item){
        return Boolean.TRUE.equals(item.get("successful")) || Integer.valueOf(1).equals(item.get("successful"))
            || Set.of("COMPLETED","CANCELLED").contains(Objects.toString(item.get("statusGroup"),""))
            || Set.of("已完成","已关闭","已取消").contains(Objects.toString(item.get("status"),""));
    }
    private static boolean isParticipant(Map<String,Object> item,String userId){
        return Set.of("assigneeId","creatorId","assistanceOwnerId","assistanceInitiatorId").stream()
            .map(item::get).map(value -> Objects.toString(value,""))
            .anyMatch(userId::equals);
    }
    private void executeStatus(Map<String,Object> current,String target,String reason){if(target.isBlank())throw new IllegalArgumentException("请选择目标状态");WorkItemTransitionService.Actions available=transitions.available(String.valueOf(current.get("productLineId")),String.valueOf(current.get("id")));WorkItemTransitionService.Action action=available.actions().stream().filter(value->value.to().equals(target)||value.name().equals(target)||available.statuses().stream().anyMatch(status->status.key().equals(value.to())&&status.name().equals(target))).findFirst().orElseThrow(()->new IllegalArgumentException("当前流程不允许流转到该状态"));transitions.execute(String.valueOf(current.get("productLineId")),String.valueOf(current.get("id")),new WorkItemDefinition.Transition(action.edgeKey(),available.revision(),reason));}
    private void event(String id,String type,String from,String to,String reason,Map<String,Object> metadata){try{mapper.event(RequestContext.tenantId(),id,type,from,to,reason,RequestContext.operatorName(),RequestContext.userId(),objectMapper.writeValueAsString(metadata));}catch(Exception error){throw new IllegalArgumentException("流转记录格式无效",error);}}
    private static String targetPage(String category){return switch(category){case "design"->"prod_design_tasks";case "dev"->"prod_rd_tasks";case "bug"->"prod_bugs";default->"prod_req_tasks";};}
    private static String priority(Object value){String text=Objects.toString(value,"P2");if(text.startsWith("P0"))return "P0";if(text.startsWith("P1"))return "P1";if(text.startsWith("P3"))return "P3";return "P2";}
    private static LocalDate date(Object value){String text=Objects.toString(value,"");return text.isBlank()?null:LocalDate.parse(text);}
    private static String nullable(Object value){String text=Objects.toString(value,"");return text.isBlank()?null:text;}
    private static LocalDateTime parseDateTime(String value,boolean endExclusive){if(value==null||value.isBlank())return null;try{if(value.length()==10){LocalDate date=LocalDate.parse(value);return endExclusive?date.plusDays(1).atStartOfDay():date.atStartOfDay();}return LocalDateTime.parse(value);}catch(DateTimeParseException error){throw new IllegalArgumentException("审计时间格式无效");}}
    private static String text(Map<String,Object> body,String key){return Objects.toString(body.get(key),"").trim();}
    private static String defaultText(Map<String,Object> body,String key,String fallback){String value=text(body,key);return value.isBlank()?fallback:value;}
    private static String safe(String value){return value==null?"":value.trim();}
    private static ResponseStatusException notFound(String message){return new ResponseStatusException(HttpStatus.NOT_FOUND,message);}
}

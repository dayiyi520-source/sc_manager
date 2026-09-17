package com.shichuang.manage.product;

import com.shichuang.manage.auth.AuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class TaskAliasService {
    private final TaskAliasMapper mapper;
    private final WorkItemStorageService storage;
    private final WorkItemTransitionService transitions;

    public TaskAliasService(TaskAliasMapper mapper, WorkItemStorageService storage, WorkItemTransitionService transitions) {
        this.mapper = mapper;
        this.storage = storage;
        this.transitions = transitions;
    }

    public TaskPageResult<Map<String,Object>> list(String type, int page, int pageSize, TaskListFilter filter) {
        AuthorizationService.requireRead("product");
        int current=Math.max(1,page), size=Math.min(100,Math.max(1,pageSize));
        String category=category(type);
        if (category!=null) return new TaskPageResult<>(mapper.listUnified(category,filter,size,(current-1)*size),current,size,mapper.countUnified(category,filter),mapper.groupsUnified(category,filter));
        String table=table(type),owner=owner(type);
        return new TaskPageResult<>(mapper.listLegacy(table,owner,filter,size,(current-1)*size),current,size,mapper.countLegacy(table,owner,filter),mapper.groupsLegacy(table,owner,filter));
    }

    public Map<String,Object> detail(String type,String id) {
        AuthorizationService.requireRead("product");
        String category=category(type);
        Map<String,Object> value=category==null?mapper.detailLegacy(table(type),owner(type),id):mapper.detailUnified(category,id);
        if(value==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"工作项不存在");
        return value;
    }

    @Transactional public Map<String,Object> create(String type,Map<String,Object> body) {
        AuthorizationService.requireWrite("product");
        String category=category(type);
        if(category==null) return mapper.createLegacy(type,body);
        String line=text(body,"productLineId");
        if(line.isBlank()) throw new IllegalArgumentException("请选择所属产品线");
        String taskType=text(body,"workItemTypeId");
        if(taskType.isBlank()) taskType=mapper.defaultType(line,category);
        if(taskType==null || taskType.isBlank()) throw new IllegalArgumentException("请先配置并启用该分类的工作项类型");
        String owner=first(body,"assigneeName","developer","ownerName");
        String assigneeId=owner.isBlank()?null:mapper.userId(owner);
        if(!owner.isBlank() && assigneeId==null) throw new IllegalArgumentException("负责人不存在或已停用");
        WorkItemDefinition.CreateItem input=new WorkItemDefinition.CreateItem(
            "compat-"+type+"-"+UUID.randomUUID(),line,category,taskType,text(body,"title"),text(body,"description"),text(body,"expectedGoal"),
            nullable(body,"versionId"),nullable(body,"requirementId"),null,assigneeId,priority(body.get("priority")),date(body,"plannedStartDate"),date(body,"dueDate"),decimal(body,"estimatedHours"),decimal(body,"actualHours"));
        Map<String,Object> created=storage.create(input);
        mapper.updateExtended(created.get("id").toString(),body);
        return Map.of("id",created.get("id"),"code",created.get("code"));
    }

    @Transactional public void update(String type,String id,Map<String,Object> body) {
        AuthorizationService.requireWrite("product");
        String category=category(type);
        if(category==null) {
            if(mapper.updateLegacy(table(type),id,body)==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"工作项不存在");
            return;
        }
        Map<String,Object> current=mapper.detailUnified(category,id);
        if(current==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"工作项不存在");
        if(body.get("version") instanceof Number revision && revision.intValue()!=((Number)current.get("version")).intValue()) throw new ResponseStatusException(HttpStatus.CONFLICT,"任务已被其他人修改，请刷新后重试");
        storage.update(current.get("productLineId").toString(),id,new WorkItemDefinition.UpdateItem(
            value(body,"title"),value(body,"description"),value(body,"expectedGoal"),value(body,"versionId"),
            firstNullable(body,"assigneeName","developer","ownerName"),body.containsKey("priority")?priority(body.get("priority")):null,
            dateNullable(body,"plannedStartDate"),dateNullable(body,"dueDate"),decimalNullable(body,"estimatedHours"),decimalNullable(body,"actualHours"),
            ((Number)current.get("version")).intValue()));
        mapper.updateExtended(id,body);
        String target=text(body,"status");
        if(!target.isBlank()&&!target.equals(current.get("status"))) executeStatus(current.get("productLineId").toString(),id,target);
    }

    static String table(String type){return switch(type){case "presales"->"t_crm_presales_task";case "delivery"->"t_project_delivery_task";case "ops"->"t_project_ops_task";default->throw new IllegalArgumentException("任务类型无效");};}
    static String owner(String type){return "owner_name_";}
    private static String category(String type){return switch(type){case "requirement"->"requirement";case "bug"->"bug";case "dev"->"dev";case "design"->"design";default->null;};}
    private static String priority(Object value){String text=Objects.toString(value,"P2");if(text.startsWith("P0"))return "P0";if(text.startsWith("P1"))return "P1";if(text.startsWith("P3"))return "P3";return "P2";}
    private static String text(Map<String,Object>b,String key){return Objects.toString(b.get(key),"").trim();}
    private static String nullable(Map<String,Object>b,String key){String value=text(b,key);return value.isBlank()?null:value;}
    private static String first(Map<String,Object>b,String...keys){for(String key:keys){String value=text(b,key);if(!value.isBlank())return value;}return "";}
    private static String firstNullable(Map<String,Object>b,String...keys){for(String key:keys)if(b.containsKey(key))return text(b,key);return null;}
    private static String value(Map<String,Object>b,String key){return b.containsKey(key)?Objects.toString(b.get(key),null):null;}
    private static LocalDate date(Map<String,Object>b,String key){String value=text(b,key);return value.isBlank()?null:LocalDate.parse(value);}
    private static LocalDate dateNullable(Map<String,Object>b,String key){return b.containsKey(key)?date(b,key):null;}
    private static BigDecimal decimal(Map<String,Object>b,String key){Object value=b.get(key);return value==null?BigDecimal.ZERO:new BigDecimal(value.toString());}
    private static BigDecimal decimalNullable(Map<String,Object>b,String key){return b.containsKey(key)?decimal(b,key):null;}
    private void executeStatus(String line,String id,String target){WorkItemTransitionService.Actions available=transitions.available(line,id);WorkItemTransitionService.Action action=available.actions().stream().filter(value->value.to().equals(target)||value.name().equals(target)||available.statuses().stream().anyMatch(option->option.key().equals(value.to())&&option.name().equals(target))).findFirst().orElseThrow(()->new IllegalArgumentException("当前流程不允许流转到该状态"));transitions.execute(line,id,new WorkItemDefinition.Transition(action.edgeKey(),available.revision(),"兼容接口状态变更"));}
}

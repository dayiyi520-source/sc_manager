package com.shichuang.manage.product;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static com.shichuang.manage.product.TestCaseDefinition.*;

@Service
@Transactional(readOnly=true)
public class TestCaseService {
    private final TestCaseMapper mapper;
    private final WorkItemAccess access;
    private final WorkItemStorageMapper workItems;
    private final WorkItemConfigurationService configurations;
    private final ObjectMapper json;
    public TestCaseService(TestCaseMapper mapper,WorkItemAccess access,WorkItemStorageMapper workItems,WorkItemConfigurationService configurations,ObjectMapper json){this.mapper=mapper;this.access=access;this.workItems=workItems;this.configurations=configurations;this.json=json;}

    public List<DirectoryView> directories(String line){
        if (!"all".equals(line)) access.check(line,false);
        return mapper.directories(RequestContext.tenantId(),line).stream().map(r->new DirectoryView(text(r,"id"),nullable(r,"parentId"),text(r,"name"),number(r,"sort"),longNumber(r,"caseCount"),text(r,"productLineId"),text(r,"productLineName"))).toList();
    }
    @Transactional public DirectoryView createDirectory(String line,SaveDirectory input){
        String actualLine = "all".equals(line) ? blank(input.productLineId()) : line;
        if (actualLine == null) throw bad("全部产品线模式下必须选择产品线");
        access.check(actualLine,true);String name=required(input.name(),"目录名称",120);String parent=blank(input.parentId());
        if(parent!=null&&mapper.directory(RequestContext.tenantId(),actualLine,parent)==null)throw bad("父级目录不存在或不属于当前产品线");
        String id=UUID.randomUUID().toString();
        try{mapper.insertDirectory(RequestContext.tenantId(),actualLine,id,parent,name,input.sort()==null?0:input.sort(),RequestContext.userId());}
        catch(DataIntegrityViolationException e){throw conflict("同级目录名称已存在");}
        return new DirectoryView(id,parent,name,input.sort()==null?0:input.sort(),0,actualLine,null);
    }
    @Transactional public DirectoryView renameDirectory(String line,String id,RenameDirectory input){ Map<String,Object> existing=mapper.directory(RequestContext.tenantId(),"all",id);if(existing==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"目录不存在");String actual=text(existing,"productLineId");access.check(actual,true);String name=required(input.name(),"目录名称",120);try{if(mapper.renameDirectory(RequestContext.tenantId(),actual,id,name,RequestContext.userId())!=1) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"目录不存在");}catch(DataIntegrityViolationException e){throw conflict("同级目录名称已存在");}return directories(actual).stream().filter(v->v.id().equals(id)).findFirst().orElseThrow(); }
    @Transactional public void deleteDirectory(String line,String id){
        String tenant=RequestContext.tenantId();
        Map<String,Object> existing=mapper.directory(tenant,"all",id);
        if(existing==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"目录不存在");
        String actual=text(existing,"productLineId");
        access.check(actual,true);
        if(mapper.hasChildren(tenant,actual,id)||mapper.hasCases(tenant,actual,id)) throw bad("目录下仍有子目录或测试用例，无法删除");
        if(mapper.deleteDirectory(tenant,actual,id,RequestContext.userId())!=1) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"目录不存在");
    }
    @Transactional public DirectoryView copyDirectory(String line,String id,CopyDirectory input){
        String tenant=RequestContext.tenantId();Map<String,Object> source=mapper.directory(tenant,line,id);
        if(source==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"目录不存在");
        String actual=text(source,"productLineId");access.check(actual,true);String parent=blank(input.parentId());
        if(parent==null)parent=nullable(source,"parentId");
        if(parent!=null){Map<String,Object> target=mapper.directory(tenant,actual,parent);if(target==null)throw bad("目标父目录不存在或不属于当前产品线");if(id.equals(parent)||descendant(tenant,actual,id,parent))throw bad("不能将目录复制到自身或其子目录下");}
        String name=blank(input.name());if(name==null)name=text(source,"name")+" - 副本";
        String copiedId=copyDirectoryTree(tenant,actual,source,parent,required(name,"目录名称",120));
        return directories(actual).stream().filter(value->value.id().equals(copiedId)).findFirst().orElseThrow();
    }
    public CasePage list(String line,Query input){
        if (!"all".equals(line)) access.check(line,false);int page=Math.max(1,input.page()),size=Math.min(100,Math.max(1,input.pageSize()));
        String tenant=RequestContext.tenantId();
        String directory = blank(input.directoryId());
        List<String> directoryIds = input.includeDescendants() && directory != null
            ? descendantDirectoryIds(tenant, line, directory)
            : List.of();
        Query q=new Query(directory,blank(input.keyword()),blank(input.priority()),blank(input.ownerId()),null,input.enabled(),page,size,input.includeDescendants(),directoryIds);
        return new CasePage(mapper.list(tenant,line,q).stream().map(this::view).toList(),page,size,mapper.count(tenant,line,q));
    }
    private List<String> descendantDirectoryIds(String tenant, String line, String root) {
        Map<String, Object> rootDirectory = mapper.directory(tenant, line, root);
        if (rootDirectory == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "目录不存在");
        String directoryLine = "all".equals(line) ? text(rootDirectory, "productLineId") : line;
        List<String> ids = new ArrayList<>();
        ArrayDeque<String> pending = new ArrayDeque<>();
        pending.add(root);
        while (!pending.isEmpty()) {
            String current = pending.removeFirst();
            ids.add(current);
            mapper.childDirectories(tenant, directoryLine, current).forEach(child -> pending.addLast(text(child, "id")));
        }
        return ids;
    }
    public CaseView detail(String line,String id){if (!"all".equals(line)) access.check(line,false);return require(line,id);}
    @Transactional public CaseView create(String line,SaveCase input){
        String actualLine = "all".equals(line) ? text(mapper.directory(RequestContext.tenantId(),"all",required(input.directoryId(),"功能目录",36)),"productLineId") : line;
        access.check(actualLine,true);validate(actualLine,input,false);String tenant=RequestContext.tenantId();Map<String,Object> owner=mapper.employee(tenant,input.ownerId());
        CaseState binding=initialState(actualLine,input.workItemTypeId(),input.statusKey());
        String id=UUID.randomUUID().toString(),code="TC-"+String.format("%06d",mapper.nextCode(tenant,actualLine));
        try{mapper.insertCase(tenant,actualLine,id,code,input,text(owner,"name"),encode(input.tags()),binding.typeId(),binding.workflowId(),binding.state(),RequestContext.userId());mapper.replaceSteps(tenant,id,input.steps(),RequestContext.userId());}
        catch(DataIntegrityViolationException e){throw conflict("用例编号或目录数据发生冲突，请重试");}
        return require(actualLine,id);
    }
    @Transactional public CaseView update(String line,String id,SaveCase input){
        access.check(line,true);CaseView current=require(line,id);validate(line,input,true);String tenant=RequestContext.tenantId();Map<String,Object> owner=mapper.employee(tenant,input.ownerId());
        CaseState binding=updatedState(line,current,input.workItemTypeId(),input.statusKey());
        if(mapper.updateCase(tenant,line,id,input,text(owner,"name"),encode(input.tags()),binding.typeId(),binding.workflowId(),binding.state(),RequestContext.userId())!=1)throw conflict("测试用例已被其他人修改，请刷新后重试");
        mapper.replaceSteps(tenant,id,input.steps(),RequestContext.userId());return require(line,id);
    }
    @Transactional public CaseView setEnabled(String line,String id,int revision,boolean enabled){
        access.check(line,true);require(line,id);if(mapper.setEnabled(RequestContext.tenantId(),line,id,revision,enabled,RequestContext.userId())!=1)throw conflict("测试用例已变化，请刷新后重试");return require(line,id);
    }
    @Transactional public void batch(String line,BatchUpdate input){
        List<String> ids=input.caseIds()==null?List.of():input.caseIds().stream().filter(Objects::nonNull).map(String::trim).filter(v->!v.isBlank()).distinct().toList();
        if(ids.isEmpty())throw bad("请选择至少一条测试用例");if(ids.size()>100)throw bad("单次最多处理100条测试用例");
        String tenant=RequestContext.tenantId(),operation=required(input.operation(),"批量操作",20).toUpperCase(Locale.ROOT),value=blank(input.value());
        Map<String,List<String>> byLine=new LinkedHashMap<>();List<Map<String,Object>> rows=new ArrayList<>();
        for(String id:ids){Map<String,Object> row=mapper.item(tenant,line,id);if(row==null)throw bad("所选测试用例不存在或不在当前范围内");String actual=text(row,"productLineId");access.check(actual,true);byLine.computeIfAbsent(actual,key->new ArrayList<>()).add(id);rows.add(row);}
        if("MOVE".equals(operation)){if(value==null)throw bad("请选择目标目录");Map<String,Object> directory=mapper.directory(tenant,"all",value);if(directory==null)throw bad("目标目录不存在");String targetLine=text(directory,"productLineId");if(byLine.size()!=1||!byLine.containsKey(targetLine))throw bad("测试用例只能移动到同一产品线的目录");if(mapper.moveCases(tenant,targetLine,ids,value,RequestContext.userId())!=ids.size())throw conflict("部分测试用例已变化，请刷新后重试");return;}
        if("OWNER".equals(operation)){Map<String,Object> owner=value==null?null:mapper.employee(tenant,value);if(owner==null)throw bad("负责人不存在或已停用");byLine.forEach((actual,caseIds)->mapper.updateOwner(tenant,actual,caseIds,value,text(owner,"name"),RequestContext.userId()));return;}
        if("PRIORITY".equals(operation)){if(!Set.of("P0","P1","P2","P3").contains(value))throw bad("优先级必须为P0至P3");byLine.forEach((actual,caseIds)->mapper.updatePriority(tenant,actual,caseIds,value,RequestContext.userId()));return;}
        if("DELETE".equals(operation)){if(rows.stream().anyMatch(row->longNumber(row,"referenceCount")>0))throw bad("已被测试任务引用的用例不能删除");byLine.forEach((actual,caseIds)->mapper.deleteCases(tenant,actual,caseIds,RequestContext.userId()));return;}
        if("TYPE".equals(operation))throw bad("测试用例库中的类型固定为测试用例，不能修改");
        throw bad("不支持的批量操作");
    }
    private void validate(String line,SaveCase input,boolean updating){
        required(input.title(),"用例标题",255);if(mapper.directory(RequestContext.tenantId(),line,required(input.directoryId(),"功能目录",36))==null)throw bad("功能目录不存在或不属于当前产品线");
        if(!Set.of("P0","P1","P2","P3").contains(input.priority()))throw bad("优先级必须为P0至P3");
        if(mapper.employee(RequestContext.tenantId(),required(input.ownerId(),"负责人",36))==null)throw bad("负责人不存在或已停用");
        String requirement=blank(input.sourceRequirementId());if(requirement!=null&&mapper.requirement(RequestContext.tenantId(),line,requirement)==null)throw bad("来源需求不存在或不属于当前产品线");
        if(input.steps()==null||input.steps().isEmpty())throw bad("至少添加一个测试步骤");
        for(int i=0;i<input.steps().size();i++){StepInput step=input.steps().get(i);required(step.action(),"第"+(i+1)+"步操作",5000);required(step.expectedResult(),"第"+(i+1)+"步预期结果",5000);}
        if(updating&&input.revision()==null)throw bad("修改测试用例必须提供数据版本");
    }
    private CaseView require(String line,String id){Map<String,Object> row=mapper.item(RequestContext.tenantId(),line,id);if(row==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"测试用例不存在");return view(row);}
    private boolean descendant(String tenant,String line,String sourceId,String candidate){String current=candidate;while(current!=null){if(sourceId.equals(current))return true;Map<String,Object> row=mapper.directory(tenant,line,current);current=row==null?null:nullable(row,"parentId");}return false;}
    private String copyDirectoryTree(String tenant,String line,Map<String,Object> source,String parent,String name){
        String id=UUID.randomUUID().toString();try{mapper.insertDirectory(tenant,line,id,parent,name,number(source,"sort"),RequestContext.userId());}catch(DataIntegrityViolationException e){throw conflict("目标位置已存在同名目录");}
        for(Map<String,Object> sourceCase:mapper.casesInDirectory(tenant,line,text(source,"id"))){
            List<StepInput> steps=mapper.steps(tenant,text(sourceCase,"id")).stream().map(step->new StepInput(null,number(step,"sort"),text(step,"action"),text(step,"expectedResult"))).toList();
            SaveCase copy=new SaveCase(id,nullable(sourceCase,"sourceRequirementId"),text(sourceCase,"title"),nullable(sourceCase,"precondition"),text(sourceCase,"priority"),text(sourceCase,"ownerId"),decode(sourceCase.get("tags")),steps,text(sourceCase,"workItemTypeId"),text(sourceCase,"statusKey"),null);
            CaseState binding=state(line,text(sourceCase,"workItemTypeId"),text(sourceCase,"workflowId"),text(sourceCase,"statusKey"));
            String caseId=UUID.randomUUID().toString(),code="TC-"+String.format("%06d",mapper.nextCode(tenant,line));mapper.insertCase(tenant,line,caseId,code,copy,text(sourceCase,"ownerName"),encode(copy.tags()),binding.typeId(),binding.workflowId(),binding.state(),RequestContext.userId());mapper.replaceSteps(tenant,caseId,steps,RequestContext.userId());if(!enabled(sourceCase.get("enabled")))mapper.setEnabled(tenant,line,caseId,0,false,RequestContext.userId());
        }
        for(Map<String,Object> child:mapper.childDirectories(tenant,line,text(source,"id")))copyDirectoryTree(tenant,line,child,id,text(child,"name"));
        return id;
    }
    private CaseView view(Map<String,Object> row){
        String id=text(row,"id");List<StepInput> steps=mapper.steps(RequestContext.tenantId(),id).stream().map(s->new StepInput(text(s,"id"),number(s,"sort"),text(s,"action"),text(s,"expectedResult"))).toList();
        return new CaseView(id,text(row,"code"),text(row,"productLineId"),text(row,"directoryId"),text(row,"directoryName"),nullable(row,"sourceRequirementId"),nullable(row,"sourceRequirementTitle"),text(row,"title"),nullable(row,"precondition"),text(row,"priority"),text(row,"ownerId"),text(row,"ownerName"),text(row,"creatorName"),decode(row.get("tags")),text(row,"workItemTypeId"),text(row,"workItemTypeName"),text(row,"workflowId"),text(row,"statusKey"),text(row,"statusName"),text(row,"statusGroup"),text(row,"statusColor"),enabled(row.get("enabled")),number(row,"revision"),longNumber(row,"referenceCount"),nullable(row,"latestResult"),time(row.get("createdAt")),time(row.get("updatedAt")),steps);
    }
    private CaseState initialState(String line,String requestedType,String requestedStatus){
        String tenant=RequestContext.tenantId();String typeId=blank(requestedType);
        if(typeId==null){Map<String,Object> defaultType=workItems.defaultType(tenant,line,"用例");if(defaultType==null)throw bad("当前产品线未配置可用的用例类型");typeId=text(defaultType,"id");}
        configurations.requireTypeForLegacy(line,typeId,"case");
        Map<String,Object> workflow=workItems.publishedWorkflow(tenant,line,"case",typeId);
        if(workflow==null||!typeId.equals(workflow.get("taskTypeId")))throw conflict("所选用例类型没有已发布的阶段流程");
        WorkItemDefinition.State initial=configurations.decode(workflow.get("definition")).states().stream().filter(WorkItemDefinition.State::initial).findFirst().orElseThrow();
        if(blank(requestedStatus)!=null&&!initial.key().equals(requestedStatus))throw bad("新建用例必须使用默认阶段");
        return new CaseState(typeId,text(workflow,"id"),initial);
    }
    private CaseState updatedState(String line,CaseView current,String requestedType,String requestedStatus){
        String typeId=required(requestedType,"用例类型",36);
        if(!typeId.equals(current.workItemTypeId()))return initialState(line,typeId,requestedStatus);
        String targetKey=required(requestedStatus,"用例阶段",64);
        CaseState target=state(line,typeId,current.workflowId(),targetKey);
        if(!targetKey.equals(current.statusKey())){
            WorkItemDefinition.Workflow workflow=configurations.decode(configurations.requireWorkflow(line,current.workflowId()).get("definition"));
            boolean allowed=workflow.transitions().stream().anyMatch(edge->edge.from().equals(current.statusKey())&&edge.to().equals(targetKey));
            if(!allowed)throw bad("用例阶段不允许直接流转到所选阶段");
        }
        return target;
    }
    private CaseState state(String line,String typeId,String workflowId,String statusKey){
        configurations.requireType(line,typeId,"case",false);
        Map<String,Object> workflow=configurations.requireWorkflow(line,required(workflowId,"阶段流程",36));
        if(!"PUBLISHED".equals(workflow.get("status"))||!"case".equals(workflow.get("category"))||!typeId.equals(workflow.get("taskTypeId")))throw bad("用例绑定的阶段流程无效");
        WorkItemDefinition.State state=configurations.decode(workflow.get("definition")).states().stream().filter(value->value.enabled()&&value.key().equals(statusKey)).findFirst().orElseThrow(()->bad("用例阶段不存在或已停用"));
        return new CaseState(typeId,workflowId,state);
    }
    private record CaseState(String typeId,String workflowId,WorkItemDefinition.State state){}
    private String encode(List<String> tags){try{return json.writeValueAsString(tags==null?List.of():tags.stream().filter(Objects::nonNull).map(String::trim).filter(v->!v.isBlank()).distinct().limit(20).toList());}catch(Exception e){throw bad("标签格式无效");}}
    private List<String> decode(Object value){try{return value==null?List.of():json.readValue(value.toString(),new TypeReference<>(){});}catch(Exception e){return List.of();}}
    private static String required(String value,String label,int max){String v=blank(value);if(v==null)throw bad("请填写"+label);if(v.length()>max)throw bad(label+"超出长度限制");return v;}
    private static String blank(String value){return value==null||value.trim().isEmpty()?null:value.trim();}
    private static String text(Map<String,Object> row,String key){return Objects.toString(row.get(key),"");}
    private static String nullable(Map<String,Object> row,String key){return row.get(key)==null?null:row.get(key).toString();}
    private static int number(Map<String,Object> row,String key){return row.get(key)==null?0:((Number)row.get(key)).intValue();}
    private static long longNumber(Map<String,Object> row,String key){return row.get(key)==null?0:((Number)row.get(key)).longValue();}
    private static boolean enabled(Object value){return value instanceof Boolean b?b:value instanceof Number n&&n.intValue()!=0;}
    private static java.time.LocalDateTime time(Object value){return value instanceof java.sql.Timestamp t?t.toLocalDateTime():(java.time.LocalDateTime)value;}
    private static IllegalArgumentException bad(String message){return new IllegalArgumentException(message);}
    private static ResponseStatusException conflict(String message){return new ResponseStatusException(HttpStatus.CONFLICT,message);}
}

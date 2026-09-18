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
    private final ObjectMapper json;
    public TestCaseService(TestCaseMapper mapper,WorkItemAccess access,ObjectMapper json){this.mapper=mapper;this.access=access;this.json=json;}

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
    @Transactional public DirectoryView renameDirectory(String line,String id,RenameDirectory input){ String actual="all".equals(line)?text(mapper.directory(RequestContext.tenantId(),"all",id),"productLineId"):line; access.check(actual,true); String name=required(input.name(),"目录名称",120); if(mapper.renameDirectory(RequestContext.tenantId(),actual,id,name,RequestContext.userId())!=1) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"目录不存在"); return directories(actual).stream().filter(v->v.id().equals(id)).findFirst().orElseThrow(); }
    @Transactional public void deleteDirectory(String line,String id){ String actual="all".equals(line)?text(mapper.directory(RequestContext.tenantId(),"all",id),"productLineId"):line; access.check(actual,true); if(mapper.hasChildren(RequestContext.tenantId(),actual,id)||mapper.hasCases(RequestContext.tenantId(),actual,id)) throw bad("目录下仍有子目录或测试用例，无法删除"); if(mapper.deleteDirectory(RequestContext.tenantId(),actual,id,RequestContext.userId())!=1) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"目录不存在"); }
    public CasePage list(String line,Query input){
        if (!"all".equals(line)) access.check(line,false);int page=Math.max(1,input.page()),size=Math.min(100,Math.max(1,input.pageSize()));
        Query q=new Query(blank(input.directoryId()),blank(input.keyword()),blank(input.priority()),blank(input.ownerId()),input.enabled(),page,size);
        String tenant=RequestContext.tenantId();return new CasePage(mapper.list(tenant,line,q).stream().map(this::view).toList(),page,size,mapper.count(tenant,line,q));
    }
    public CaseView detail(String line,String id){if (!"all".equals(line)) access.check(line,false);return require(line,id);}
    @Transactional public CaseView create(String line,SaveCase input){
        String actualLine = "all".equals(line) ? text(mapper.directory(RequestContext.tenantId(),"all",required(input.directoryId(),"功能目录",36)),"productLineId") : line;
        access.check(actualLine,true);validate(actualLine,input,false);String tenant=RequestContext.tenantId();Map<String,Object> owner=mapper.employee(tenant,input.ownerId());
        String id=UUID.randomUUID().toString(),code="TC-"+String.format("%06d",mapper.nextCode(tenant,line));
        try{mapper.insertCase(tenant,actualLine,id,code,input,text(owner,"name"),encode(input.tags()),RequestContext.userId());mapper.replaceSteps(tenant,id,input.steps(),RequestContext.userId());}
        catch(DataIntegrityViolationException e){throw conflict("用例编号或目录数据发生冲突，请重试");}
        return require(actualLine,id);
    }
    @Transactional public CaseView update(String line,String id,SaveCase input){
        access.check(line,true);require(line,id);validate(line,input,true);String tenant=RequestContext.tenantId();Map<String,Object> owner=mapper.employee(tenant,input.ownerId());
        if(mapper.updateCase(tenant,line,id,input,text(owner,"name"),encode(input.tags()),RequestContext.userId())!=1)throw conflict("测试用例已被其他人修改，请刷新后重试");
        mapper.replaceSteps(tenant,id,input.steps(),RequestContext.userId());return require(line,id);
    }
    @Transactional public CaseView setEnabled(String line,String id,int revision,boolean enabled){
        access.check(line,true);require(line,id);if(mapper.setEnabled(RequestContext.tenantId(),line,id,revision,enabled,RequestContext.userId())!=1)throw conflict("测试用例已变化，请刷新后重试");return require(line,id);
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
    private CaseView view(Map<String,Object> row){
        String id=text(row,"id");List<StepInput> steps=mapper.steps(RequestContext.tenantId(),id).stream().map(s->new StepInput(text(s,"id"),number(s,"sort"),text(s,"action"),text(s,"expectedResult"))).toList();
        return new CaseView(id,text(row,"code"),text(row,"productLineId"),text(row,"directoryId"),text(row,"directoryName"),nullable(row,"sourceRequirementId"),nullable(row,"sourceRequirementTitle"),text(row,"title"),nullable(row,"precondition"),text(row,"priority"),text(row,"ownerId"),text(row,"ownerName"),decode(row.get("tags")),enabled(row.get("enabled")),number(row,"revision"),longNumber(row,"referenceCount"),nullable(row,"latestResult"),time(row.get("createdAt")),time(row.get("updatedAt")),steps);
    }
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

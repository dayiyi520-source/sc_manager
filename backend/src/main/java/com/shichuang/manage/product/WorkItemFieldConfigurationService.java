package com.shichuang.manage.product;

import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class WorkItemFieldConfigurationService {
    public static final Set<String> SCENES=Set.of("CREATE","CREATE_CHILD","LIST","ITERATION");
    private static final List<Field> CATALOG=List.of(
        field("code","编号","TEXT",false,"LIST","ITERATION"), field("title","标题","TEXT",true,"CREATE","CREATE_CHILD","LIST","ITERATION"),
        field("description","任务描述","RICH_TEXT",false,"CREATE","CREATE_CHILD"), field("expectedGoal","验收标准","TEXTAREA",false,"CREATE"),
        field("productLine","所属产品线","SELECT",false,"CREATE"), field("taskType","工作项类型","SELECT",false,"CREATE","CREATE_CHILD","LIST","ITERATION"),
        field("status","状态","SELECT",false,"LIST","ITERATION"), field("assignee","负责人","USER",false,"CREATE","CREATE_CHILD","LIST","ITERATION"),
        field("priority","优先级","SELECT",false,"CREATE","CREATE_CHILD","LIST","ITERATION"), field("plannedStartDate","计划开始时间","DATE",false,"CREATE","CREATE_CHILD","ITERATION"),
        field("plannedEndDate","计划完成时间","DATE",false,"CREATE","CREATE_CHILD","LIST","ITERATION"), field("version","迭代版本","SELECT",false,"CREATE","LIST","ITERATION"),
        field("requirement","关联需求","RELATION",false,"CREATE"), field("customer","关联客户","SELECT",false,"CREATE"),
        field("cc","参与人","MULTI_USER",false,"CREATE","CREATE_CHILD"), field("attachments","附件","UPLOAD",false,"CREATE","CREATE_CHILD"),
        field("estimatedHours","预计工时","NUMBER",false,"CREATE","CREATE_CHILD"), field("actualHours","实际工时","NUMBER",false,"CREATE","CREATE_CHILD"),
        field("creator","创建人","USER",false,"LIST"), field("createdAt","创建时间","DATETIME",false,"LIST")
    );
    private final WorkItemFieldConfigurationMapper mapper; private final WorkItemCategoryService categories;
    public WorkItemFieldConfigurationService(WorkItemFieldConfigurationMapper mapper,WorkItemCategoryService categories) { this.mapper=mapper;this.categories=categories; }
    @Transactional public Map<String,Object> list(String categoryCode) { AuthorizationService.requireRead("product"); categories.requireByCode(categoryCode,false); ensureDefaults(categoryCode); return view(categoryCode); }
    @Transactional public Map<String,Object> save(String categoryCode,String scene,Map<String,Object> body) {
        AuthorizationService.requireWrite("product"); categories.requireByCode(categoryCode,true); requireScene(scene);
        Object raw=body.get("fields"); if(!(raw instanceof List<?> fields)) throw new IllegalArgumentException("字段配置不能为空");
        Map<String,Field> catalog=new LinkedHashMap<>(); CATALOG.forEach(item->catalog.put(item.code(),item)); Set<String> seen=new HashSet<>(); int index=0;
        for(Object value:fields) {
            if(!(value instanceof Map<?,?> row)) throw new IllegalArgumentException("字段配置格式无效"); String code=Objects.toString(row.get("fieldCode"),""); Field field=catalog.get(code);
            if(field==null||!field.scenes().contains(scene)||!seen.add(code)) throw new IllegalArgumentException("字段不存在、不适用于当前场景或重复");
            boolean visible=booleanValue(row.get("visible")); boolean required=visible&&booleanValue(row.get("required"));
            if(Set.of("LIST","ITERATION").contains(scene)) required=false; if(field.locked()&&Set.of("CREATE","CREATE_CHILD").contains(scene)) { visible=true;required=true; }
            mapper.upsert(RequestContext.tenantId(),categoryCode,scene,code,visible,required,number(row.get("sort"),++index*10),RequestContext.userId());
        }
        return view(categoryCode);
    }
    private void ensureDefaults(String categoryCode) { Set<String> existing=new HashSet<>(); mapper.list(RequestContext.tenantId(),categoryCode).forEach(row->existing.add(row.get("scene")+":"+row.get("fieldCode"))); String user=RequestContext.userId(); for(String scene:SCENES) { int sort=0; for(Field field:CATALOG) if(field.scenes().contains(scene)&&!existing.contains(scene+":"+field.code())) { sort+=10; boolean visible=defaultVisible(scene,field.code()); boolean required=defaultRequired(scene,field.code()); mapper.upsert(RequestContext.tenantId(),categoryCode,scene,field.code(),visible,required,sort,user); } } }
    private Map<String,Object> view(String categoryCode) { Map<String,Map<String,Object>> saved=new HashMap<>(); mapper.list(RequestContext.tenantId(),categoryCode).forEach(row->saved.put(row.get("scene")+":"+row.get("fieldCode"),row)); List<Map<String,Object>> scenes=new ArrayList<>(); for(String scene:List.of("CREATE","CREATE_CHILD","LIST","ITERATION")) { List<Map<String,Object>> fields=new ArrayList<>(); for(Field field:CATALOG) if(field.scenes().contains(scene)) { Map<String,Object> row=saved.get(scene+":"+field.code()); Map<String,Object> value=new LinkedHashMap<>(); value.put("fieldCode",field.code());value.put("label",field.label());value.put("fieldType",field.type());value.put("locked",field.locked()&&Set.of("CREATE","CREATE_CHILD").contains(scene));value.put("visible",row==null?defaultVisible(scene,field.code()):WorkItemTemplateService.asBoolean(row.get("visible")));value.put("required",row==null?defaultRequired(scene,field.code()):WorkItemTemplateService.asBoolean(row.get("required")));value.put("sort",row==null?fields.size()*10+10:row.get("sort")); fields.add(value); } fields.sort(Comparator.comparingInt(value->number(value.get("sort"),0))); scenes.add(Map.of("scene",scene,"fields",fields)); } return Map.of("categoryCode",categoryCode,"scenes",scenes); }
    private static boolean defaultVisible(String scene,String code) { return switch(scene) { case "CREATE" -> Set.of("title","description","expectedGoal","productLine","taskType","assignee","priority","plannedStartDate","plannedEndDate","version","requirement","customer","cc","attachments","estimatedHours").contains(code); case "CREATE_CHILD" -> Set.of("title","description","taskType","assignee","priority","plannedStartDate","plannedEndDate","cc","attachments","estimatedHours","actualHours").contains(code); case "LIST" -> Set.of("code","title","taskType","status","assignee","priority","plannedEndDate","version","creator","createdAt").contains(code); default -> Set.of("code","title","taskType","status","assignee","priority","plannedStartDate","plannedEndDate","version").contains(code); }; }
    private static boolean defaultRequired(String scene,String code) { return "CREATE".equals(scene)&&Set.of("title","productLine","taskType","assignee","priority","plannedStartDate").contains(code) || "CREATE_CHILD".equals(scene)&&Set.of("title","taskType","priority").contains(code); }
    private static void requireScene(String scene) { if(!SCENES.contains(scene)) throw new IllegalArgumentException("字段场景无效"); }
    private static boolean booleanValue(Object value) { return value instanceof Boolean bool?bool:value instanceof Number number&&number.intValue()!=0; }
    private static int number(Object value,int fallback) { return value instanceof Number number?number.intValue():fallback; }
    private static Field field(String code,String label,String type,boolean locked,String... scenes) { return new Field(code,label,type,locked,Set.of(scenes)); }
    private record Field(String code,String label,String type,boolean locked,Set<String> scenes) {}
}

package com.shichuang.manage.product;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static com.shichuang.manage.product.WorkItemDefinition.*;

@Service
public class WorkItemTemplateService {
    private final WorkItemTemplateMapper mapper;
    private final ObjectMapper json;
    public WorkItemTemplateService(WorkItemTemplateMapper mapper, ObjectMapper json) { this.mapper = mapper; this.json = json; }
    @Transactional
    public List<Map<String,Object>> list() {
        AuthorizationService.requireRead("product");
        if (mapper.types(RequestContext.tenantId()).isEmpty()) seedDefaults();
        return viewAll();
    }
    @Transactional public Map<String,Object> createType(CreateWorkItemType body) {
        AuthorizationService.requireWrite("product"); validateType(body); String tenant=RequestContext.tenantId(), user=RequestContext.userId();
        if (body.isDefault()) mapper.clearDefaults(tenant, body.category(), user);
        String id=UUID.randomUUID().toString(); Map<String,Object> values=new HashMap<>(); values.put("category",body.category()); values.put("name",body.name().trim()); values.put("description",body.description()); values.put("enabled",body.enabled()==null||body.enabled()); values.put("isDefault",Boolean.TRUE.equals(body.isDefault())); mapper.insertType(tenant,id,values,user); saveWorkflow(id,new SaveWorkflow(body.workflow().category(),body.name()+"状态配置",body.workflow().definition(),null)); return Map.of("id",id);
    }
    @Transactional public void updateType(String id, Map<String,Object> body) {
        AuthorizationService.requireWrite("product"); requireType(id); String tenant=RequestContext.tenantId(), user=RequestContext.userId();
        if (body.containsKey("category") && !CATEGORIES.containsKey(String.valueOf(body.get("category")))) throw new IllegalArgumentException("工作项分类无效");
        if (body.containsKey("name") && Objects.toString(body.get("name"),"").trim().isBlank()) throw new IllegalArgumentException("工作项类型名称不能为空");
        if (Boolean.TRUE.equals(body.get("isDefault"))) mapper.clearDefaults(tenant, String.valueOf(body.getOrDefault("category", requireType(id).get("category"))), user);
        if (mapper.updateType(tenant,id,body,user)==0) throw new NoSuchElementException("模板子类型不存在");
    }
    @Transactional public void deleteType(String id) { AuthorizationService.requireWrite("product"); requireType(id); mapper.deleteWorkflow(RequestContext.tenantId(),id,RequestContext.userId()); if(mapper.deleteType(RequestContext.tenantId(),id,RequestContext.userId())==0) throw new NoSuchElementException("模板子类型不存在"); }
    @Transactional public void saveWorkflow(String id, SaveWorkflow body) { AuthorizationService.requireWrite("product"); Map<String,Object> type=requireType(id); validate(body); String definition=mapper.encode(body.definition()); Map<String,Object> existing=mapper.workflow(RequestContext.tenantId(),id); String name=body.name().trim(); if(existing==null) mapper.insertWorkflow(RequestContext.tenantId(),id,String.valueOf(type.get("category")),name,definition,RequestContext.userId()); else if(body.revision()==null || mapper.updateWorkflow(RequestContext.tenantId(),id,name,definition,body.revision(),RequestContext.userId())==0) throw new IllegalArgumentException("模板状态已被其他人修改，请刷新后重试"); }
    private List<Map<String,Object>> viewAll() { List<Map<String,Object>> types=mapper.types(RequestContext.tenantId()); Map<String,Map<String,Object>> workflows=new HashMap<>(); mapper.workflows(RequestContext.tenantId()).forEach(row->{ try { Map<String,Object> copy=new LinkedHashMap<>(row); copy.put("definition",json.readValue(Objects.toString(row.get("definition")),Map.class)); workflows.put(String.valueOf(row.get("templateTypeId")),copy); } catch(JsonProcessingException e){ throw new IllegalStateException("模板状态格式无效",e); }}); types.forEach(type->{ type.put("enabled",asBoolean(type.get("enabled"))); type.put("isDefault",asBoolean(type.get("isDefault"))); type.put("workflow",workflows.get(type.get("id"))); }); return types; }
    static boolean asBoolean(Object value) { return value instanceof Boolean booleanValue ? booleanValue : value instanceof Number number ? number.intValue() != 0 : Boolean.parseBoolean(Objects.toString(value, "false")); }
    private Map<String,Object> requireType(String id) { Map<String,Object> type=mapper.type(RequestContext.tenantId(),id); if(type==null) throw new NoSuchElementException("模板子类型不存在"); return type; }
    private void validateType(CreateWorkItemType body) { if(body==null||!CATEGORIES.containsKey(body.category())) throw new IllegalArgumentException("工作项分类无效"); required(body.name(),"工作项类型名称",128); if(body.workflow()==null) throw new IllegalArgumentException("请配置初始状态"); validate(body.workflow()); }
    private void validate(SaveWorkflow body) { if(body==null||!CATEGORIES.containsKey(body.category())) throw new IllegalArgumentException("工作项分类无效"); required(body.name(),"流程名称",128); validate(body.definition()); }
    private void validate(Workflow definition) {
        if (definition == null || definition.states() == null || definition.states().size() < 2)
            throw new IllegalArgumentException("每个工作项类型至少保留两个状态");
        WorkItemDefinition.validate(definition);
    }
    private void seedDefaults() {
        String tenant = RequestContext.tenantId();
        String user = RequestContext.userId();
        for (WorkItemTemplate.Type type : WorkItemTemplate.types()) {
            String id = UUID.randomUUID().toString();
            SaveWorkflow workflow = WorkItemTemplate.workflow(type);
            Map<String,Object> values = new HashMap<>();
            values.put("category", type.category());
            values.put("name", type.name());
            values.put("description", "");
            values.put("enabled", true);
            values.put("isDefault", type.isDefault());
            if (type.isDefault()) mapper.clearDefaults(tenant, type.category(), user);
            mapper.insertType(tenant, id, values, user);
            mapper.insertWorkflow(tenant, id, type.category(), workflow.name(), mapper.encode(workflow.definition()), user);
        }
    }
}

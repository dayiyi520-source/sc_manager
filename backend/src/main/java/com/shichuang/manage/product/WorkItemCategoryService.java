package com.shichuang.manage.product;

import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class WorkItemCategoryService {
    private static final List<Map<String,Object>> DEFAULTS = List.of(
        value("requirement", "产品", "产品任务", "requirement", "STANDARD", 10), value("design", "设计", "设计任务", "design", "STANDARD", 20),
        value("dev", "研发", "研发任务", "dev", "STANDARD", 30), value("test", "测试", "测试任务", "test", "STANDARD", 40),
        value("bug", "缺陷", "缺陷任务", "bug", "STANDARD", 50), value("case", "用例", "测试用例", "case", "TEST_CASE", 60));
    private final WorkItemCategoryMapper mapper;
    public WorkItemCategoryService(WorkItemCategoryMapper mapper) { this.mapper = mapper; }
    @Transactional public List<Map<String,Object>> list() {
        AuthorizationService.requireRead("product");
        String tenant = RequestContext.tenantId();
        if (mapper.list(tenant).isEmpty()) seed(tenant);
        return mapper.list(tenant).stream().map(this::normalize).toList();
    }
    @Transactional public void update(String id, Map<String,Object> body) {
        AuthorizationService.requireWrite("product");
        Map<String,Object> current = mapper.find(RequestContext.tenantId(), id);
        if (current == null) throw new NoSuchElementException("工作项分类不存在");
        String name = Objects.toString(body.getOrDefault("name", current.get("name")), "").trim();
        String displayName = Objects.toString(body.getOrDefault("displayName", current.get("displayName")), "").trim();
        String iconKey = Objects.toString(body.getOrDefault("iconKey", current.get("iconKey")), "").trim();
        String capabilityType=Objects.toString(body.getOrDefault("capabilityType",current.get("capabilityType")),"").trim();
        if (name.isBlank() || name.length()>64) throw new IllegalArgumentException("分类名称不能为空且不能超过64个字符");
        if (displayName.isBlank() || displayName.length() > 64) throw new IllegalArgumentException("界面显示名称不能为空且不能超过64个字符");
        if (!iconKey.matches("[a-zA-Z][a-zA-Z0-9_-]{0,63}")) throw new IllegalArgumentException("图标标识无效");
        if (!Set.of("STANDARD","TEST_CASE").contains(capabilityType)) throw new IllegalArgumentException("能力类型无效");
        Map<String,Object> values = new HashMap<>(body); values.put("name", name); values.put("displayName", displayName); values.put("iconKey", iconKey); values.put("capabilityType",capabilityType);
        if (mapper.update(RequestContext.tenantId(), id, values, RequestContext.userId()) == 0) throw new NoSuchElementException("工作项分类不存在");
    }
    @Transactional public Map<String,Object> create(Map<String,Object> body) {
        AuthorizationService.requireWrite("product"); String tenant=RequestContext.tenantId(),user=RequestContext.userId();
        String code=Objects.toString(body.get("code"),"").trim().toLowerCase(Locale.ROOT);
        String name=Objects.toString(body.get("name"),"").trim(); String displayName=Objects.toString(body.get("displayName"),"").trim();
        String iconKey=Objects.toString(body.getOrDefault("iconKey","requirement"),"").trim(); String capabilityType=Objects.toString(body.getOrDefault("capabilityType","STANDARD"),"").trim();
        if(!code.matches("[a-z][a-z0-9_-]{1,31}")) throw new IllegalArgumentException("稳定编码需以小写字母开头，仅使用小写字母、数字、下划线或短横线，长度2至32位");
        if(name.isBlank()||name.length()>64||displayName.isBlank()||displayName.length()>64) throw new IllegalArgumentException("分类名称和界面显示名称不能为空且不能超过64个字符");
        if(!iconKey.matches("[a-zA-Z][a-zA-Z0-9_-]{0,63}")||!Set.of("STANDARD","TEST_CASE").contains(capabilityType)) throw new IllegalArgumentException("图标或能力类型无效");
        if(mapper.codeExists(tenant,code)) throw new IllegalArgumentException("稳定编码已存在"); if(mapper.nameExists(tenant,name)) throw new IllegalArgumentException("分类名称已存在");
        String id=UUID.randomUUID().toString(); Map<String,Object> value=new HashMap<>(); value.put("code",code);value.put("name",name);value.put("displayName",displayName);value.put("iconKey",iconKey);value.put("capabilityType",capabilityType);value.put("sort",number(body.get("sort"),100));value.put("enabled",body.get("enabled")==null||Boolean.TRUE.equals(body.get("enabled")));value.put("builtIn",false); mapper.insert(tenant,id,value,user); return Map.of("id",id,"code",code);
    }
    @Transactional public void delete(String id) { AuthorizationService.requireWrite("product"); String tenant=RequestContext.tenantId(); Map<String,Object> current=mapper.find(tenant,id); if(current==null) throw new NoSuchElementException("工作项分类不存在"); if(asBoolean(current.get("builtIn"))) throw new IllegalArgumentException("内置分类不能删除"); if(mapper.referenceCount(tenant,Objects.toString(current.get("code")),Objects.toString(current.get("name")))>0) throw new IllegalArgumentException("分类已被模板、产品类型或工作项引用，不能删除"); if(mapper.softDelete(tenant,id,((Number)current.get("revision")).intValue(),RequestContext.userId())!=1) throw new IllegalArgumentException("分类已被其他人修改，请刷新后重试"); }
    public Map<String,Object> requireByCode(String code, boolean enabled) { Map<String,Object> value=mapper.findByCode(RequestContext.tenantId(),code); if(value==null || enabled&&!asBoolean(value.get("enabled"))) throw new IllegalArgumentException("工作项分类无效或已停用"); return normalize(value); }
    public Map<String,Object> requireByTemplateCategory(String name, boolean enabled) { Map<String,Object> value=mapper.findByName(RequestContext.tenantId(),name); if(value==null || enabled&&!asBoolean(value.get("enabled"))) throw new IllegalArgumentException("工作项分类无效或已停用"); return normalize(value); }
    public String templateCategoryName(String code,boolean enabled) { Map<String,Object> value=requireByCode(code,enabled); return "requirement".equals(code)?"需求":Objects.toString(value.get("name")); }
    private void seed(String tenant) { String user = RequestContext.userId(); DEFAULTS.forEach(value -> mapper.insert(tenant, UUID.randomUUID().toString(), value, user)); }
    private Map<String,Object> normalize(Map<String,Object> row) { Map<String,Object> result = new LinkedHashMap<>(row); result.put("enabled", WorkItemTemplateService.asBoolean(row.get("enabled"))); result.put("builtIn", WorkItemTemplateService.asBoolean(row.get("builtIn"))); return result; }
    private static boolean asBoolean(Object value) { return WorkItemTemplateService.asBoolean(value); }
    private static int number(Object value,int fallback) { return value instanceof Number number?number.intValue():fallback; }
    private static Map<String,Object> value(String code,String name,String displayName,String iconKey,String capabilityType,int sort) { return Map.of("code",code,"name",name,"displayName",displayName,"iconKey",iconKey,"capabilityType",capabilityType,"sort",sort,"enabled",true,"builtIn",true); }
}

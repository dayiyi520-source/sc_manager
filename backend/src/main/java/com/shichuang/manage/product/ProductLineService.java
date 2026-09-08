package com.shichuang.manage.product;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class ProductLineService {
 private final ProductLineMapper mapper;
 public ProductLineService(ProductLineMapper mapper){this.mapper=mapper;}
 public List<Map<String,Object>> list(String keyword){return mapper.list(RequestContext.tenantId(),keyword==null?"":keyword.trim());}
 public Map<String,Object> detail(String id){Map<String,Object> line=mapper.find(RequestContext.tenantId(),id); if(line==null) throw new NoSuchElementException("产品线不存在"); line.put("members",mapper.members(RequestContext.tenantId(),id)); line.put("versions",mapper.versions(RequestContext.tenantId(),id)); line.put("requirements",mapper.requirements(RequestContext.tenantId(),id)); return line;}
 public Map<String,Object> create(Map<String,Object>b){if(String.valueOf(b.getOrDefault("name","")).isBlank()) throw new IllegalArgumentException("产品线名称不能为空"); String id=UUID.randomUUID().toString(); String code=String.valueOf(b.getOrDefault("code","PL-"+String.format("%03d",mapper.count(RequestContext.tenantId())+1))); mapper.insert(RequestContext.tenantId(),id,code,b,RequestContext.userId()); return Map.of("id",id,"code",code);}
 public void update(String id,Map<String,Object>b){if(mapper.update(RequestContext.tenantId(),id,b,RequestContext.userId())==0) throw new NoSuchElementException("产品线不存在");}
 public void status(String id,String status){if(!Set.of("启用中","已停用").contains(status)) throw new IllegalArgumentException("状态无效"); if(mapper.status(RequestContext.tenantId(),id,status,RequestContext.userId())==0) throw new NoSuchElementException("产品线不存在");}
 public List<Map<String,Object>> members(String id){return mapper.members(RequestContext.tenantId(),id);} public void addMember(String id,Map<String,Object>b){mapper.addMember(RequestContext.tenantId(),id,b,RequestContext.userId());}
 public List<Map<String,Object>> versions(String id){return mapper.versions(RequestContext.tenantId(),id);} public void addVersion(String id,Map<String,Object>b){mapper.addVersion(RequestContext.tenantId(),id,b,RequestContext.userId());} public void updateVersion(String id,Map<String,Object>b){mapper.updateVersion(RequestContext.tenantId(),id,b,RequestContext.userId());}
}

package com.shichuang.manage.product;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class ProductLineMapper {
  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;
  public ProductLineMapper(JdbcTemplate jdbc, ObjectMapper objectMapper) { this.jdbc = jdbc; this.objectMapper = objectMapper; }
  List<Map<String,Object>> list(String tenant, String keyword) { String like = "%" + keyword + "%"; return jdbc.queryForList("SELECT id_ AS id,code_ AS code,name_ AS name,description_ AS description,owner_name_ AS ownerName,website_ AS website,cover_image_ AS coverImage,status_ AS health,current_version_ AS currentVersion FROM t_product_line WHERE tenant_id_=? AND delete_flag_=0 AND (name_ LIKE ? OR code_ LIKE ?) ORDER BY create_time_ DESC", tenant, like, like); }
  Map<String,Object> find(String tenant, String id) { List<Map<String,Object>> rows=jdbc.queryForList("SELECT id_ AS id,code_ AS code,name_ AS name,description_ AS description,owner_name_ AS ownerName,website_ AS website,cover_image_ AS coverImage,status_ AS health,current_version_ AS currentVersion FROM t_product_line WHERE tenant_id_=? AND id_=? AND delete_flag_=0",tenant,id); return rows.isEmpty()?null:rows.get(0); }
  void insert(String tenant,String id,String code,Map<String,Object>b,String user){ jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,description_,owner_name_,website_,cover_image_,status_,current_version_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,NOW(),NOW())",id,tenant,code,b.get("name"),b.get("description"),b.get("ownerName"),b.get("website"),b.get("coverImage"),b.getOrDefault("status","启用中"),b.getOrDefault("currentVersion","1.0.0"),user,user); }
  int update(String tenant,String id,Map<String,Object>b,String user){ return jdbc.update("UPDATE t_product_line SET name_=COALESCE(?,name_),description_=COALESCE(?,description_),owner_name_=COALESCE(?,owner_name_),website_=COALESCE(?,website_),cover_image_=COALESCE(?,cover_image_),status_=COALESCE(?,status_),current_version_=COALESCE(?,current_version_),update_by_=?,version_=version_+1,update_time_=NOW() WHERE tenant_id_=? AND id_=? AND delete_flag_=0",b.get("name"),b.get("description"),b.get("ownerName"),b.get("website"),b.get("coverImage"),b.get("status"),b.get("currentVersion"),user,tenant,id); }
  int status(String tenant,String id,String status,String user){ return jdbc.update("UPDATE t_product_line SET status_=?,update_by_=?,version_=version_+1,update_time_=NOW() WHERE tenant_id_=? AND id_=? AND delete_flag_=0",status,user,tenant,id); }
  long count(String tenant){ Long n=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_line WHERE tenant_id_=? AND delete_flag_=0",Long.class,tenant); return n==null?0:n; }
  List<Map<String,Object>> members(String tenant,String id){ return jdbc.queryForList("SELECT id_ AS id,user_id_ AS userId,member_name_ AS memberName,role_ AS role FROM t_product_line_member WHERE tenant_id_=? AND product_line_id_=? AND delete_flag_=0 ORDER BY create_time_",tenant,id); }
  void addMember(String tenant,String lineId,Map<String,Object>b,String user){ jdbc.update("INSERT INTO t_product_line_member(id_,tenant_id_,product_line_id_,user_id_,member_name_,role_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,NOW(),NOW())",UUID.randomUUID().toString(),tenant,lineId,b.get("userId"),b.get("memberName"),b.get("role"),user,user); }
  List<Map<String,Object>> versions(String tenant,String id){ return jdbc.queryForList("SELECT id_ AS id,code_,name_,start_date_ AS startDate,end_date_ AS endDate,content_,status_,linked_requirement_ids_ AS linkedRequirementIds FROM t_product_line_version WHERE tenant_id_=? AND product_line_id_=? AND delete_flag_=0 ORDER BY start_date_ DESC,create_time_ DESC",tenant,id); }
  List<Map<String,Object>> requirements(String tenant,String id){ return jdbc.queryForList("SELECT id_ AS id,code_ AS code,title_ AS title,status_ AS status,priority_ AS priority,owner_name_ AS ownerName,version_name_ AS versionName FROM t_product_requirement WHERE tenant_id_=? AND product_line_id_=? AND delete_flag_=0 ORDER BY create_time_ DESC",tenant,id); }
  void addVersion(String tenant,String lineId,Map<String,Object>b,String user){ jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,start_date_,end_date_,content_,status_,linked_requirement_ids_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,CAST(? AS JSON),?,?,NOW(),NOW())",UUID.randomUUID().toString(),tenant,lineId,b.get("code"),b.get("name"),b.get("startDate"),b.get("endDate"),b.get("content"),b.getOrDefault("status","待开始"),json(b.getOrDefault("linkedRequirementIds",List.of())),user,user); }
  int updateVersion(String tenant,String id,Map<String,Object>b,String user){ return jdbc.update("UPDATE t_product_line_version SET name_=COALESCE(?,name_),start_date_=COALESCE(?,start_date_),end_date_=COALESCE(?,end_date_),content_=COALESCE(?,content_),status_=COALESCE(?,status_),linked_requirement_ids_=COALESCE(CAST(? AS JSON),linked_requirement_ids_),update_by_=?,version_=version_+1,update_time_=NOW() WHERE tenant_id_=? AND id_=? AND delete_flag_=0",b.get("name"),b.get("startDate"),b.get("endDate"),b.get("content"),b.get("status"),json(b.get("linkedRequirementIds")),user,tenant,id); }
  private String json(Object value) { try { return objectMapper.writeValueAsString(value); } catch (JsonProcessingException e) { throw new IllegalArgumentException("版本关联需求格式无效", e); } }
}

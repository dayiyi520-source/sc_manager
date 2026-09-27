package com.shichuang.manage.product;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class WorkItemTemplateMapper {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public WorkItemTemplateMapper(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }

    List<Map<String,Object>> types(String tenant) {
        return jdbc.queryForList("SELECT id_ AS id,category_ AS category,name_ AS name,description_ AS description,enabled_ AS enabled,is_default_ AS isDefault,version_ AS revision FROM t_work_item_template_type WHERE tenant_id_=? AND delete_flag_=0 ORDER BY category_,is_default_ DESC,create_time_,id_", tenant);
    }
    Map<String,Object> type(String tenant, String id) {
        List<Map<String,Object>> rows = jdbc.queryForList("SELECT id_ AS id,category_ AS category,name_ AS name,description_ AS description,enabled_ AS enabled,is_default_ AS isDefault,version_ AS revision FROM t_work_item_template_type WHERE tenant_id_=? AND id_=? AND delete_flag_=0", tenant, id);
        return rows.isEmpty() ? null : rows.get(0);
    }
    List<Map<String,Object>> workflows(String tenant) {
        return jdbc.queryForList("SELECT id_ AS id,template_type_id_ AS templateTypeId,category_ AS category,name_ AS name,definition_ AS definition,revision_ AS revision FROM t_work_item_template_workflow WHERE tenant_id_=? AND delete_flag_=0", tenant);
    }
    Map<String,Object> workflow(String tenant, String typeId) {
        List<Map<String,Object>> rows = jdbc.queryForList("SELECT id_ AS id,template_type_id_ AS templateTypeId,category_ AS category,name_ AS name,definition_ AS definition,revision_ AS revision FROM t_work_item_template_workflow WHERE tenant_id_=? AND template_type_id_=? AND delete_flag_=0", tenant, typeId);
        return rows.isEmpty() ? null : rows.get(0);
    }
    void insertType(String tenant, String id, Map<String,Object> body, String user) {
        jdbc.update("INSERT INTO t_work_item_template_type(id_,tenant_id_,category_,name_,description_,enabled_,is_default_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))", id, tenant, body.get("category"), body.get("name"), body.getOrDefault("description", ""), Boolean.TRUE.equals(body.getOrDefault("enabled", true)) ? 1 : 0, Boolean.TRUE.equals(body.getOrDefault("isDefault", false)) ? 1 : 0, user, user);
    }
    int updateType(String tenant, String id, Map<String,Object> body, String user) {
        return jdbc.update("UPDATE t_work_item_template_type SET category_=COALESCE(?,category_),name_=COALESCE(?,name_),description_=COALESCE(?,description_),enabled_=COALESCE(?,enabled_),is_default_=CASE WHEN COALESCE(?,enabled_)=0 THEN 0 ELSE COALESCE(?,is_default_) END,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND delete_flag_=0", body.get("category"), body.get("name"), body.get("description"), body.containsKey("enabled") ? (Boolean.TRUE.equals(body.get("enabled")) ? 1 : 0) : null, body.containsKey("enabled") ? (Boolean.TRUE.equals(body.get("enabled")) ? 1 : 0) : null, body.containsKey("isDefault") ? (Boolean.TRUE.equals(body.get("isDefault")) ? 1 : 0) : null, user, tenant, id);
    }
    int deleteType(String tenant, String id, String user) { return jdbc.update("UPDATE t_work_item_template_type SET delete_flag_=1,update_by_= ?,update_time_=NOW(6),version_=version_+1 WHERE tenant_id_=? AND id_=? AND delete_flag_=0", user, tenant, id); }
    void clearDefaults(String tenant, String category, String user) { jdbc.update("UPDATE t_work_item_template_type SET is_default_=0,version_=version_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND category_=? AND delete_flag_=0", user, tenant, category); }
    void insertWorkflow(String tenant, String typeId, String category, String name, String definition, String user) { jdbc.update("INSERT INTO t_work_item_template_workflow(id_,tenant_id_,template_type_id_,category_,name_,definition_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?, ?,NOW(6),NOW(6))", UUID.randomUUID().toString(), tenant, typeId, category, name, definition, user, user); }
    int updateWorkflow(String tenant, String typeId, String name, String definition, int revision, String user) { return jdbc.update("UPDATE t_work_item_template_workflow SET name_=?,definition_=CAST(? AS JSON),revision_=revision_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND template_type_id_=? AND revision_=? AND delete_flag_=0", name, definition, user, tenant, typeId, revision); }
    int deleteWorkflow(String tenant, String typeId, String user) { return jdbc.update("UPDATE t_work_item_template_workflow SET delete_flag_=1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND template_type_id_=? AND delete_flag_=0", user, tenant, typeId); }
    String encode(Object value) { try { return json.writeValueAsString(value); } catch (JsonProcessingException e) { throw new IllegalArgumentException("模板状态格式无效", e); } }
}

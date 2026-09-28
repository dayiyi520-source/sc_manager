package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public class WorkItemCategoryMapper {
    private final JdbcTemplate jdbc;
    public WorkItemCategoryMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    List<Map<String,Object>> list(String tenant) {
        return jdbc.queryForList("SELECT id_ AS id,code_ AS code,name_ AS name,display_name_ AS displayName,icon_key_ AS iconKey,capability_type_ AS capabilityType,sort_ AS sort,enabled_ AS enabled,built_in_ AS builtIn,version_ AS revision FROM t_work_item_category_dictionary WHERE tenant_id_=? AND delete_flag_=0 ORDER BY sort_,id_", tenant);
    }
    Map<String,Object> find(String tenant, String id) {
        List<Map<String,Object>> rows = jdbc.queryForList("SELECT id_ AS id,code_ AS code,name_ AS name,display_name_ AS displayName,icon_key_ AS iconKey,capability_type_ AS capabilityType,sort_ AS sort,enabled_ AS enabled,built_in_ AS builtIn,version_ AS revision FROM t_work_item_category_dictionary WHERE tenant_id_=? AND id_=? AND delete_flag_=0", tenant, id);
        return rows.isEmpty() ? null : rows.get(0);
    }
    Map<String,Object> findByCode(String tenant, String code) {
        List<Map<String,Object>> rows = jdbc.queryForList("SELECT id_ AS id,code_ AS code,name_ AS name,display_name_ AS displayName,icon_key_ AS iconKey,capability_type_ AS capabilityType,sort_ AS sort,enabled_ AS enabled,built_in_ AS builtIn,version_ AS revision FROM t_work_item_category_dictionary WHERE tenant_id_=? AND code_=? AND delete_flag_=0", tenant, code);
        return rows.isEmpty() ? null : rows.get(0);
    }
    Map<String,Object> findByName(String tenant, String name) {
        List<Map<String,Object>> rows = jdbc.queryForList("SELECT id_ AS id,code_ AS code,name_ AS name,display_name_ AS displayName,icon_key_ AS iconKey,capability_type_ AS capabilityType,sort_ AS sort,enabled_ AS enabled,built_in_ AS builtIn,version_ AS revision FROM t_work_item_category_dictionary WHERE tenant_id_=? AND (name_=? OR (code_='requirement' AND ?='需求')) AND delete_flag_=0", tenant, name, name);
        return rows.isEmpty() ? null : rows.get(0);
    }
    void insert(String tenant, String id, Map<String,Object> value, String user) {
        jdbc.update("INSERT INTO t_work_item_category_dictionary(id_,tenant_id_,code_,name_,display_name_,icon_key_,capability_type_,sort_,enabled_,built_in_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))", id, tenant, value.get("code"), value.get("name"), value.get("displayName"), value.get("iconKey"), value.getOrDefault("capabilityType", "STANDARD"), value.get("sort"), Boolean.TRUE.equals(value.getOrDefault("enabled", true)) ? 1 : 0, Boolean.TRUE.equals(value.getOrDefault("builtIn", true)) ? 1 : 0, user, user);
    }
    int update(String tenant, String id, Map<String,Object> value, String user) {
        return jdbc.update("UPDATE t_work_item_category_dictionary SET name_=COALESCE(?,name_),display_name_=COALESCE(?,display_name_),icon_key_=COALESCE(?,icon_key_),capability_type_=COALESCE(?,capability_type_),sort_=COALESCE(?,sort_),enabled_=COALESCE(?,enabled_),version_=version_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND delete_flag_=0", value.get("name"), value.get("displayName"), value.get("iconKey"), value.get("capabilityType"), value.get("sort"), value.containsKey("enabled") ? (Boolean.TRUE.equals(value.get("enabled")) ? 1 : 0) : null, user, tenant, id);
    }
    boolean codeExists(String tenant, String code) { return Boolean.TRUE.equals(jdbc.queryForObject("SELECT COUNT(*)>0 FROM t_work_item_category_dictionary WHERE tenant_id_=? AND code_=? AND delete_flag_=0", Boolean.class, tenant, code)); }
    boolean nameExists(String tenant, String name) { return Boolean.TRUE.equals(jdbc.queryForObject("SELECT COUNT(*)>0 FROM t_work_item_category_dictionary WHERE tenant_id_=? AND name_=? AND delete_flag_=0", Boolean.class, tenant, name)); }
    long referenceCount(String tenant, String code, String name) {
        Long templates=jdbc.queryForObject("SELECT COUNT(*) FROM t_work_item_template_type WHERE tenant_id_=? AND category_=? AND delete_flag_=0",Long.class,tenant,name);
        Long productTypes=jdbc.queryForObject("SELECT COUNT(*) FROM t_product_line_work_item_type WHERE tenant_id_=? AND category_=? AND delete_flag_=0",Long.class,tenant,name);
        Long items=jdbc.queryForObject("SELECT COUNT(*) FROM t_work_item WHERE tenant_id_=? AND category_=? AND delete_flag_=0",Long.class,tenant,code);
        return Objects.requireNonNullElse(templates,0L)+Objects.requireNonNullElse(productTypes,0L)+Objects.requireNonNullElse(items,0L);
    }
    int softDelete(String tenant,String id,int revision,String user) { return jdbc.update("UPDATE t_work_item_category_dictionary SET delete_flag_=1,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND built_in_=0 AND delete_flag_=0",user,tenant,id,revision); }
}

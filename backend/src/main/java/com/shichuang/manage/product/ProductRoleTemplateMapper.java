package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@Repository
public class ProductRoleTemplateMapper {
    private final JdbcTemplate jdbc;

    public ProductRoleTemplateMapper(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    List<Map<String, Object>> list(String tenantId) {
        return jdbc.queryForList("""
            SELECT id_ AS id, name_ AS name, responsibility_ AS responsibility, sort_ AS sort,
                   version_ AS revision, update_time_ AS updatedAt
            FROM t_product_role_template
            WHERE tenant_id_=? AND delete_flag_=0
            ORDER BY sort_, create_time_, id_
            """, tenantId);
    }

    Map<String, Object> find(String tenantId, String id) {
        return jdbc.query("""
            SELECT id_ AS id, name_ AS name, responsibility_ AS responsibility, sort_ AS sort,
                   version_ AS revision, update_time_ AS updatedAt
            FROM t_product_role_template
            WHERE tenant_id_=? AND id_=? AND delete_flag_=0
            """, result -> {
                if (!result.next()) return null;
                Map<String, Object> role = new LinkedHashMap<>();
                role.put("id", result.getString("id"));
                role.put("name", result.getString("name"));
                role.put("responsibility", result.getString("responsibility"));
                role.put("sort", result.getInt("sort"));
                role.put("revision", result.getInt("revision"));
                role.put("updatedAt", result.getTimestamp("updatedAt") == null ? null : result.getTimestamp("updatedAt").toLocalDateTime());
                return role;
            }, tenantId, id);
    }

    boolean activeNameExists(String tenantId, String name, String excludedId) {
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM t_product_role_template
            WHERE tenant_id_=? AND name_=? AND delete_flag_=0 AND (? IS NULL OR id_<>?)
            """, Integer.class, tenantId, name, excludedId, excludedId) > 0;
    }

    int nextSort(String tenantId) {
        Integer value = jdbc.queryForObject("SELECT COALESCE(MAX(sort_),-1)+1 FROM t_product_role_template WHERE tenant_id_=? AND delete_flag_=0", Integer.class, tenantId);
        return value == null ? 0 : value;
    }

    void insert(String tenantId, String id, String name, String responsibility, int sort, String userId) {
        jdbc.update("""
            INSERT INTO t_product_role_template(
              id_,tenant_id_,name_,responsibility_,sort_,create_by_,update_by_,create_time_,update_time_
            ) VALUES(?,?,?,?,?,?,?,NOW(6),NOW(6))
            """, id, tenantId, name, responsibility, sort, userId, userId);
    }

    int update(String tenantId, String id, int revision, String name, String responsibility, int sort, String userId) {
        return jdbc.update("""
            UPDATE t_product_role_template
            SET name_=?,responsibility_=?,sort_=?,version_=version_+1,update_by_=?,update_time_=NOW(6)
            WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0
            """, name, responsibility, sort, userId, tenantId, id, revision);
    }

    int delete(String tenantId, String id, int revision, String userId) {
        return jdbc.update("""
            UPDATE t_product_role_template
            SET delete_flag_=1,version_=version_+1,update_by_=?,update_time_=NOW(6)
            WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0
            """, userId, tenantId, id, revision);
    }

    int activeMemberCount(String tenantId, String role) {
        Integer value = jdbc.queryForObject("SELECT COUNT(*) FROM t_product_line_member WHERE tenant_id_=? AND role_=? AND delete_flag_=0", Integer.class, tenantId, role);
        return value == null ? 0 : value;
    }
}

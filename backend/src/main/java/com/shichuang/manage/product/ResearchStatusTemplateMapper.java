package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class ResearchStatusTemplateMapper {
    private final JdbcTemplate jdbc;

    public ResearchStatusTemplateMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    List<Map<String, Object>> list(String tenant, String scope) {
        return jdbc.queryForList("SELECT id_ AS id,scope_ AS scope,name_ AS name,phase_ AS phase,color_ AS color,initial_ AS initial,enabled_ AS enabled,sort_ AS sort,version_ AS revision FROM t_research_status_template WHERE tenant_id_=? AND scope_=? AND delete_flag_=0 ORDER BY sort_,create_time_,id_", tenant, scope);
    }

    Map<String, Object> find(String tenant, String id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT id_ AS id,scope_ AS scope,name_ AS name,phase_ AS phase,color_ AS color,initial_ AS initial,enabled_ AS enabled,sort_ AS sort,version_ AS revision FROM t_research_status_template WHERE tenant_id_=? AND id_=? AND delete_flag_=0", tenant, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    boolean nameExists(String tenant, String scope, String name, String excludedId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM t_research_status_template WHERE tenant_id_=? AND scope_=? AND name_=? AND (?='' OR id_<>?) AND delete_flag_=0", Long.class, tenant, scope, name, excludedId, excludedId) > 0;
    }

    void insert(String tenant, String id, String scope, String name, String phase, String color, boolean initial, boolean enabled, int sort, String user) {
        jdbc.update("INSERT INTO t_research_status_template(id_,tenant_id_,scope_,name_,phase_,color_,initial_,enabled_,sort_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?,NOW(6),NOW(6))", id, tenant, scope, name, phase, color, initial ? 1 : 0, enabled ? 1 : 0, sort, user, user);
    }

    void clearInitial(String tenant, String scope, String excludedId, String user) {
        jdbc.update("UPDATE t_research_status_template SET initial_=0,version_=version_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND scope_=? AND (?='' OR id_<>?) AND initial_=1 AND delete_flag_=0", user, tenant, scope, excludedId, excludedId);
    }

    int update(String tenant, String id, String name, String phase, String color, boolean initial, boolean enabled, int sort, int revision, String user) {
        return jdbc.update("UPDATE t_research_status_template SET name_=?,phase_=?,color_=?,initial_=CASE WHEN ? THEN 1 ELSE 0 END,enabled_=CASE WHEN ? THEN 1 ELSE 0 END,sort_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0", name, phase, color, initial, enabled, sort, user, tenant, id, revision);
    }

    int delete(String tenant, String id, int revision, String user) {
        return jdbc.update("UPDATE t_research_status_template SET delete_flag_=1,version_=version_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0", user, tenant, id, revision);
    }

    long countEnabled(String tenant, String scope) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM t_research_status_template WHERE tenant_id_=? AND scope_=? AND enabled_=1 AND delete_flag_=0", Long.class, tenant, scope);
        return count == null ? 0 : count;
    }

    long countPhase(String tenant, String scope, String phase) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM t_research_status_template WHERE tenant_id_=? AND scope_=? AND phase_=? AND enabled_=1 AND delete_flag_=0", Long.class, tenant, scope, phase);
        return count == null ? 0 : count;
    }

    long referenceCount(String tenant, String scope, String name) {
        String table = "PRODUCT".equals(scope) ? "t_product_line" : "t_product_line_version";
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE tenant_id_=? AND status_=? AND delete_flag_=0", Long.class, tenant, name);
        return count == null ? 0 : count;
    }

    String phaseForName(String tenant, String scope, String name) {
        List<String> rows = jdbc.queryForList("SELECT phase_ FROM t_research_status_template WHERE tenant_id_=? AND scope_=? AND name_=? AND delete_flag_=0 LIMIT 1", String.class, tenant, scope, name);
        return rows.isEmpty() ? "" : rows.get(0);
    }

    void renameReferences(String tenant, String scope, String previousName, String nextName, String user) {
        String table = "PRODUCT".equals(scope) ? "t_product_line" : "t_product_line_version";
        jdbc.update("UPDATE " + table + " SET status_=?,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND status_=? AND delete_flag_=0", nextName, user, tenant, previousName);
    }
}

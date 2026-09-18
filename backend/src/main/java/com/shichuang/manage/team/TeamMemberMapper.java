package com.shichuang.manage.team;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class TeamMemberMapper {
    private final JdbcTemplate jdbc;

    public TeamMemberMapper(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    List<Map<String, Object>> list(String tenant, String keyword, String department, String status) {
        String like = "%" + keyword + "%";
        return jdbc.queryForList("""
            SELECT id_ AS id,name_ AS name,department_ AS department,role_title_ AS jobTitle,
                   phone_ AS phone,email_ AS email,status_ AS status,
                   CASE WHEN username_ IS NOT NULL AND username_<>'' THEN 1 ELSE 0 END AS loginEnabled,
                   version_ AS version
            FROM t_sys_user
            WHERE tenant_id_=? AND delete_flag_=0
              AND (name_ LIKE ? OR department_ LIKE ? OR role_title_ LIKE ?)
              AND (?='' OR department_=? )
              AND (?='' OR status_=? )
            ORDER BY CASE WHEN id_='user-admin' THEN 0 ELSE 1 END,name_,create_time_
            """, tenant, like, like, like, department, department, status, status);
    }

    List<Map<String, Object>> activeOptions(String tenant) {
        return jdbc.queryForList("""
            SELECT id_ AS id,name_ AS name,department_ AS department,role_title_ AS jobTitle
            FROM t_sys_user
            WHERE tenant_id_=? AND status_='enabled' AND delete_flag_=0
            ORDER BY department_,name_,create_time_
            """, tenant);
    }

    Map<String, Object> find(String tenant, String id) {
        List<Map<String, Object>> rows = jdbc.queryForList("""
            SELECT id_ AS id,name_ AS name,department_ AS department,role_title_ AS jobTitle,
                   phone_ AS phone,email_ AS email,status_ AS status,username_ AS username,
                   role_ AS role,version_ AS version
            FROM t_sys_user WHERE tenant_id_=? AND id_=? AND delete_flag_=0
            """, tenant, id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    int insert(String tenant, String id, TeamMemberContract.CreateEmployee input, String operator) {
        return jdbc.update("""
            INSERT INTO t_sys_user(
              id_,tenant_id_,username_,name_,avatar_,department_,role_,role_title_,phone_,email_,status_,
              create_by_,update_by_,create_time_,update_time_)
            VALUES(?,?,NULL,?,'',?,'employee',?,?,?,'enabled',?,?,NOW(),NOW())
            """, id, tenant, input.name(), input.department(), input.jobTitle(), emptyToNull(input.phone()),
            emptyToNull(input.email()), operator, operator);
    }

    int update(String tenant, String id, TeamMemberContract.UpdateEmployee input, String operator) {
        return jdbc.update("""
            UPDATE t_sys_user
            SET name_=?,department_=?,role_title_=?,phone_=?,email_=?,update_by_=?,version_=version_+1,update_time_=NOW()
            WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0
            """, input.name(), input.department(), input.jobTitle(), emptyToNull(input.phone()),
            emptyToNull(input.email()), operator, tenant, id, input.version());
    }

    int updateStatus(String tenant, String id, String status, int version, String operator) {
        return jdbc.update("""
            UPDATE t_sys_user
            SET status_=?,update_by_=?,version_=version_+1,update_time_=NOW()
            WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0
            """, status, operator, tenant, id, version);
    }

    long activeResponsibilities(String tenant, String userId) {
        Long count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM t_product_line
            WHERE tenant_id_=? AND delete_flag_=0
              AND (? IN (owner_user_id_,requirement_owner_user_id_,tech_owner_user_id_,test_owner_user_id_))
            """, Long.class, tenant, userId);
        return count == null ? 0 : count;
    }

    private String emptyToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }
}

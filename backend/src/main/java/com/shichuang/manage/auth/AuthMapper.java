package com.shichuang.manage.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public class AuthMapper {
    private final JdbcTemplate jdbc;

    public AuthMapper(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    Map<String, Object> findLoginUser(String tenantId, String username) {
        return first(jdbc.queryForList(
            "SELECT id_,tenant_id_,username_,name_,avatar_,department_,role_,role_title_,status_,password_hash_,failed_login_count_,locked_until_ " +
                "FROM t_sys_user WHERE tenant_id_=? AND username_=? AND delete_flag_=0",
            tenantId, username
        ));
    }

    Map<String, Object> findEnabledUser(String tenantId, String username) {
        return first(jdbc.queryForList(
            "SELECT id_,tenant_id_,username_,name_,avatar_,department_,role_,role_title_ " +
                "FROM t_sys_user WHERE tenant_id_=? AND username_=? AND status_='enabled' AND delete_flag_=0",
            tenantId, username
        ));
    }

    Map<String, Object> findCurrentUser(String tenantId, String userId) {
        return first(jdbc.queryForList(
            "SELECT id_ AS id,username_ AS username,name_ AS name,avatar_ AS avatar,department_ AS department,role_ AS role,role_title_ AS roleTitle " +
                "FROM t_sys_user WHERE id_=? AND tenant_id_=? AND status_='enabled' AND delete_flag_=0",
            userId, tenantId
        ));
    }

    List<Map<String, Object>> enabledAccounts(String tenantId) {
        return jdbc.queryForList(
            "SELECT id_ AS id,username_ AS username,name_ AS name,department_ AS department,role_ AS role,role_title_ AS roleTitle " +
                "FROM t_sys_user WHERE tenant_id_=? AND status_='enabled' AND delete_flag_=0 ORDER BY username_",
            tenantId
        );
    }

    void recordLoginFailure(String tenantId, Object userId, int failures, LocalDateTime lockedUntil) {
        jdbc.update(
            "UPDATE t_sys_user SET failed_login_count_=?,locked_until_=? WHERE tenant_id_=? AND id_=?",
            failures, lockedUntil, tenantId, userId
        );
    }

    void clearLoginFailures(String tenantId, Object userId) {
        jdbc.update(
            "UPDATE t_sys_user SET failed_login_count_=0,locked_until_=NULL WHERE tenant_id_=? AND id_=?",
            tenantId, userId
        );
    }

    int initializePassword(String tenantId, String username, String passwordHash) {
        return jdbc.update(
            "UPDATE t_sys_user SET password_hash_=?,password_changed_at_=NOW(),update_by_=id_,update_time_=NOW() " +
                "WHERE tenant_id_=? AND username_=? AND password_hash_ IS NULL AND delete_flag_=0",
            passwordHash, tenantId, username
        );
    }

    void createSession(Object sessionId, Object tenantId, Object userId, LocalDateTime expiresAt) {
        jdbc.update(
            "INSERT INTO t_sys_session(id_,tenant_id_,user_id_,expires_at_,create_time_) VALUES(?,?,?,?,NOW())",
            sessionId, tenantId, userId, expiresAt
        );
    }

    void revokeSession(Object sessionId, Object tenantId) {
        jdbc.update(
            "UPDATE t_sys_session SET revoked_at_=NOW() WHERE id_=? AND tenant_id_=?",
            sessionId, tenantId
        );
    }

    boolean isSessionActive(Object sessionId, Object tenantId) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM t_sys_session s JOIN t_sys_user u ON u.id_=s.user_id_ AND u.tenant_id_=s.tenant_id_ " +
                "WHERE s.id_=? AND s.tenant_id_=? AND s.revoked_at_ IS NULL AND s.expires_at_>NOW() " +
                "AND u.status_='enabled' AND u.delete_flag_=0",
            Integer.class, sessionId, tenantId
        );
        return count != null && count == 1;
    }

    private static Map<String, Object> first(List<Map<String, Object>> rows) {
        return rows.isEmpty() ? null : rows.get(0);
    }
}

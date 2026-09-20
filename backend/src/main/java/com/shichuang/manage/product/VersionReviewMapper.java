package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.*;

@Repository
public class VersionReviewMapper {
    private final JdbcTemplate jdbc;
    public VersionReviewMapper(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    private Map<String, Object> one(String sql, Object... args) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> version(String tenant, String lineId, String versionId) {
        return one("SELECT id_ AS id,name_ AS name FROM t_product_line_version WHERE tenant_id_=? AND product_line_id_=? AND id_=? AND delete_flag_=0", tenant, lineId, versionId);
    }

    public List<Map<String, Object>> reviews(String tenant, String lineId, String versionId) {
        return jdbc.queryForList("""
            SELECT r.id_ AS id,r.review_date_ AS reviewDate,r.conclusion_ AS conclusion,r.summary_ AS summary,
              r.status_ AS status,r.version_ AS revision,r.create_time_ AS createdAt,r.update_time_ AS updatedAt,
              COUNT(p.id_) AS participantCount
            FROM t_product_version_review r
            LEFT JOIN t_product_version_review_participant p ON p.tenant_id_=r.tenant_id_ AND p.review_id_=r.id_ AND p.delete_flag_=0
            WHERE r.tenant_id_=? AND r.product_line_id_=? AND r.version_id_=? AND r.delete_flag_=0
            GROUP BY r.id_ ORDER BY r.create_time_ DESC,r.id_
            """, tenant, lineId, versionId);
    }

    public Map<String, Object> review(String tenant, String lineId, String versionId, String reviewId) {
        return one("SELECT id_ AS id,review_date_ AS reviewDate,conclusion_ AS conclusion,summary_ AS summary,remaining_risks_ AS remainingRisks,release_recommendation_ AS releaseRecommendation,status_ AS status,version_ AS revision,create_time_ AS createdAt,update_time_ AS updatedAt FROM t_product_version_review WHERE tenant_id_=? AND product_line_id_=? AND version_id_=? AND id_=? AND delete_flag_=0", tenant, lineId, versionId, reviewId);
    }

    public List<Map<String, Object>> participants(String tenant, String reviewId) {
        return jdbc.queryForList("SELECT participant_id_ AS id,participant_name_ AS name FROM t_product_version_review_participant WHERE tenant_id_=? AND review_id_=? AND delete_flag_=0 ORDER BY sort_,id_", tenant, reviewId);
    }

    public List<Map<String, Object>> activeEmployees(String tenant, List<String> ids) {
        if (ids.isEmpty()) return List.of();
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        List<Object> args = new ArrayList<>(); args.add(tenant); args.addAll(ids);
        return jdbc.queryForList("SELECT id_ AS id,name_ AS name FROM t_sys_user WHERE tenant_id_=? AND id_ IN (" + placeholders + ") AND status_='enabled' AND delete_flag_=0", args.toArray());
    }

    public void insert(String tenant, String id, String lineId, String versionId, LocalDate date, String conclusion, String summary, String risks, String recommendation, String user) {
        jdbc.update("INSERT INTO t_product_version_review(id_,tenant_id_,product_line_id_,version_id_,review_date_,conclusion_,summary_,remaining_risks_,release_recommendation_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,'DRAFT',?,?,NOW(6),NOW(6))", id, tenant, lineId, versionId, date, conclusion, summary, risks, recommendation, user, user);
    }

    public int update(String tenant, String id, int revision, LocalDate date, String conclusion, String summary, String risks, String recommendation, String user) {
        return jdbc.update("UPDATE t_product_version_review SET review_date_=?,conclusion_=?,summary_=?,remaining_risks_=?,release_recommendation_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND status_='DRAFT' AND version_=? AND delete_flag_=0", date, conclusion, summary, risks, recommendation, user, tenant, id, revision);
    }

    public int submit(String tenant, String id, int revision, String user) {
        return jdbc.update("UPDATE t_product_version_review SET status_='SUBMITTED',version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND status_='DRAFT' AND version_=? AND delete_flag_=0", user, tenant, id, revision);
    }

    public void replaceParticipants(String tenant, String reviewId, List<Map<String, Object>> people, String user) {
        jdbc.update("DELETE FROM t_product_version_review_participant WHERE tenant_id_=? AND review_id_=?", tenant, reviewId);
        for (int i = 0; i < people.size(); i++) {
            Map<String, Object> person = people.get(i);
            jdbc.update("INSERT INTO t_product_version_review_participant(id_,tenant_id_,review_id_,participant_id_,participant_name_,sort_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,NOW(6),NOW(6))", UUID.randomUUID().toString(), tenant, reviewId, person.get("id"), person.get("name"), i + 1, user, user);
        }
    }
}

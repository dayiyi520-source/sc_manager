package com.shichuang.manage.product;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.alibaba.fastjson2.JSON;

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
            SELECT r.id_ AS id,r.meeting_topic_ AS meetingTopic,r.review_type_ AS reviewType,r.initiator_name_ AS initiatorName,r.meeting_time_ AS meetingTime,r.agenda_conclusion_ AS agendaConclusion,r.remaining_issues_ AS remainingIssues,r.related_tasks_ AS relatedTaskIds,r.attachments_ AS attachments,r.review_date_ AS reviewDate,r.conclusion_ AS conclusion,r.summary_ AS summary,
              r.status_ AS status,r.version_ AS revision,r.create_time_ AS createdAt,r.update_time_ AS updatedAt,
              COUNT(p.id_) AS participantCount,GROUP_CONCAT(p.participant_name_ ORDER BY p.sort_ SEPARATOR '、') AS participantNames
            FROM t_product_version_review r
            LEFT JOIN t_product_version_review_participant p ON p.tenant_id_=r.tenant_id_ AND p.review_id_=r.id_ AND p.delete_flag_=0
            WHERE r.tenant_id_=? AND r.product_line_id_=? AND r.version_id_=? AND r.delete_flag_=0
            GROUP BY r.id_ ORDER BY r.create_time_ DESC,r.id_
            """, tenant, lineId, versionId);
    }

    public List<Map<String, Object>> reviews(String tenant, List<String> lineIds) {
        if (lineIds.isEmpty()) return List.of();
        String placeholders = String.join(",", Collections.nCopies(lineIds.size(), "?"));
        List<Object> args = new ArrayList<>();
        args.add(tenant);
        args.addAll(lineIds);
        String sql = """
            SELECT r.id_ AS id,r.meeting_topic_ AS meetingTopic,r.review_type_ AS reviewType,r.initiator_name_ AS initiatorName,r.meeting_time_ AS meetingTime,r.agenda_conclusion_ AS agendaConclusion,r.remaining_issues_ AS remainingIssues,r.related_tasks_ AS relatedTaskIds,r.attachments_ AS attachments,r.review_date_ AS reviewDate,r.conclusion_ AS conclusion,r.summary_ AS summary,
              r.product_line_id_ AS productLineId,l.name_ AS productLineName,r.version_id_ AS versionId,v.name_ AS versionName,
              r.status_ AS status,r.version_ AS revision,r.create_time_ AS createdAt,r.update_time_ AS updatedAt,
              COUNT(p.id_) AS participantCount,GROUP_CONCAT(p.participant_name_ ORDER BY p.sort_ SEPARATOR '、') AS participantNames
            FROM t_product_version_review r
            JOIN t_product_line l ON l.tenant_id_=r.tenant_id_ AND l.id_=r.product_line_id_ AND l.delete_flag_=0
            JOIN t_product_line_version v ON v.tenant_id_=r.tenant_id_ AND v.id_=r.version_id_ AND v.delete_flag_=0
            LEFT JOIN t_product_version_review_participant p ON p.tenant_id_=r.tenant_id_ AND p.review_id_=r.id_ AND p.delete_flag_=0
            WHERE r.tenant_id_=? AND r.product_line_id_ IN (%s) AND r.delete_flag_=0
            GROUP BY r.id_,l.name_,v.name_ ORDER BY r.update_time_ DESC,r.id_
            """.formatted(placeholders);
        return jdbc.queryForList(sql, args.toArray());
    }

    public Map<String, Object> review(String tenant, String lineId, String versionId, String reviewId) {
        return one("SELECT id_ AS id,meeting_topic_ AS meetingTopic,review_type_ AS reviewType,initiator_name_ AS initiatorName,meeting_time_ AS meetingTime,agenda_conclusion_ AS agendaConclusion,remaining_issues_ AS remainingIssues,related_tasks_ AS relatedTaskIds,attachments_ AS attachments,review_date_ AS reviewDate,conclusion_ AS conclusion,summary_ AS summary,remaining_risks_ AS remainingRisks,release_recommendation_ AS releaseRecommendation,status_ AS status,version_ AS revision,create_time_ AS createdAt,update_time_ AS updatedAt FROM t_product_version_review WHERE tenant_id_=? AND product_line_id_=? AND version_id_=? AND id_=? AND delete_flag_=0", tenant, lineId, versionId, reviewId);
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

    public int validWorkItemCount(String tenant, String lineId, List<String> ids) {
        if (ids.isEmpty()) return 0;
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        List<Object> args = new ArrayList<>(); args.add(tenant); args.add(lineId); args.addAll(ids);
        Number count = jdbc.queryForObject("SELECT COUNT(*) FROM t_product_work_item WHERE tenant_id_=? AND product_line_id_=? AND id_ IN (" + placeholders + ") AND delete_flag_=0", Number.class, args.toArray());
        return count == null ? 0 : count.intValue();
    }

    public void insert(String tenant, String id, String lineId, String versionId, String topic, String type, java.time.LocalDateTime meetingTime, String relatedTasks, String agendaConclusion, String remainingIssues, String attachments, String conclusion, String summary, String risks, String recommendation, String initiatorId, String initiatorName, String user) {
        jdbc.update("INSERT INTO t_product_version_review(id_,tenant_id_,product_line_id_,version_id_,meeting_topic_,review_type_,initiator_id_,initiator_name_,meeting_time_,related_tasks_,agenda_conclusion_,remaining_issues_,attachments_,review_date_,conclusion_,summary_,remaining_risks_,release_recommendation_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,'DRAFT',?,?,NOW(6),NOW(6))", id, tenant, lineId, versionId, topic, type, initiatorId, initiatorName, meetingTime, relatedTasks, agendaConclusion, remainingIssues, attachments, conclusion, summary, risks, recommendation, user, user);
    }

    public int update(String tenant, String id, int revision, String topic, String type, java.time.LocalDateTime meetingTime, String relatedTasks, String agendaConclusion, String remainingIssues, String attachments, String conclusion, String summary, String risks, String recommendation, String user) {
        return jdbc.update("UPDATE t_product_version_review SET meeting_topic_=?,review_type_=?,meeting_time_=?,related_tasks_=?,agenda_conclusion_=?,remaining_issues_=?,attachments_=?,conclusion_=?,summary_=?,remaining_risks_=?,release_recommendation_=?,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND status_='DRAFT' AND version_=? AND delete_flag_=0", topic, type, meetingTime, relatedTasks, agendaConclusion, remainingIssues, attachments, conclusion, summary, risks, recommendation, user, tenant, id, revision);
    }

    public int delete(String tenant, String id, int revision, String user) {
        return jdbc.update("UPDATE t_product_version_review SET delete_flag_=1,version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0", user, tenant, id, revision);
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

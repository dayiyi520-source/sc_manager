package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import com.shichuang.manage.support.AbstractApiIntegrationTest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.shichuang.manage.product.VersionReviewDefinition.Revision;
import static com.shichuang.manage.product.VersionReviewDefinition.SaveReview;
import static org.junit.jupiter.api.Assertions.*;

@Transactional
class VersionReviewIntegrationTest extends AbstractApiIntegrationTest {
    @Autowired VersionReviewService reviews;
    private final String tenant = "version-review-integration";
    private String lineId;
    private String versionId;
    private String participantId;

    @BeforeEach
    void fixture() {
        RequestContext.set(Map.of("sub", "review-user", "name", "评审人", "tenant", tenant, "role", "admin"));
        lineId = UUID.randomUUID().toString(); versionId = UUID.randomUUID().toString(); participantId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_line(id_,tenant_id_,code_,name_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'评审产品线','review-user','review-user',NOW(6),NOW(6))", lineId, tenant, "REVIEW-" + lineId);
        jdbc.update("INSERT INTO t_product_line_version(id_,tenant_id_,product_line_id_,code_,name_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,'V1','评审版本','迭代中','review-user','review-user',NOW(6),NOW(6))", versionId, tenant, lineId);
        jdbc.update("INSERT INTO t_sys_user(id_,tenant_id_,username_,name_,department_,role_,role_title_,status_,create_by_,update_by_,create_time_,update_time_) VALUES(?,?,?,?,'产品部','product_manager','产品经理','enabled','review-user','review-user',NOW(6),NOW(6))", participantId, tenant, "participant-" + participantId, "参与人");
    }

    @AfterEach void clearContext() { RequestContext.clear(); }

    @Test
    void savesDraftSubmitsAndKeepsHistory() {
        Map<String, Object> draft = reviews.create(lineId, versionId, new SaveReview(null, List.of(), "", "", "", "", null));
        assertEquals("DRAFT", draft.get("status"));
        int revision = ((Number) draft.get("revision")).intValue();
        Map<String, Object> saved = reviews.update(lineId, versionId, String.valueOf(draft.get("id")), new SaveReview(LocalDate.of(2026, 9, 20), List.of(participantId), "通过", "评审通过", "无", "允许发布", revision));
        Map<String, Object> submitted = reviews.submit(lineId, versionId, String.valueOf(draft.get("id")), new Revision(((Number) saved.get("revision")).intValue()));
        assertEquals("SUBMITTED", submitted.get("status"));
        assertThrows(Exception.class, () -> reviews.update(lineId, versionId, String.valueOf(draft.get("id")), new SaveReview(LocalDate.now(), List.of(participantId), "通过", "修改", "", "", ((Number) submitted.get("revision")).intValue())));
        assertEquals(1, reviews.list(lineId, versionId).size());
    }

    @Test
    void rejectsIncompleteSubmissionAndInactiveParticipant() {
        Map<String, Object> draft = reviews.create(lineId, versionId, new SaveReview(null, List.of(), "", "", "", "", null));
        assertThrows(IllegalArgumentException.class, () -> reviews.submit(lineId, versionId, String.valueOf(draft.get("id")), new Revision(0)));
        jdbc.update("UPDATE t_sys_user SET status_='disabled' WHERE tenant_id_=? AND id_=?", tenant, participantId);
        assertThrows(IllegalArgumentException.class, () -> reviews.update(lineId, versionId, String.valueOf(draft.get("id")), new SaveReview(LocalDate.now(), List.of(participantId), "通过", "摘要", "", "", 0)));
    }
}

package com.shichuang.manage.product;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shichuang.manage.auth.AuthorizationService;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;

@Service
public class AssistanceWorkflowService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    public AssistanceWorkflowService(JdbcTemplate jdbc, ObjectMapper objectMapper) { this.jdbc = jdbc; this.objectMapper = objectMapper; }

    Map<String,Object> enrich(Map<String,Object> detail) {
        String id = Objects.toString(detail.get("id"), "");
        String stored = Objects.toString(detail.get("assistanceStatus"), "");
        AssistanceStatus status = stored.isBlank() ? derive(Objects.toString(detail.get("status"), "")) : AssistanceStatus.from(stored);
        detail.put("assistanceStatus", status.label());
        detail.put("assistanceStatusKey", status.name());
        detail.put("assistanceInitiatorId", detail.get("assistanceInitiatorId"));
        detail.put("pendingReassignments", jdbc.queryForList("SELECT id_ AS id,to_user_id_ AS toUserId,status_ AS status,reason_ AS reason,create_time_ AS createdAt FROM t_product_assistance_reassignment WHERE tenant_id_=? AND assistance_id_=? AND delete_flag_=0 ORDER BY create_time_ DESC", RequestContext.tenantId(), id));
        return detail;
    }

    AssistanceStatus derive(String status) {
        if (Set.of("已关闭").contains(status)) return AssistanceStatus.CLOSED;
        if ("已搁置".equals(status)) return AssistanceStatus.ON_HOLD;
        if ("已驳回".equals(status)) return AssistanceStatus.REJECTED;
        if ("待处理".equals(status) || status.isBlank()) return AssistanceStatus.PENDING_ACCEPTANCE;
        return AssistanceStatus.PROCESSING;
    }

    @Transactional Map<String,Object> accept(String id, int revision) {
        AuthorizationService.requireWrite("product");
        Map<String,Object> reassignment = jdbc.queryForMap("SELECT * FROM t_product_assistance_reassignment WHERE tenant_id_=? AND id_=? AND to_user_id_=? AND status_='PENDING' AND delete_flag_=0", RequestContext.tenantId(), id, RequestContext.userId());
        int updated = jdbc.update("UPDATE t_product_assistance_reassignment SET status_='ACCEPTED',update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND status_='PENDING'", RequestContext.userId(), RequestContext.tenantId(), id);
        if (updated != 1) throw conflict();
        int ownerUpdated = jdbc.update("UPDATE t_product_work_item SET assignee_id_=to_user_id_,assignee_name_=(SELECT name_ FROM t_sys_user u WHERE u.id_=to_user_id_ AND u.tenant_id_=t_product_work_item.tenant_id_),assistance_owner_id_=to_user_id_,assistance_status_='PROCESSING',version_=version_+1,update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND delete_flag_=0", RequestContext.userId(), RequestContext.tenantId(), reassignment.get("assistance_id_"), revision);
        if (ownerUpdated != 1) throw conflict();
        return Map.of("id", reassignment.get("assistance_id_"), "status", "ACCEPTED");
    }

    @Transactional Map<String,Object> reject(String id, String reason) {
        AuthorizationService.requireWrite("product");
        int updated = jdbc.update("UPDATE t_product_assistance_reassignment SET status_='REJECTED',update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND to_user_id_=? AND status_='PENDING'", RequestContext.userId(), RequestContext.tenantId(), id, RequestContext.userId());
        if (updated != 1) throw conflict();
        return Map.of("id", id, "status", "REJECTED", "reason", reason == null ? "" : reason);
    }

    @Transactional Map<String,Object> memo(String assistanceId, String content) {
        AuthorizationService.requireWrite("product");
        if (content == null || content.isBlank()) throw new IllegalArgumentException("个人备忘内容不能为空");
        jdbc.update("INSERT INTO t_product_assistance_memo(id_,tenant_id_,assistance_id_,author_id_,content_,create_time_) VALUES(?,?,?,?,?,NOW(6))", UUID.randomUUID().toString(), RequestContext.tenantId(), assistanceId, RequestContext.userId(), content.trim());
        return Map.of("id", assistanceId, "statusUnchanged", true);
    }

    @Transactional Map<String,Object> markAcceptanceFailed(String assistanceId, String taskOwnerId, String reason) {
        AuthorizationService.requireWrite("product");
        int updated = jdbc.update("UPDATE t_product_work_item SET assistance_status_='验收未通过',assignee_id_=COALESCE(?,assignee_id_),assistance_owner_id_=COALESCE(?,assistance_owner_id_),version_=version_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND category_='requirement' AND delete_flag_=0 AND assistance_status_ IN ('待验收','处理中')", taskOwnerId, taskOwnerId, RequestContext.userId(), RequestContext.tenantId(), assistanceId);
        if (updated != 1) throw conflict();
        return Map.of("id", assistanceId, "status", "验收未通过", "reason", reason == null ? "" : reason);
    }

    @Transactional Map<String,Object> closeByOwner(String assistanceId, int revision) {
        AuthorizationService.requireWrite("product");
        Map<String,Object> row = jdbc.queryForMap("SELECT assistance_status_ AS status,assignee_id_ AS ownerId,version_ AS revision FROM t_product_work_item WHERE tenant_id_=? AND id_=? AND category_='requirement' AND delete_flag_=0", RequestContext.tenantId(), assistanceId);
        if (!"待负责人关闭".equals(row.get("status"))) throw new IllegalArgumentException("当前事项尚未满足负责人关闭条件");
        if (!RequestContext.userId().equals(Objects.toString(row.get("ownerId"), ""))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "仅当前负责人可以关闭事项");
        if (((Number) row.get("revision")).intValue() != revision) throw conflict();
        if (jdbc.update("UPDATE t_product_work_item SET assistance_status_='已关闭',status_name_='已完成',version_=version_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND assistance_status_='待负责人关闭'", RequestContext.userId(), RequestContext.tenantId(), assistanceId, revision) != 1) throw conflict();
        return Map.of("id", assistanceId, "status", "已关闭");
    }

    private ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT, "工单已变化，请刷新后重试"); }
}

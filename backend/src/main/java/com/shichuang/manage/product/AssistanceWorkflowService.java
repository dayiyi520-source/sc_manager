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
    private final AttachmentResourceService attachments;
    public AssistanceWorkflowService(JdbcTemplate jdbc, ObjectMapper objectMapper, AttachmentResourceService attachments) { this.jdbc = jdbc; this.objectMapper = objectMapper; this.attachments = attachments; }

    Map<String,Object> enrich(Map<String,Object> detail) {
        String id = Objects.toString(detail.get("id"), "");
        String stored = Objects.toString(detail.get("assistanceStatus"), "");
        AssistanceStatus status = stored.isBlank() ? derive(Objects.toString(detail.get("status"), "")) : AssistanceStatus.from(stored);
        detail.put("assistanceStatus", status.label());
        detail.put("assistanceStatusKey", status.name());
        detail.put("status", status.label());
        detail.put("attachments", jdbc.queryForList("SELECT id_ AS id,name_ AS name,mime_type_ AS mimeType,size_ AS size,storage_key_ AS storageKey,data_url_ AS dataUrl,visibility_,subject_type_ AS subjectType,subject_id_ AS subjectId FROM t_product_attachment_resource WHERE tenant_id_=? AND delete_flag_=0 AND (visibility_<>'PRIVATE_AUTHOR' OR create_by_=?) AND (subject_id_=? OR subject_id_ IN (SELECT id_ FROM t_product_assistance_reassignment WHERE tenant_id_=? AND assistance_id_=? AND delete_flag_=0) OR subject_id_ IN (SELECT id_ FROM t_product_work_item WHERE tenant_id_=? AND requirement_id_=? AND source_type_='WORK_ORDER' AND delete_flag_=0) OR subject_id_ IN (SELECT id_ FROM t_product_assistance_memo WHERE tenant_id_=? AND assistance_id_=? AND author_id_=? AND delete_flag_=0)) ORDER BY create_time_", RequestContext.tenantId(), RequestContext.userId(), id, RequestContext.tenantId(), id, RequestContext.tenantId(), id, RequestContext.tenantId(), id, RequestContext.userId()));
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

    @Transactional Map<String,Object> memo(String assistanceId, String content, Object attachmentIds) {
        AuthorizationService.requireWrite("product");
        if (content == null || content.isBlank()) throw new IllegalArgumentException("个人备忘内容不能为空");
        String memoId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO t_product_assistance_memo(id_,tenant_id_,assistance_id_,author_id_,content_,create_time_) VALUES(?,?,?,?,?,NOW(6))", memoId, RequestContext.tenantId(), assistanceId, RequestContext.userId(), content.trim());
        attachments.bindAll(attachmentIds, "ASSISTANCE_MEMO", memoId, "PRIVATE_AUTHOR");
        return Map.of("id", assistanceId, "statusUnchanged", true);
    }

    @Transactional Map<String,Object> markAcceptanceFailed(String assistanceId, String workItemId, String taskOwnerId, String reason, Object attachmentIds) {
        AuthorizationService.requireWrite("product");
        if (reason == null || reason.isBlank()) throw new IllegalArgumentException("验收未通过原因不能为空");
        Map<String,Object> assistance = jdbc.queryForMap("SELECT create_by_ AS initiatorId,assistance_status_ AS status FROM t_product_work_item WHERE tenant_id_=? AND id_=? AND category_='requirement' AND delete_flag_=0", RequestContext.tenantId(), assistanceId);
        if (!RequestContext.userId().equals(Objects.toString(assistance.get("initiatorId"), ""))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "仅事项发起人可以验收");
        if (workItemId == null || workItemId.isBlank()) throw new IllegalArgumentException("请选择验收未通过的任务");
        Map<String,Object> task = jdbc.queryForMap("SELECT assignee_id_ AS ownerId,assignee_name_ AS ownerName FROM t_product_work_item WHERE tenant_id_=? AND id_=? AND requirement_id_=? AND source_type_='WORK_ORDER' AND assistance_task_status_='COMPLETED' AND delete_flag_=0", RequestContext.tenantId(), workItemId, assistanceId);
        String ownerId = Objects.toString(task.get("ownerId"), "");
        String ownerName = Objects.toString(task.get("ownerName"), "");
        if (ownerId.isBlank()) throw new IllegalArgumentException("任务负责人不存在，无法退回");
        if (jdbc.update("UPDATE t_product_work_item SET assistance_task_status_='PROCESSING',update_by_=?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND requirement_id_=? AND source_type_='WORK_ORDER' AND assistance_task_status_='COMPLETED' AND delete_flag_=0", RequestContext.userId(), RequestContext.tenantId(), workItemId, assistanceId) != 1) throw conflict();
        String from = Objects.toString(assistance.get("status"), "处理中");
        int updated = jdbc.update("UPDATE t_product_work_item SET assistance_status_='验收未通过',assignee_id_=?,assignee_name_=?,assistance_owner_id_=?,version_=version_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND category_='requirement' AND delete_flag_=0 AND assistance_status_ IN ('待验收','处理中')", ownerId, ownerName, ownerId, RequestContext.userId(), RequestContext.tenantId(), assistanceId);
        if (updated != 1) throw conflict();
        attachments.bindAll(attachmentIds, "ASSISTANCE_ACCEPTANCE", assistanceId, "PARTICIPANTS");
        event(assistanceId, "验收未通过", from, "验收未通过", reason);
        return Map.of("id", assistanceId, "status", "验收未通过", "reason", reason == null ? "" : reason);
    }

    @Transactional Map<String,Object> closeByOwner(String assistanceId, int revision) {
        AuthorizationService.requireWrite("product");
        Map<String,Object> row = jdbc.queryForMap("SELECT assistance_status_ AS status,COALESCE(assistance_initiator_id_,create_by_) AS initiatorId,version_ AS revision FROM t_product_work_item WHERE tenant_id_=? AND id_=? AND category_='requirement' AND delete_flag_=0", RequestContext.tenantId(), assistanceId);
        if (!"待负责人关闭".equals(row.get("status"))) throw new IllegalArgumentException("当前事项尚未满足负责人关闭条件");
        if (!RequestContext.userId().equals(Objects.toString(row.get("initiatorId"), ""))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "仅事项发起人可以结束协助");
        if (((Number) row.get("revision")).intValue() != revision) throw conflict();
        Number pending = jdbc.queryForObject("SELECT COUNT(*) FROM t_product_assistance_reassignment WHERE tenant_id_=? AND assistance_id_=? AND status_='PENDING' AND delete_flag_=0", Number.class, RequestContext.tenantId(), assistanceId);
        if (pending != null && pending.intValue() > 0) throw new IllegalArgumentException("存在待接收转派，请先完成责任交接");
        if (jdbc.update("UPDATE t_product_work_item SET assistance_status_='已关闭',status_name_='已完成',successful_=1,progress_=100,version_=version_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=? AND assistance_status_='待负责人关闭'", RequestContext.userId(), RequestContext.tenantId(), assistanceId, revision) != 1) throw conflict();
        event(assistanceId, "发起人关闭", "待负责人关闭", "已关闭", "发起人确认事项闭环");
        return Map.of("id", assistanceId, "status", "已关闭");
    }

    @Transactional Map<String,Object> reopen(String assistanceId,int progress,int revision,String reason) {
        AuthorizationService.requireWrite("product");
        if(progress<0||progress>100) throw new IllegalArgumentException("当前进度必须为0至100");
        Map<String,Object> row=jdbc.queryForMap("SELECT COALESCE(assistance_initiator_id_,create_by_) AS initiatorId,assistance_status_ AS status,version_ AS revision FROM t_product_work_item WHERE tenant_id_=? AND id_=? AND category_='requirement' AND delete_flag_=0",RequestContext.tenantId(),assistanceId);
        if(!RequestContext.userId().equals(Objects.toString(row.get("initiatorId"),""))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"仅事项发起人可以重新开启");
        if(!Set.of("已关闭","已完成").contains(Objects.toString(row.get("status"),""))) throw new IllegalArgumentException("仅已完成事项可以重新开启");
        if(((Number)row.get("revision")).intValue()!=revision) throw conflict();
        if(jdbc.update("UPDATE t_product_work_item SET assistance_status_='处理中',status_name_='处理中',status_group_='IN_PROGRESS',successful_=0,progress_= ?,completed_at_=NULL,version_=version_+1,update_by_= ?,update_time_=NOW(6) WHERE tenant_id_=? AND id_=? AND version_=?",progress,RequestContext.userId(),RequestContext.tenantId(),assistanceId,revision)!=1) throw conflict();
        event(assistanceId,"事项重新开启","已关闭","处理中",reason==null?"":reason);
        return Map.of("id",assistanceId,"status","处理中","progress",progress,"revision",revision+1);
    }

    private void event(String assistanceId, String type, String from, String to, String reason) {
        jdbc.update("INSERT INTO t_product_work_item_activity(id_,tenant_id_,product_line_id_,subject_id_,event_type_,content_,create_by_,create_time_) SELECT ?,tenant_id_,product_line_id_,id_,?,JSON_OBJECT('fromStatus',?,'toStatus',?,'reason',?),?,NOW(6) FROM t_product_work_item WHERE tenant_id_=? AND id_=? AND category_='requirement' AND delete_flag_=0", UUID.randomUUID().toString(), type, from, to, Objects.toString(reason, ""), RequestContext.userId(), RequestContext.tenantId(), assistanceId);
    }

    private ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT, "工单已变化，请刷新后重试"); }
}

package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.alibaba.fastjson2.JSON;

import java.util.*;

import static com.shichuang.manage.product.VersionReviewDefinition.Revision;
import static com.shichuang.manage.product.VersionReviewDefinition.SaveReview;

@Service
public class VersionReviewService {
    private static final Set<String> CONCLUSIONS = Set.of("通过", "有条件通过", "不通过");
    private static final Set<String> READ_ROLES = Set.of("admin", "product_manager", "tech_lead", "product", "tech");
    private final VersionReviewMapper mapper;
    private final WorkItemAccess access;
    private final ProductLineMapper lines;

    public VersionReviewService(VersionReviewMapper mapper, WorkItemAccess access, ProductLineMapper lines) {
        this.mapper = mapper;
        this.access = access;
        this.lines = lines;
    }

    public List<Map<String, Object>> list(String lineId, String versionId) {
        requireVersion(lineId, versionId, false);
        return mapper.reviews(RequestContext.tenantId(), lineId, versionId);
    }

    public List<Map<String, Object>> listAll() {
        if (!READ_ROLES.contains(RequestContext.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "当前角色无权读取版本评审");
        }
        String tenant = RequestContext.tenantId();
        List<String> lineIds = lines.list(tenant, "", RequestContext.userId(), "admin".equals(RequestContext.role()))
            .stream().map(line -> String.valueOf(line.get("id"))).toList();
        return mapper.reviews(tenant, lineIds);
    }

    public Map<String, Object> detail(String lineId, String versionId, String reviewId) {
        requireVersion(lineId, versionId, false);
        Map<String, Object> review = requireReview(lineId, versionId, reviewId);
        Map<String, Object> result = new LinkedHashMap<>(review);
        result.put("relatedTaskIds", parseArray(review.get("relatedTaskIds")));
        result.put("attachments", parseArray(review.get("attachments")));
        result.put("participants", mapper.participants(RequestContext.tenantId(), reviewId));
        return result;
    }

    @Transactional
    public Map<String, Object> create(String lineId, String versionId, SaveReview input) {
        requireVersion(lineId, versionId, true);
        Validated value = validate(lineId, input, false);
        String id = UUID.randomUUID().toString();
        mapper.insert(RequestContext.tenantId(), id, lineId, versionId, value.topic(), value.type(), value.input().meetingTime(), JSON.toJSONString(value.input().relatedTaskIds() == null ? List.of() : value.input().relatedTaskIds()), value.agendaConclusion(), value.remainingIssues(), JSON.toJSONString(value.input().attachments() == null ? List.of() : value.input().attachments()), value.conclusion(), value.summary(), value.risks(), value.recommendation(), RequestContext.userId(), RequestContext.operatorName(), RequestContext.userId());
        mapper.replaceParticipants(RequestContext.tenantId(), id, value.people(), RequestContext.userId());
        return detail(lineId, versionId, id);
    }

    @Transactional
    public Map<String, Object> createAndSubmit(String lineId, String versionId, SaveReview input) {
        requireVersion(lineId, versionId, true);
        Validated value = validate(lineId, input, true);
        String id = UUID.randomUUID().toString();
        mapper.insert(RequestContext.tenantId(), id, lineId, versionId, value.topic(), value.type(), value.input().meetingTime(), JSON.toJSONString(value.input().relatedTaskIds() == null ? List.of() : value.input().relatedTaskIds()), value.agendaConclusion(), value.remainingIssues(), JSON.toJSONString(value.input().attachments() == null ? List.of() : value.input().attachments()), value.conclusion(), value.summary(), value.risks(), value.recommendation(), RequestContext.userId(), RequestContext.operatorName(), RequestContext.userId());
        mapper.replaceParticipants(RequestContext.tenantId(), id, value.people(), RequestContext.userId());
        if (mapper.submit(RequestContext.tenantId(), id, 0, RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "版本评审提交失败，请重试");
        }
        return detail(lineId, versionId, id);
    }

    @Transactional
    public Map<String, Object> update(String lineId, String versionId, String reviewId, SaveReview input) {
        requireVersion(lineId, versionId, true);
        Map<String, Object> current = requireReview(lineId, versionId, reviewId);
        ensureDraft(current);
        if (input == null || input.revision() == null) throw new IllegalArgumentException("缺少评审版本号");
        Validated value = validate(lineId, input, false);
        if (mapper.update(RequestContext.tenantId(), reviewId, input.revision(), value.topic(), value.type(), value.input().meetingTime(), JSON.toJSONString(value.input().relatedTaskIds() == null ? List.of() : value.input().relatedTaskIds()), value.agendaConclusion(), value.remainingIssues(), JSON.toJSONString(value.input().attachments() == null ? List.of() : value.input().attachments()), value.conclusion(), value.summary(), value.risks(), value.recommendation(), RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "版本评审已变化，请刷新后重试");
        }
        mapper.replaceParticipants(RequestContext.tenantId(), reviewId, value.people(), RequestContext.userId());
        return detail(lineId, versionId, reviewId);
    }

    @Transactional
    public Map<String, Object> updateAndSubmit(String lineId, String versionId, String reviewId, SaveReview input) {
        requireVersion(lineId, versionId, true);
        Map<String, Object> current = requireReview(lineId, versionId, reviewId);
        ensureDraft(current);
        if (input == null || input.revision() == null) throw new IllegalArgumentException("缺少评审版本号");
        Validated value = validate(lineId, input, true);
        if (mapper.update(RequestContext.tenantId(), reviewId, input.revision(), value.topic(), value.type(), value.input().meetingTime(), JSON.toJSONString(value.input().relatedTaskIds() == null ? List.of() : value.input().relatedTaskIds()), value.agendaConclusion(), value.remainingIssues(), JSON.toJSONString(value.input().attachments() == null ? List.of() : value.input().attachments()), value.conclusion(), value.summary(), value.risks(), value.recommendation(), RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "版本评审已变化，请刷新后重试");
        }
        mapper.replaceParticipants(RequestContext.tenantId(), reviewId, value.people(), RequestContext.userId());
        if (mapper.submit(RequestContext.tenantId(), reviewId, input.revision() + 1, RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "版本评审提交失败，请刷新后重试");
        }
        return detail(lineId, versionId, reviewId);
    }

    @Transactional
    public Map<String, Object> submit(String lineId, String versionId, String reviewId, Revision input) {
        requireVersion(lineId, versionId, true);
        Map<String, Object> current = requireReview(lineId, versionId, reviewId);
        ensureDraft(current);
        if (input == null || input.revision() == null) throw new IllegalArgumentException("缺少评审版本号");
        List<Map<String, Object>> participants = mapper.participants(RequestContext.tenantId(), reviewId);
        validateForSubmit(lineId, current, participants);
        if (mapper.submit(RequestContext.tenantId(), reviewId, input.revision(), RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "版本评审已变化，请刷新后重试");
        }
        return detail(lineId, versionId, reviewId);
    }

    @Transactional
    public void delete(String lineId, String versionId, String reviewId, Revision input) {
        requireVersion(lineId, versionId, true);
        requireReview(lineId, versionId, reviewId);
        if (input == null || input.revision() == null) throw new IllegalArgumentException("缺少评审版本号");
        if (mapper.delete(RequestContext.tenantId(), reviewId, input.revision(), RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "版本评审已变化，请刷新后重试");
        }
    }

    private void requireVersion(String lineId, String versionId, boolean write) {
        access.check(lineId, write);
        if (mapper.version(RequestContext.tenantId(), lineId, versionId) == null) throw new NoSuchElementException("迭代版本不存在");
    }

    private Map<String, Object> requireReview(String lineId, String versionId, String reviewId) {
        Map<String, Object> review = mapper.review(RequestContext.tenantId(), lineId, versionId, reviewId);
        if (review == null) throw new NoSuchElementException("版本评审不存在");
        return review;
    }

    private void ensureDraft(Map<String, Object> review) {
        if (!"DRAFT".equals(review.get("status"))) throw new ResponseStatusException(HttpStatus.CONFLICT, "已提交的版本评审不可修改");
    }

    private Validated validate(String lineId, SaveReview input, boolean submitting) {
        if (input == null) throw new IllegalArgumentException("评审内容不能为空");
        String topic = clean(input.meetingTopic(), 200, "会议主题");
        if (topic.isBlank()) throw new IllegalArgumentException("请输入会议主题");
        String type = clean(input.reviewType(), 40, "评审类型");
        if (type.isBlank()) throw new IllegalArgumentException("请输入评审类型");
        List<String> ids = input.participantIds() == null ? List.of() : input.participantIds().stream().filter(Objects::nonNull).map(String::trim).filter(value -> !value.isBlank()).distinct().toList();
        List<Map<String, Object>> people = mapper.activeEmployees(RequestContext.tenantId(), ids);
        if (people.size() != ids.size()) throw new IllegalArgumentException("参与人包含已停用或不存在的员工");
        List<String> taskIds = input.relatedTaskIds() == null ? List.of() : input.relatedTaskIds().stream().filter(Objects::nonNull).map(String::trim).filter(value -> !value.isBlank()).distinct().toList();
        if (mapper.validWorkItemCount(RequestContext.tenantId(), lineId, taskIds) != taskIds.size()) throw new IllegalArgumentException("关联任务包含其他产品线或不存在的任务");
        if (input.attachments() != null && input.attachments().size() > 10) throw new IllegalArgumentException("会议附件最多上传10个");
        if (input.attachments() != null && input.attachments().stream().anyMatch(item -> item == null || clean(item.name(), 255, "附件名称").isBlank() || (item.size() != null && item.size() > 10 * 1024 * 1024))) throw new IllegalArgumentException("会议附件名称无效或单个附件超过10MB");
        String conclusion = clean(input.conclusion(), 24, "评审结论");
        if (!conclusion.isBlank() && !CONCLUSIONS.contains(conclusion)) throw new IllegalArgumentException("评审结论无效");
        String agendaConclusion = clean(input.agendaConclusion(), 5000, "议题结论");
        String remainingIssues = clean(input.remainingIssues(), 5000, "遗留问题");
        String summary = clean(input.summary(), 5000, "评审摘要");
        String risks = clean(input.remainingRisks(), 5000, "遗留风险");
        String recommendation = clean(input.releaseRecommendation(), 5000, "发布建议");
        if (submitting && (input.meetingTime() == null || people.isEmpty() || conclusion.isBlank() || agendaConclusion.isBlank())) throw new IllegalArgumentException("提交前请填写会议时间、参与人、评审结论和议题结论");
        return new Validated(input, people, topic, type, conclusion, summary, risks, recommendation, agendaConclusion, remainingIssues);
    }

    private void validateForSubmit(String lineId, Map<String, Object> review, List<Map<String, Object>> participants) {
        SaveReview snapshot = new SaveReview(Objects.toString(review.get("meetingTopic"), ""), Objects.toString(review.get("reviewType"), ""),
            review.get("meetingTime") == null ? null : ((java.sql.Timestamp) review.get("meetingTime")).toLocalDateTime(),
            participants.stream().map(item -> String.valueOf(item.get("id"))).toList(), List.of(), Objects.toString(review.get("conclusion"), ""),
            Objects.toString(review.get("agendaConclusion"), ""), Objects.toString(review.get("remainingIssues"), ""), List.of(),
            Objects.toString(review.get("summary"), ""), Objects.toString(review.get("remainingRisks"), ""),
            Objects.toString(review.get("releaseRecommendation"), ""), ((Number) review.get("revision")).intValue());
        validate(lineId, snapshot, true);
    }

    private String clean(String value, int max, String label) {
        String result = Objects.toString(value, "").trim();
        if (result.length() > max) throw new IllegalArgumentException(label + "不能超过" + max + "个字符");
        return result;
    }

    private List<Object> parseArray(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return List.of();
        try { return JSON.parseArray(String.valueOf(value)); } catch (RuntimeException ignored) { return List.of(); }
    }

    private record Validated(SaveReview input, List<Map<String, Object>> people, String topic, String type, String conclusion, String summary, String risks, String recommendation, String agendaConclusion, String remainingIssues) {}
}

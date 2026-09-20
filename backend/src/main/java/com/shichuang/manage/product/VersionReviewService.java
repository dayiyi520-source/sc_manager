package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

import static com.shichuang.manage.product.VersionReviewDefinition.Revision;
import static com.shichuang.manage.product.VersionReviewDefinition.SaveReview;

@Service
public class VersionReviewService {
    private static final Set<String> CONCLUSIONS = Set.of("通过", "有条件通过", "不通过");
    private final VersionReviewMapper mapper;
    private final WorkItemAccess access;

    public VersionReviewService(VersionReviewMapper mapper, WorkItemAccess access) { this.mapper = mapper; this.access = access; }

    public List<Map<String, Object>> list(String lineId, String versionId) {
        requireVersion(lineId, versionId, false);
        return mapper.reviews(RequestContext.tenantId(), lineId, versionId);
    }

    public Map<String, Object> detail(String lineId, String versionId, String reviewId) {
        requireVersion(lineId, versionId, false);
        Map<String, Object> review = requireReview(lineId, versionId, reviewId);
        Map<String, Object> result = new LinkedHashMap<>(review);
        result.put("participants", mapper.participants(RequestContext.tenantId(), reviewId));
        return result;
    }

    @Transactional
    public Map<String, Object> create(String lineId, String versionId, SaveReview input) {
        requireVersion(lineId, versionId, true);
        Validated value = validate(input, false);
        String id = UUID.randomUUID().toString();
        mapper.insert(RequestContext.tenantId(), id, lineId, versionId, value.input().reviewDate(), value.conclusion(), value.summary(), value.risks(), value.recommendation(), RequestContext.userId());
        mapper.replaceParticipants(RequestContext.tenantId(), id, value.people(), RequestContext.userId());
        return detail(lineId, versionId, id);
    }

    @Transactional
    public Map<String, Object> update(String lineId, String versionId, String reviewId, SaveReview input) {
        requireVersion(lineId, versionId, true);
        Map<String, Object> current = requireReview(lineId, versionId, reviewId);
        ensureDraft(current);
        if (input == null || input.revision() == null) throw new IllegalArgumentException("缺少评审版本号");
        Validated value = validate(input, false);
        if (mapper.update(RequestContext.tenantId(), reviewId, input.revision(), value.input().reviewDate(), value.conclusion(), value.summary(), value.risks(), value.recommendation(), RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "版本评审已变化，请刷新后重试");
        }
        mapper.replaceParticipants(RequestContext.tenantId(), reviewId, value.people(), RequestContext.userId());
        return detail(lineId, versionId, reviewId);
    }

    @Transactional
    public Map<String, Object> submit(String lineId, String versionId, String reviewId, Revision input) {
        requireVersion(lineId, versionId, true);
        Map<String, Object> current = requireReview(lineId, versionId, reviewId);
        ensureDraft(current);
        if (input == null || input.revision() == null) throw new IllegalArgumentException("缺少评审版本号");
        List<Map<String, Object>> participants = mapper.participants(RequestContext.tenantId(), reviewId);
        validateForSubmit(current, participants);
        if (mapper.submit(RequestContext.tenantId(), reviewId, input.revision(), RequestContext.userId()) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "版本评审已变化，请刷新后重试");
        }
        return detail(lineId, versionId, reviewId);
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

    private Validated validate(SaveReview input, boolean submitting) {
        if (input == null) throw new IllegalArgumentException("评审内容不能为空");
        List<String> ids = input.participantIds() == null ? List.of() : input.participantIds().stream().filter(Objects::nonNull).map(String::trim).filter(value -> !value.isBlank()).distinct().toList();
        List<Map<String, Object>> people = mapper.activeEmployees(RequestContext.tenantId(), ids);
        if (people.size() != ids.size()) throw new IllegalArgumentException("参与人包含已停用或不存在的员工");
        String conclusion = clean(input.conclusion(), 24, "评审结论");
        if (!conclusion.isBlank() && !CONCLUSIONS.contains(conclusion)) throw new IllegalArgumentException("评审结论无效");
        String summary = clean(input.summary(), 5000, "评审摘要");
        String risks = clean(input.remainingRisks(), 5000, "遗留风险");
        String recommendation = clean(input.releaseRecommendation(), 5000, "发布建议");
        if (submitting && (input.reviewDate() == null || people.isEmpty() || conclusion.isBlank() || summary.isBlank())) throw new IllegalArgumentException("提交前请填写评审日期、参与人、结论和摘要");
        return new Validated(input, people, conclusion, summary, risks, recommendation);
    }

    private void validateForSubmit(Map<String, Object> review, List<Map<String, Object>> participants) {
        SaveReview snapshot = new SaveReview(
            review.get("reviewDate") == null ? null : ((java.sql.Date) review.get("reviewDate")).toLocalDate(),
            participants.stream().map(item -> String.valueOf(item.get("id"))).toList(), Objects.toString(review.get("conclusion"), ""),
            Objects.toString(review.get("summary"), ""), Objects.toString(review.get("remainingRisks"), ""),
            Objects.toString(review.get("releaseRecommendation"), ""), ((Number) review.get("revision")).intValue());
        validate(snapshot, true);
    }

    private String clean(String value, int max, String label) {
        String result = Objects.toString(value, "").trim();
        if (result.length() > max) throw new IllegalArgumentException(label + "不能超过" + max + "个字符");
        return result;
    }

    private record Validated(SaveReview input, List<Map<String, Object>> people, String conclusion, String summary, String risks, String recommendation) {}
}

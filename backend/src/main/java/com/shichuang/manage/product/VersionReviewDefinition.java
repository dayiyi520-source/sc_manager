package com.shichuang.manage.product;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class VersionReviewDefinition {
    private VersionReviewDefinition() {}

    public record Attachment(String name, String url, Long size) {}

    public record SaveReview(String meetingTopic, String reviewType, LocalDateTime meetingTime, List<String> participantIds,
                             List<String> relatedTaskIds, String conclusion, String agendaConclusion, String remainingIssues,
                             List<Attachment> attachments, String summary, String remainingRisks, String releaseRecommendation,
                             Integer revision) {
        public SaveReview(String meetingTopic, String reviewType, LocalDate reviewDate, List<String> participantIds, String conclusion,
                          String summary, String remainingRisks, String releaseRecommendation, Integer revision) {
            this(meetingTopic, reviewType, reviewDate == null ? null : reviewDate.atStartOfDay(), participantIds, List.of(), conclusion,
                "", remainingRisks, List.of(), summary, remainingRisks, releaseRecommendation, revision);
        }
    }

    public record Revision(Integer revision) {}
}

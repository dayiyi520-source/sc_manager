package com.shichuang.manage.product;

import java.time.LocalDate;
import java.util.List;

public final class VersionReviewDefinition {
    private VersionReviewDefinition() {}

    public record SaveReview(LocalDate reviewDate, List<String> participantIds, String conclusion,
                             String summary, String remainingRisks, String releaseRecommendation,
                             Integer revision) {}

    public record Revision(Integer revision) {}
}

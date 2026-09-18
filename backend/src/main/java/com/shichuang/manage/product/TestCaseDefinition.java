package com.shichuang.manage.product;

import java.time.LocalDateTime;
import java.util.List;

public final class TestCaseDefinition {
    private TestCaseDefinition() {}

    public record StepInput(String id, int sort, String action, String expectedResult) {}
    public record SaveDirectory(String parentId, String name, Integer sort) {}
    public record SaveCase(String directoryId, String sourceRequirementId, String title,
        String precondition, String priority, String ownerId, List<String> tags,
        List<StepInput> steps, Integer revision) {}
    public record Query(String directoryId, String keyword, String priority,
        String ownerId, Boolean enabled, int page, int pageSize) {}
    public record DirectoryView(String id, String parentId, String name, int sort, long caseCount) {}
    public record CaseView(String id, String code, String productLineId, String directoryId,
        String directoryName, String sourceRequirementId, String sourceRequirementTitle,
        String title, String precondition, String priority, String ownerId, String ownerName,
        List<String> tags, boolean enabled, int revision, long referenceCount,
        String latestResult, LocalDateTime createdAt, LocalDateTime updatedAt,
        List<StepInput> steps) {}
    public record CasePage(List<CaseView> items, int page, int pageSize, long total) {}
}

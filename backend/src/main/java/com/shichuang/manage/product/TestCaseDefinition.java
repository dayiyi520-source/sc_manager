package com.shichuang.manage.product;

import java.time.LocalDateTime;
import java.util.List;

public final class TestCaseDefinition {
    private TestCaseDefinition() {}

    public record StepInput(String id, int sort, String action, String expectedResult) {}
    public record SaveDirectory(String parentId, String name, Integer sort, String productLineId) {
        public SaveDirectory(String parentId, String name, Integer sort) { this(parentId,name,sort,null); }
    }
    public record RenameDirectory(String name) {}
    public record CopyDirectory(String parentId, String name) {}
    public record BatchUpdate(List<String> caseIds, String operation, String value) {}
    public record SaveCase(String directoryId, String sourceRequirementId, String title,
        String precondition, String priority, String ownerId, List<String> tags,
        List<StepInput> steps, String workItemTypeId, String statusKey, Integer revision) {}
    public record Query(String directoryId, String keyword, String priority,
        String ownerId, Boolean enabled, int page, int pageSize,
        boolean includeDescendants, List<String> directoryIds) {
        public Query(String directoryId, String keyword, String priority,
                     String ownerId, Boolean enabled, int page, int pageSize) {
            this(directoryId, keyword, priority, ownerId, enabled, page, pageSize, false, List.of());
        }
    }
    public record DirectoryView(String id, String parentId, String name, int sort, long caseCount, String productLineId, String productLineName) {
        public DirectoryView(String id,String parentId,String name,int sort,long caseCount){this(id,parentId,name,sort,caseCount,null,null);}
    }
    public record CaseView(String id, String code, String productLineId, String directoryId,
        String directoryName, String sourceRequirementId, String sourceRequirementTitle,
        String title, String precondition, String priority, String ownerId, String ownerName,
        List<String> tags, String workItemTypeId, String workItemTypeName, String workflowId,
        String statusKey, String statusName, String statusGroup, String statusColor,
        boolean enabled, int revision, long referenceCount,
        String latestResult, LocalDateTime createdAt, LocalDateTime updatedAt,
        List<StepInput> steps) {}
    public record CasePage(List<CaseView> items, int page, int pageSize, long total) {}
}

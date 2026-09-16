package com.shichuang.manage.product;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Read contract: absent stable type/workflow IDs remain null rather than invented. */
public record UnifiedWorkItem(
    String key, String id, String category, String source, String code, String title,
    String productLineId, String versionId, String requirementId, String assigneeName,
    String taskTypeId, String workflowId, String statusKey, WorkItemStatus status, String statusColor,
    String priority, String originalPriority, LocalDate plannedEndDate,
    BigDecimal estimatedHours, BigDecimal actualHours, LocalDateTime createdAt,
    boolean overdue, boolean potentialBlockingDefect, String parentWorkItemId, String assigneeId
) {}

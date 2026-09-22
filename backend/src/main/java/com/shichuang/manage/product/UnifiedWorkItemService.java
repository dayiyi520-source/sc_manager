package com.shichuang.manage.product;

import com.shichuang.manage.api.PageResult;
import com.shichuang.manage.auth.RequestContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class UnifiedWorkItemService {
    private static final Set<String> CATEGORIES = Set.of("requirement", "design", "dev", "test", "bug", "case");
    private static final List<String> LIMITATIONS = List.of(
        "历史工作项尚未绑定分类流程版本", "历史数据或未配置交付规则的需求不能判定自动完成与可发布资格");
    private final UnifiedWorkItemMapper mapper;
    private final ProductLineMapper productLines;
    private final WorkItemCompletionService completion;

    public UnifiedWorkItemService(UnifiedWorkItemMapper mapper, ProductLineMapper productLines,WorkItemCompletionService completion) {
        this.mapper = mapper;
        this.productLines = productLines;
        this.completion=completion;
    }

    public record Listing(PageResult<UnifiedWorkItem> page, List<String> limitations) {}
    public record VersionSummary(String versionId, long totalRequirements, long completedRequirements,
        BigDecimal completionPercent, Boolean readyToRelease, List<String> unfinishedRequirementKeys,
        List<String> potentialBlockingDefectKeys, List<String> limitations,List<String> readinessReasons) {
        public VersionSummary(String versionId,long totalRequirements,long completedRequirements,BigDecimal completionPercent,Boolean readyToRelease,List<String> unfinishedRequirementKeys,List<String> potentialBlockingDefectKeys,List<String> limitations) {
            this(versionId,totalRequirements,completedRequirements,completionPercent,readyToRelease,unfinishedRequirementKeys,potentialBlockingDefectKeys,limitations,limitations);
        }
    }
    public record RequirementSummary(UnifiedWorkItem requirement, List<UnifiedWorkItem> linkedItems,
        List<String> currentHandlers, List<String> completedItemKeys, List<String> overdueItemKeys,
        List<String> potentialBlockingDefectKeys, Boolean completionEligible, List<String> limitations) {}

    public Listing list(String lineId, String versionId, String category, String keyword, int page, int size) {
        requireLine(lineId);
        if (!category.isBlank() && !CATEGORIES.contains(category)) throw new IllegalArgumentException("不支持的工作项分类");
        if (!versionId.isBlank()) requireVersion(lineId, versionId);
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(100, size));
        String term = keyword.trim();
        long offsetValue = (long) (safePage - 1) * safeSize;
        long total = mapper.count(RequestContext.tenantId(), lineId, versionId, category, term);
        List<UnifiedWorkItem> slice = offsetValue >= total || offsetValue > Integer.MAX_VALUE ? List.of()
            : mapper.list(RequestContext.tenantId(), lineId, versionId, category, term, (int) offsetValue, safeSize)
                .stream().map(row -> map(row, LocalDate.now())).toList();
        return new Listing(new PageResult<>(slice, safePage, safeSize, total), LIMITATIONS);
    }

    public VersionSummary versionSummary(String lineId, String versionId) {
        requireLine(lineId);
        requireVersion(lineId, versionId);
        List<UnifiedWorkItem> items=read(lineId);
        VersionSummary summary=summarizeVersion(versionId,items);
        var scoped=items.stream().filter(item->versionId.equals(item.versionId())).toList();
        if(scoped.stream().anyMatch(item->!"core".equals(item.source()))) return summary;
        var blockers=completion.snapshot(lineId);
        List<String> readinessReasons=new java.util.ArrayList<>();
        if(summary.totalRequirements()==0) readinessReasons.add("版本尚未纳入需求");
        summary.unfinishedRequirementKeys().forEach(key->readinessReasons.add("需求尚未完成："+key));
        scoped.forEach(item->blockers.getOrDefault(item.id(),List.of()).forEach(blocker->readinessReasons.add("工作项"+item.key()+"等待"+blocker.workItemId())));
        boolean ready=summary.totalRequirements()>0 && summary.totalRequirements()==summary.completedRequirements()
            && scoped.stream().allMatch(item->blockers.getOrDefault(item.id(),List.of()).isEmpty());
        for(var requirement:scoped.stream().filter(item->"requirement".equals(item.category())).toList()) {
            var eligibility=completion.eligibility(lineId,requirement.id());
            Boolean eligible=eligibility.eligible();
            if(eligible==null) return summary;
            readinessReasons.addAll(eligibility.reasons());
            ready=ready && eligible;
        }
        return new VersionSummary(versionId,summary.totalRequirements(),summary.completedRequirements(),summary.completionPercent(),ready,
            summary.unfinishedRequirementKeys(),summary.potentialBlockingDefectKeys(),List.of(),readinessReasons.stream().distinct().toList());
    }

    static VersionSummary summarizeVersion(String versionId, List<UnifiedWorkItem> items) {
        List<UnifiedWorkItem> scoped = items.stream().filter(item -> versionId.equals(item.versionId())).toList();
        List<UnifiedWorkItem> requirements = scoped.stream().filter(item -> "requirement".equals(item.category())).toList();
        long completed = requirements.stream().filter(item -> item.status().successful()).count();
        BigDecimal percent = requirements.isEmpty() ? BigDecimal.ZERO : BigDecimal.valueOf(completed * 100)
            .divide(BigDecimal.valueOf(requirements.size()), 2, RoundingMode.HALF_UP);
        // null means unknown, not publishable. Old published facts are never rewritten by this read model.
        return new VersionSummary(versionId, requirements.size(), completed, percent, null,
            requirements.stream().filter(item -> !item.status().successful()).map(UnifiedWorkItem::key).toList(),
            scoped.stream().filter(UnifiedWorkItem::potentialBlockingDefect).map(UnifiedWorkItem::key).toList(), LIMITATIONS);
    }

    public RequirementSummary requirementSummary(String lineId, String id) {
        requireLine(lineId);
        List<UnifiedWorkItem> items = read(lineId);
        UnifiedWorkItem requirement = items.stream().filter(item -> "requirement".equals(item.category()) && id.equals(item.id()))
            .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "需求不存在"));
        List<UnifiedWorkItem> linked = items.stream().filter(item -> id.equals(item.requirementId())).toList();
        List<UnifiedWorkItem> processing = java.util.stream.Stream.concat(java.util.stream.Stream.of(requirement), linked.stream()).toList();
        var eligibility="core".equals(requirement.source())?completion.eligibility(lineId,id):new WorkItemCompletionService.Eligibility(null,LIMITATIONS);
        return new RequirementSummary(requirement, linked,
            processing.stream().filter(item -> item.status().group() == WorkItemStatus.Group.IN_PROGRESS)
                .map(UnifiedWorkItem::assigneeName).filter(name -> !name.isBlank()).distinct().toList(),
            linked.stream().filter(item -> item.status().successful()).map(UnifiedWorkItem::key).toList(),
            processing.stream().filter(UnifiedWorkItem::overdue).map(UnifiedWorkItem::key).toList(),
            linked.stream().filter(UnifiedWorkItem::potentialBlockingDefect).map(UnifiedWorkItem::key).toList(),
            eligibility.eligible(),eligibility.reasons());
    }

    private List<UnifiedWorkItem> read(String lineId) {
        LocalDate today = LocalDate.now();
        return mapper.byProductLine(RequestContext.tenantId(), lineId).stream().map(row -> map(row, today)).toList();
    }

    static UnifiedWorkItem map(Map<String, Object> row, LocalDate today) {
        String category = text(row, "category");
        WorkItemStatus status = WorkItemStatus.legacy(category, text(row, "status"));
        if (row.get("statusGroup") != null) {
            WorkItemStatus.Group group = WorkItemStatus.Group.valueOf(text(row,"statusGroup"));
            status = new WorkItemStatus(text(row,"status"),group,group == WorkItemStatus.Group.COMPLETED || group == WorkItemStatus.Group.CANCELLED,
                WorkItemConfigurationService.enabled(row.get("successful")),false);
        }
        String originalPriority = text(row, "priority");
        String priority = WorkItemStatus.priority(originalPriority);
        Object rawDate = row.get("dueDate");
        LocalDate due = rawDate == null ? null : rawDate instanceof java.sql.Date date ? date.toLocalDate() : LocalDate.parse(rawDate.toString());
        Object rawCreated = row.get("createdAt");
        LocalDateTime created = rawCreated == null ? null : rawCreated instanceof java.sql.Timestamp timestamp ? timestamp.toLocalDateTime()
            : rawCreated instanceof LocalDateTime dateTime ? dateTime : LocalDateTime.parse(rawCreated.toString().replace(' ', 'T'));
        String statusColor = nullable(row,"statusColor");
        return new UnifiedWorkItem(category + ":" + text(row, "id"), text(row, "id"), category, text(row, "source"),
            text(row, "code"), text(row, "title"), text(row, "productLineId"), nullable(row, "versionId"),
            nullable(row, "requirementId"), nullable(row, "requirementTitle"), nullable(row, "requirementInitiatorName"), nullable(row, "sourceType"), text(row, "assigneeName"), nullable(row,"taskTypeId"), nullable(row,"workflowId"), nullable(row,"statusKey"), status,
            statusColor == null ? "neutral" : statusColor, priority, originalPriority,
            due, decimal(row.get("estimatedHours")), decimal(row.get("actualHours")), created,
            due != null && due.isBefore(today) && !status.terminal(),
            "bug".equals(category) && ("P0".equals(priority) || "P1".equals(priority)) && !status.terminal(), nullable(row,"parentWorkItemId"), nullable(row,"assigneeId"),
            WorkItemConfigurationService.enabled(row.get("hasChildren")), ((Number)row.getOrDefault("revision",0)).intValue());
    }

    private void requireLine(String lineId) {
        if (!Set.of("admin", "product_manager", "tech_lead", "product", "tech").contains(RequestContext.role()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "当前角色无权访问产品数据");
        if (lineId == null || lineId.isBlank()) throw new IllegalArgumentException("请选择产品线");
        if (productLines.find(RequestContext.tenantId(), lineId) == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "产品线不存在");
        if (!"admin".equals(RequestContext.role()) && !mapper.canRead(RequestContext.tenantId(), lineId, RequestContext.userId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "当前用户无权访问该产品线");
    }

    private void requireVersion(String lineId, String versionId) {
        Map<String, Object> version = productLines.version(RequestContext.tenantId(), versionId);
        if (version == null || !lineId.equals(version.get("productLineId")))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "版本不存在");
    }

    private static String text(Map<String, Object> row, String key) { return Objects.toString(row.get(key), "").trim(); }
    private static String nullable(Map<String, Object> row, String key) { String value = text(row, key); return value.isBlank() ? null : value; }
    private static BigDecimal decimal(Object value) { return value == null ? null : new BigDecimal(value.toString()); }
}

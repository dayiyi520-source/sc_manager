package com.shichuang.manage.product;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/** Configuration contracts shared by all work item categories. */
public final class WorkItemDefinition {
    private WorkItemDefinition() {}
    public static final Map<String,String> CATEGORIES = Map.of(
        "requirement","需求","design","设计","dev","研发","test","测试","bug","缺陷","case","用例");
    public static final Set<String> STATE_COLORS = Set.of("neutral","blue","cyan","green","yellow","red","purple");
    public record State(String key, String name, WorkItemStatus.Group group, boolean initial,
                        boolean successful, boolean enabled, String stage, String color) {
        public State(String key, String name, WorkItemStatus.Group group, boolean initial,
                     boolean successful, boolean enabled, String stage) {
            this(key, name, group, initial, successful, enabled, stage, "neutral");
        }
        public State {
            color = color == null || color.isBlank() ? "neutral" : color;
        }
    }
    public static final Set<String> WRITE_ROLES = Set.of("admin", "product_manager", "tech_lead");
    public static final Set<String> REQUIRED_FIELDS = Set.of("assigneeId", "description", "expectedGoal", "plannedEndDate", "reason");
    public record ApprovalTasks(String designTypeId, String devTypeId, String testTypeId) {}
    public record Edge(String key, String from, String to, String name, List<String> roles, List<String> requiredFields, ApprovalTasks approvalTasks, boolean autoComplete) {
        public Edge(String key, String from, String to, String name, List<String> roles, List<String> requiredFields, ApprovalTasks approvalTasks) { this(key,from,to,name,roles,requiredFields,approvalTasks,false); }
        public Edge(String key, String from, String to, String name, List<String> roles, List<String> requiredFields) { this(key,from,to,name,roles,requiredFields,null); }
        public Edge(String key, String from, String to, String name) { this(key, from, to, name, null, null); }
        public List<String> effectiveRoles() { return roles == null ? WRITE_ROLES.stream().sorted().toList() : roles; }
        public List<String> effectiveRequiredFields() { return requiredFields == null ? List.of() : requiredFields; }
    }
    public record Transition(String edgeKey, Integer revision, String reason) {}
    public record Workflow(List<State> states, List<Edge> transitions) {}
    public record SaveWorkflow(String category, String name, Workflow definition, Integer revision) {}
    public record CreateWorkItemType(String category, String name, String description, Boolean enabled, Boolean isDefault, SaveWorkflow workflow) {
        public CreateWorkItemType(String category, String name, String description, Boolean enabled, SaveWorkflow workflow) {
            this(category, name, description, enabled, false, workflow);
        }
    }
    public record Revision(int revision) {}
    public record ChildRule(String parentTypeId, String childTypeId, boolean enabled) {}
    public record CreateItem(String requestId, String productLineId, String category, String taskTypeId,
        String title, String description, String descriptionHtml, String expectedGoal, String versionId, String requirementId,
        String parentWorkItemId, String assigneeId, String priority, LocalDate plannedStartDate,
        LocalDate plannedEndDate, BigDecimal estimatedHours, BigDecimal actualHours, String customerId, String customerName,
        List<String> ccNames, List<Map<String,Object>> media) {
        public CreateItem(String requestId, String productLineId, String category, String taskTypeId,
            String title, String description, String descriptionHtml, String expectedGoal, String versionId, String requirementId,
            String parentWorkItemId, String assigneeId, String priority, LocalDate plannedStartDate,
            LocalDate plannedEndDate, BigDecimal estimatedHours, BigDecimal actualHours, String customerId, String customerName) {
            this(requestId, productLineId, category, taskTypeId, title, description, descriptionHtml, expectedGoal, versionId,
                requirementId, parentWorkItemId, assigneeId, priority, plannedStartDate, plannedEndDate, estimatedHours, actualHours,
                customerId, customerName, null, null);
        }
        public CreateItem(String requestId, String productLineId, String category, String taskTypeId,
            String title, String description, String expectedGoal, String versionId, String requirementId,
            String parentWorkItemId, String assigneeId, String priority, LocalDate plannedStartDate,
            LocalDate plannedEndDate, BigDecimal estimatedHours, BigDecimal actualHours) {
            this(requestId, productLineId, category, taskTypeId, title, description, null, expectedGoal, versionId,
                requirementId, parentWorkItemId, assigneeId, priority, plannedStartDate, plannedEndDate, estimatedHours, actualHours,
                null, null, null, null);
        }
    }
    public record UpdateItem(String title, String description, String descriptionHtml, String expectedGoal, String versionId,
        String assigneeName, String priority, LocalDate plannedStartDate, LocalDate plannedEndDate,
        BigDecimal estimatedHours, BigDecimal actualHours, Integer revision) {
        public UpdateItem(String title, String description, String expectedGoal, String versionId,
            String assigneeName, String priority, LocalDate plannedStartDate, LocalDate plannedEndDate,
            BigDecimal estimatedHours, BigDecimal actualHours, Integer revision) {
            this(title, description, null, expectedGoal, versionId, assigneeName, priority, plannedStartDate,
                plannedEndDate, estimatedHours, actualHours, revision);
        }
    }

    public static String category(String value) {
        if (!CATEGORIES.containsKey(value == null ? "" : value)) throw new IllegalArgumentException("工作项分类无效");
        return value;
    }
    public static String required(String value, String label, int max) {
        if (value == null || value.isBlank() || value.trim().length() > max) throw new IllegalArgumentException(label + "不能为空且长度不能超过" + max);
        return value.trim();
    }
    public static String optional(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    public static void validate(Workflow workflow) {
        if (workflow == null || workflow.states() == null || workflow.transitions() == null
            || workflow.states().size() < 2 || workflow.states().size() > 100 || workflow.transitions().size() > 500)
            throw new IllegalArgumentException("流程需包含2至100个状态，流转规则不能超过500条");
        Map<String, State> states = new HashMap<>();
        for (State state : workflow.states()) {
            if (state == null) throw new IllegalArgumentException("状态不能为空");
            key(state.key()); required(state.name(), "状态名称", 128);
            if (state.group() == null || state.group() == WorkItemStatus.Group.UNKNOWN) throw new IllegalArgumentException("请选择通用状态属性");
            if (state.successful() != (state.group() == WorkItemStatus.Group.COMPLETED)) throw new IllegalArgumentException("完成状态必须由通用阶段自动推导");
            if (state.initial() && (!state.enabled() || state.group() != WorkItemStatus.Group.NOT_STARTED)) throw new IllegalArgumentException("初始状态必须启用且为未开始");
            if (!STATE_COLORS.contains(state.color())) throw new IllegalArgumentException("状态颜色无效");
            if (state.stage() == null || !Set.of("requirement","design","dev","test","acceptance","release").contains(state.stage()))
                throw new IllegalArgumentException("业务阶段无效");
            if (states.put(state.key(), state) != null) throw new IllegalArgumentException("状态编码不能重复");
        }
        if (workflow.states().stream().noneMatch(s -> s.group() == WorkItemStatus.Group.NOT_STARTED)
            || workflow.states().stream().noneMatch(s -> s.group() == WorkItemStatus.Group.COMPLETED))
            throw new IllegalArgumentException("状态流转必须包含至少一个‘未开始’和一个‘已完成’阶段的状态。");
        List<State> initial = workflow.states().stream().filter(State::initial).toList();
        if (initial.size() != 1)
            throw new IllegalArgumentException("流程必须恰有一个默认状态");
        Set<String> edgeKeys = new HashSet<>();
        Set<String> pairs = new HashSet<>();
        for (Edge edge : workflow.transitions()) {
            if (edge == null) throw new IllegalArgumentException("流转不能为空");
            key(edge.key()); required(edge.name(), "流转名称", 128);
            if(edge.autoComplete()) {
                State target=states.get(edge.to());
                if(target==null || !target.successful() || edge.approvalTasks()!=null || edge.effectiveRequiredFields().contains("reason") || edge.roles()!=null)
                    throw new IllegalArgumentException("自动完成只能连接成功终态，不能同时下发任务或要求人工角色及操作原因");
                if(workflow.transitions().stream().filter(e->e!=null && e.autoComplete() && Objects.equals(e.from(),edge.from())).count()>1)
                    throw new IllegalArgumentException("同一状态只能配置一条自动完成流转");
            }
            if (edge.approvalTasks()!=null) {
                required(edge.approvalTasks().designTypeId(),"设计主任务类型",36);
                required(edge.approvalTasks().devTypeId(),"研发主任务类型",36);
                required(edge.approvalTasks().testTypeId(),"测试主任务类型",36);
                State approvalTarget=states.get(edge.to());
                if (approvalTarget==null || approvalTarget.group()!=WorkItemStatus.Group.IN_PROGRESS)
                    throw new IllegalArgumentException("评审通过后需求必须处于进行中");
            }
            if (edge.effectiveRoles().isEmpty() || edge.effectiveRoles().stream().anyMatch(role -> role == null || !WRITE_ROLES.contains(role)))
                throw new IllegalArgumentException("流转角色必须为现有产品写入角色");
            if (edge.effectiveRequiredFields().stream().anyMatch(field -> field == null || !REQUIRED_FIELDS.contains(field)))
                throw new IllegalArgumentException("流转必填条件无效");
            if (!edgeKeys.add(edge.key()) || !pairs.add(edge.from() + ":" + edge.to())) throw new IllegalArgumentException("流转规则不能重复");
            if (!states.containsKey(edge.from()) || !states.containsKey(edge.to()) || edge.from().equals(edge.to())) throw new IllegalArgumentException("流转必须连接两个不同的已有状态");
        }
        Set<String> reachable = new HashSet<>(Set.of(initial.get(0).key()));
        boolean changed;
        do {
            changed = false;
            for (Edge edge : workflow.transitions()) {
                if (reachable.contains(edge.from()) && states.get(edge.to()).enabled()) changed |= reachable.add(edge.to());
            }
        } while (changed);
        if (workflow.states().stream().anyMatch(state -> state.enabled() && !reachable.contains(state.key()))) throw new IllegalArgumentException("存在无法从初始状态到达的启用状态");
    }
    private static void key(String value) {
        if (value == null || !value.matches("[a-zA-Z][a-zA-Z0-9_-]{0,63}")) throw new IllegalArgumentException("状态或流转编码需以字母开头，使用字母数字下划线或短横线，最长64位");
    }
}

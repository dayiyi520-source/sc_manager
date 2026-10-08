package com.shichuang.manage.product;

import com.shichuang.manage.auth.RequestContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class WorkItemBatchService {
    public record Target(String productLineId, String id, int revision) {}
    public record Command(List<Target> targets, String operation, String value, List<String> participants) {}

    private final WorkItemStorageMapper mapper;
    private final WorkItemStorageService storage;
    private final WorkItemTransitionService transitions;
    private final WorkItemConfigurationService configurations;
    private final WorkItemAccess access;

    public WorkItemBatchService(WorkItemStorageMapper mapper, WorkItemStorageService storage,
        WorkItemTransitionService transitions, WorkItemConfigurationService configurations, WorkItemAccess access) {
        this.mapper = mapper;
        this.storage = storage;
        this.transitions = transitions;
        this.configurations = configurations;
        this.access = access;
    }

    @Transactional
    public int execute(Command command) {
        if (command == null || command.targets() == null || command.targets().isEmpty() || command.targets().size() > 100)
            throw new IllegalArgumentException("每次请选择1至100条工作项");
        if (!Set.of("version", "status", "owner", "participants", "delete").contains(command.operation()))
            throw new IllegalArgumentException("不支持该批量操作");
        if (!Set.of("delete", "participants").contains(command.operation()) && (command.value() == null || command.value().isBlank()))
            throw new IllegalArgumentException("请选择修改后的值");
        Set<String> ids = new HashSet<>();
        String category = null;
        for (Target target : command.targets()) {
            if (target == null || target.productLineId() == null || target.productLineId().isBlank()
                || target.id() == null || target.id().isBlank() || target.revision() < 0
                || !ids.add(target.id())) throw new IllegalArgumentException("选择的工作项无效或重复");
            access.check(target.productLineId(), true);
            Map<String,Object> item = mapper.item(RequestContext.tenantId(), target.productLineId(), target.id());
            if (item == null) throw new IllegalArgumentException("工作项不存在，请刷新列表");
            String currentCategory = Objects.toString(item.get("category"), "");
            if (category != null && !category.equals(currentCategory)) throw new IllegalArgumentException("只能批量操作同一类型的工作项");
            category = currentCategory;
            if (((Number)item.get("revision")).intValue() != target.revision())
                throw new IllegalArgumentException("工作项已变化，请刷新列表");
        }
        List<String> participants = command.operation().equals("participants")
            ? storage.validatedCcNames(command.participants(), RequestContext.tenantId()) : List.of();
        for (Target target : command.targets()) {
            String line = target.productLineId(), id = target.id();
            switch (command.operation()) {
                case "delete" -> storage.delete(line, id, target.revision());
                case "status" -> {
                    var options = transitions.available(line, id);
                    var action = options.actions().stream().filter(option -> option.to().equals(command.value()) && option.allowed())
                        .findFirst().orElseThrow(() -> new IllegalArgumentException("所选工作项无法流转到目标状态"));
                    transitions.execute(line, id, new WorkItemDefinition.Transition(action.edgeKey(), target.revision(), null));
                }
                case "participants" -> {
                    if (mapper.updateParticipants(RequestContext.tenantId(), line, id, target.revision(), configurations.encode(participants), RequestContext.userId()) != 1)
                        throw new IllegalArgumentException("工作项已变化，请刷新列表");
                    mapper.activity(RequestContext.tenantId(), line, id, "WORK_ITEM_UPDATED",
                        configurations.encode(Map.of("participants", participants)), RequestContext.userId());
                }
                default -> storage.update(line, id, new WorkItemDefinition.UpdateItem(null, null, null, null,
                    command.operation().equals("version") ? command.value() : null,
                    command.operation().equals("owner") ? command.value() : null,
                    null, null, null, null, null, target.revision()));
            }
        }
        return command.targets().size();
    }
}

package com.shichuang.manage.product;

import java.util.List;
import static com.shichuang.manage.product.WorkItemDefinition.*;

final class WorkItemTemplate {
    record Type(String category, String apiCategory, String name, boolean isDefault) {}

    private static final List<Type> TYPES = List.of(
        new Type("需求", "requirement", "产品类型需求", true),
        new Type("需求", "requirement", "技术类需求", false),
        new Type("需求", "requirement", "数据类需求", false),
        new Type("需求", "requirement", "其他需求", false),
        new Type("设计", "design", "需求设计", true),
        new Type("设计", "design", "物料设计", false),
        new Type("设计", "design", "其他设计", false),
        new Type("研发", "dev", "开发任务", true),
        new Type("研发", "dev", "缺陷修复任务", false),
        new Type("研发", "dev", "样式优化任务", false),
        new Type("研发", "dev", "性能优化任务", false),
        new Type("研发", "dev", "其他任务", false),
        new Type("测试", "test", "测试任务", true),
        new Type("测试", "test", "用例编写", false),
        new Type("测试", "test", "测试验收", false),
        new Type("测试", "test", "安全测试", false),
        new Type("测试", "test", "回归测试", false),
        new Type("缺陷", "bug", "系统缺陷", true),
        new Type("缺陷", "bug", "样式缺陷", false),
        new Type("缺陷", "bug", "线上故障", false),
        new Type("缺陷", "bug", "安全漏洞", false)
    );

    private WorkItemTemplate() {}

    static List<Type> types() { return TYPES; }

    static SaveWorkflow workflow(Type type) {
        String stage = "bug".equals(type.apiCategory()) ? "dev" : type.apiCategory();
        Workflow definition = new Workflow(
            List.of(
                new State("status_pending", "待处理", WorkItemStatus.Group.NOT_STARTED, true, false, true, stage, "neutral"),
                new State("status_in_progress", "处理中", WorkItemStatus.Group.IN_PROGRESS, false, false, true, stage, "blue"),
                new State("status_completed", "已完成", WorkItemStatus.Group.COMPLETED, false, true, true, stage, "green"),
                new State("status_cancelled", "已取消", WorkItemStatus.Group.CANCELLED, false, false, true, stage, "neutral")
            ),
            List.of(
                new Edge("start_processing", "status_pending", "status_in_progress", "进入处理中"),
                new Edge("complete", "status_in_progress", "status_completed", "完成"),
                new Edge("cancel_pending", "status_pending", "status_cancelled", "取消"),
                new Edge("cancel_processing", "status_in_progress", "status_cancelled", "取消")
            )
        );
        return new SaveWorkflow(type.apiCategory(), type.name() + "状态配置", definition, null);
    }
}

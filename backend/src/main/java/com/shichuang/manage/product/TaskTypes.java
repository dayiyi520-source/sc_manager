package com.shichuang.manage.product;

import java.util.Set;

/** 工单转统一工作项的兼容类型。 */
public final class TaskTypes {
    public static final Set<String> VALID_TARGETS = Set.of(
        "产品需求", "缺陷管理", "设计任务", "研发任务"
    );

    private TaskTypes() {}

    public static boolean isValidTarget(String value) { return VALID_TARGETS.contains(value); }

    public static String category(String value) {
        return switch (value == null ? "" : value) {
            case "产品需求" -> "requirement";
            case "设计任务" -> "design";
            case "研发任务" -> "dev";
            case "缺陷管理" -> "bug";
            default -> null;
        };
    }
}

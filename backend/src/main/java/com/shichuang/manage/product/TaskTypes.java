package com.shichuang.manage.product;

import java.util.Set;

/** 下游任务类型的统一白名单，其他问题只属于工单来源，不是下游任务类型。 */
public final class TaskTypes {
    public static final Set<String> VALID_TARGETS = Set.of(
        "产品需求", "数据需求", "缺陷管理", "设计任务", "售前任务", "交付任务", "运维任务", "研发任务",
        "bug修复", "Bug修复", "售前支持", "项目交付", "交付支持", "运维部署", "技术问题"
    );

    private TaskTypes() {}

    public static boolean isValidTarget(String value) { return VALID_TARGETS.contains(value); }
}

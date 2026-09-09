package com.shichuang.manage.product;

import java.util.Set;

final class RequirementStatusPolicy {
    private static final Set<String> HOLDABLE = Set.of("待处理");
    private static final Set<String> REJECTABLE = Set.of("待处理", "已搁置");
    private static final Set<String> ASSIGNABLE = Set.of("待处理", "已搁置", "处理中");

    private RequirementStatusPolicy() {
    }

    static boolean canHold(String status) {
        return HOLDABLE.contains(status);
    }

    static boolean canReject(String status) {
        return REJECTABLE.contains(status);
    }

    static boolean canCreateWorkItem(String status) {
        return ASSIGNABLE.contains(status);
    }
}

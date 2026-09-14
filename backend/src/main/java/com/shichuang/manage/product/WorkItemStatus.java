package com.shichuang.manage.product;

import java.util.Set;

/** Legacy compatibility mapping only; never grants a workflow transition. */
public record WorkItemStatus(String name, Group group, boolean terminal, boolean successful,
                             boolean legacyBlocked) {
    public enum Group { NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED, UNKNOWN }

    public static WorkItemStatus legacy(String category, String name) {
        String value = name == null ? "" : name.trim();
        boolean completed = Set.of("已完成", "已发布").contains(value)
            || ("design".equals(category) && "无需设计".equals(value))
            || ("bug".equals(category) && "已关闭".equals(value));
        if (completed) return new WorkItemStatus(value, Group.COMPLETED, true, true, false);
        if ("已取消".equals(value)) return new WorkItemStatus(value, Group.CANCELLED, true, false, false);
        if (Set.of("待处理", "待开始", "待设计", "待开发", "待测试", "待修复").contains(value))
            return new WorkItemStatus(value, Group.NOT_STARTED, false, false, false);
        if (Set.of("设计中", "开发中", "研发中", "测试中", "修复中", "待评审", "已评审", "待验收", "已验收", "待复验", "待验证", "已解决").contains(value))
            return new WorkItemStatus(value, Group.IN_PROGRESS, false, false, false);
        // A legacy blocked state does not reveal the original business state.
        return new WorkItemStatus(value, Group.UNKNOWN, false, false, Set.of("阻塞", "已阻塞").contains(value));
    }

    public static String priority(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        for (String code : Set.of("P0", "P1", "P2", "P3")) {
            if (normalized.equals(code) || normalized.startsWith(code + "-")) return code;
        }
        return switch (normalized) {
            case "紧急" -> "P0";
            case "高" -> "P1";
            case "中" -> "P2";
            case "低" -> "P3";
            default -> null;
        };
    }
}

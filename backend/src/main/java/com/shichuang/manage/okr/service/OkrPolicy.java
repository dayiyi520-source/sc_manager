package com.shichuang.manage.okr.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/** Pure business rules shared by writes and review submission. */
public final class OkrPolicy {
    private OkrPolicy() {}

    public static void requireParent(String ownerId, String supervisorId, String parentOwnerId,
                                     String parentStatus, boolean organizationRoot) {
        if (organizationRoot && supervisorId == null && parentOwnerId == null) return;
        if (supervisorId == null || !supervisorId.equals(parentOwnerId) || ownerId.equals(parentOwnerId)) {
            throw new IllegalArgumentException("请选择直属上级已确认的目标或 KR；尚未配置直属上级时请联系管理员");
        }
        if (!"active".equals(parentStatus)) throw new IllegalArgumentException("上级目标尚未生效或已关闭，不能承接");
    }

    public static void weights(List<Integer> weights) {
        if (weights == null || weights.isEmpty() || weights.size() > 20
                || weights.stream().anyMatch(w -> w == null || w <= 0 || w > 100)
                || weights.stream().mapToInt(Integer::intValue).sum() != 100) {
            throw new IllegalArgumentException("请设置 1 至 20 个 KR，每项权重大于 0 且合计为 100%");
        }
    }

    public static int progress(List<Integer> weights, List<Integer> values) {
        weights(weights);
        if (values == null || values.size() != weights.size()
                || values.stream().anyMatch(v -> v == null || v < 0 || v > 100)) {
            throw new IllegalArgumentException("KR 进度须为 0 至 100");
        }
        double result = 0;
        for (int i = 0; i < weights.size(); i++) result += weights.get(i) * values.get(i) / 100.0;
        return (int) Math.round(result);
    }

    public static void period(LocalDate start, LocalDate end) {
        if (start == null || end == null || end.isBefore(start) || end.isAfter(start.plusMonths(1))) {
            throw new IllegalArgumentException("请选择有效的周或月复盘区间");
        }
    }

    public static String transition(String kind, String state, String action, boolean owner, boolean reviewer) {
        if ("objective".equals(kind)) {
            if (owner && Set.of("draft", "returned").contains(state) && "submit".equals(action)) return "pending_review";
            if (reviewer && "pending_review".equals(state) && "approve".equals(action)) return "active";
            if (reviewer && "pending_review".equals(state) && "return".equals(action)) return "returned";
            if (owner && "active".equals(state) && "complete".equals(action)) return "completed";
            if (owner && "completed".equals(state) && "archive".equals(action)) return "archived";
        } else if ("review".equals(kind)) {
            if (owner && Set.of("draft", "returned").contains(state) && "submit".equals(action)) return "submitted";
            if (reviewer && "submitted".equals(state) && "return".equals(action)) return "returned";
            if (reviewer && "submitted".equals(state) && "approve".equals(action)) return "reviewed";
            if (owner && "reviewed".equals(state) && "archive".equals(action)) return "archived";
        }
        throw new IllegalArgumentException("当前状态或权限不允许此操作，请刷新后重试");
    }
}

package com.shichuang.manage.product;

import java.util.ArrayList;
import java.util.List;

record TaskListPredicate(String sql, Object[] args) {
    static TaskListPredicate build(String tenantId, String alias, String ownerColumn, TaskListFilter filter, boolean extendedFields) {
        String prefix = alias.isBlank() ? "" : alias + ".";
        List<String> parts = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        parts.add(prefix + "tenant_id_=?"); args.add(tenantId);
        parts.add(prefix + "delete_flag_=0");

        if (!filter.keyword().isBlank()) {
            String like = "%" + filter.keyword() + "%";
            parts.add("(" + prefix + "title_ LIKE ? OR " + prefix + "description_ LIKE ? OR " + prefix + ownerColumn + " LIKE ?)");
            args.add(like); args.add(like); args.add(like);
        }
        equal(parts, args, prefix + "product_line_name_", filter.productLine());
        text(parts, args, prefix + "title_", filter.title(), filter.titleOperator());
        multi(parts, args, prefix + ownerColumn, filter.searchOwners(), "include");
        multi(parts, args, prefix + "status_", filter.statuses(), filter.statusOperator());
        multi(parts, args, prefix + ownerColumn, filter.owners(), filter.ownerOperator());
        multi(parts, args, prefix + "creator_name_", filter.creators(), filter.creatorOperator());
        multi(parts, args, prefix + "customer_name_", filter.customers(), filter.customerOperator());
        multi(parts, args, prefix + "version_name_", filter.versions(), filter.versionOperator());
        date(parts, args, prefix + "create_time_", filter.createdFrom(), filter.createdTo(), filter.createdOperator());

        if (extendedFields) {
            date(parts, args, prefix + "planned_start_date_", filter.plannedStartFrom(), filter.plannedStartTo(), filter.plannedStartOperator());
            jsonNames(parts, args, prefix + "cc_names_", filter.ccNames(), filter.ccOperator());
        } else if (!filter.plannedStartFrom().isBlank() || !filter.plannedStartTo().isBlank() || !filter.ccNames().isEmpty()) {
            parts.add("1=0");
        }
        String groupExpression = groupExpression(prefix, ownerColumn, filter.groupBy(), extendedFields);
        if (!filter.groupValue().isBlank()) {
            if (groupExpression == null) parts.add("1=0");
            else { parts.add(groupExpression + "=?"); args.add(filter.groupValue()); }
        }
        return new TaskListPredicate(String.join(" AND ", parts), args.toArray());
    }

    static String groupExpression(String prefix, String ownerColumn, String groupBy, boolean extendedFields) {
        String column = switch (groupBy) {
            case "priority" -> prefix + "priority_";
            case "status" -> prefix + "status_";
            case "owner" -> prefix + ownerColumn;
            case "creator" -> prefix + "creator_name_";
            case "version" -> prefix + "version_name_";
            case "customer" -> prefix + "customer_name_";
            case "requirementType" -> extendedFields ? prefix + "requirement_type_" : null;
            default -> null;
        };
        if (column == null) return null;
        if ("priority".equals(groupBy)) {
            return "CASE " + column + " WHEN 'P0-紧急阻断' THEN '紧急' WHEN 'P1-高优' THEN '高' " +
                "WHEN 'P2-标准' THEN '中' WHEN 'P2-普通' THEN '中' WHEN 'P3-低优' THEN '低' " +
                "ELSE COALESCE(NULLIF(" + column + ",''),'未设置') END";
        }
        String emptyLabel = List.of("version", "customer").contains(groupBy) ? "未关联" : "未设置";
        return "COALESCE(NULLIF(" + column + ",''),'" + emptyLabel + "')";
    }

    private static void equal(List<String> parts, List<Object> args, String column, String value) {
        if (value.isBlank()) return;
        parts.add(column + "=?"); args.add(value);
    }

    private static void text(List<String> parts, List<Object> args, String column, String value, String operator) {
        if (value.isBlank()) return;
        parts.add(column + ("exclude".equals(operator) ? " NOT LIKE ?" : " LIKE ?"));
        args.add("%" + value + "%");
    }

    private static void multi(List<String> parts, List<Object> args, String column, List<String> values, String operator) {
        if (values.isEmpty()) return;
        String placeholders = String.join(",", java.util.Collections.nCopies(values.size(), "?"));
        parts.add(column + ("exclude".equals(operator) ? " NOT IN (" : " IN (") + placeholders + ")");
        args.addAll(values);
    }

    private static void date(List<String> parts, List<Object> args, String column, String from, String to, String operator) {
        if (from.isBlank() && to.isBlank()) return;
        switch (operator) {
            case "equals" -> { if (!from.isBlank()) { parts.add("DATE(" + column + ")=?"); args.add(from); } }
            case "after" -> { if (!from.isBlank()) { parts.add("DATE(" + column + ")>?"); args.add(from); } }
            case "before" -> { if (!from.isBlank()) { parts.add("DATE(" + column + ")<?"); args.add(from); } }
            default -> {
                String start = from;
                String end = to;
                if (!start.isBlank() && !end.isBlank() && start.compareTo(end) > 0) { String swap = start; start = end; end = swap; }
                if (!start.isBlank()) { parts.add("DATE(" + column + ")>=?"); args.add(start); }
                if (!end.isBlank()) { parts.add("DATE(" + column + ")<=?"); args.add(end); }
            }
        }
    }

    private static void jsonNames(List<String> parts, List<Object> args, String column, List<String> values, String operator) {
        if (values.isEmpty()) return;
        List<String> matches = new ArrayList<>();
        for (String value : values) {
            matches.add("CAST(COALESCE(" + column + ",'[]') AS CHAR) LIKE ?");
            args.add("%\"" + value + "\"%");
        }
        boolean exclude = "exclude".equals(operator);
        parts.add((exclude ? "NOT (" : "(") + String.join(" OR ", matches) + ")");
    }
}

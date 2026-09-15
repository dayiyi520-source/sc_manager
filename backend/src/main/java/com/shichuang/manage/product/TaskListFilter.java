package com.shichuang.manage.product;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

public record TaskListFilter(
    String keyword,
    String productLine,
    String title,
    String titleOperator,
    List<String> searchOwners,
    List<String> statuses,
    String statusOperator,
    List<String> owners,
    String ownerOperator,
    List<String> creators,
    String creatorOperator,
    List<String> customers,
    String customerOperator,
    List<String> versions,
    String versionOperator,
    String createdFrom,
    String createdTo,
    String createdOperator,
    String plannedStartFrom,
    String plannedStartTo,
    String plannedStartOperator,
    List<String> ccNames,
    String ccOperator,
    String groupBy,
    String groupValue
) {
    public static TaskListFilter from(Map<String, String> values) {
        return new TaskListFilter(
            text(values, "keyword"), text(values, "productLine"), text(values, "title"), operator(values, "titleOperator"),
            csv(values, "searchOwners"), csv(values, "statuses"), operator(values, "statusOperator"),
            csv(values, "owners"), operator(values, "ownerOperator"), csv(values, "creators"), operator(values, "creatorOperator"),
            csv(values, "customers"), operator(values, "customerOperator"), csv(values, "versions"), operator(values, "versionOperator"),
            text(values, "createdFrom"), text(values, "createdTo"), dateOperator(values, "createdOperator"),
            text(values, "plannedStartFrom"), text(values, "plannedStartTo"), dateOperator(values, "plannedStartOperator"),
            csv(values, "ccNames"), operator(values, "ccOperator"), groupBy(values), text(values, "groupValue")
        );
    }

    TaskListFilter withoutGroupValue() {
        return new TaskListFilter(keyword, productLine, title, titleOperator, searchOwners, statuses, statusOperator,
            owners, ownerOperator, creators, creatorOperator, customers, customerOperator, versions, versionOperator,
            createdFrom, createdTo, createdOperator, plannedStartFrom, plannedStartTo, plannedStartOperator,
            ccNames, ccOperator, groupBy, "");
    }

    public static TaskListFilter basic(String keyword, String productLine, String status, String ownerName) {
        return from(Map.of(
            "keyword", safe(keyword), "productLine", safe(productLine), "statuses", safe(status), "owners", safe(ownerName)
        ));
    }

    private static List<String> csv(Map<String, String> values, String key) {
        String legacyKey = "statuses".equals(key) ? "status" : "owners".equals(key) ? "ownerName" : key;
        String raw = text(values, key);
        if (raw.isBlank()) raw = text(values, legacyKey);
        return Arrays.stream(raw.split(","))
            .map(String::trim).filter(value -> !value.isEmpty()).distinct().limit(50).toList();
    }

    private static String groupBy(Map<String, String> values) {
        String value = text(values, "groupBy");
        return List.of("priority", "status", "owner", "creator", "version", "customer", "requirementType").contains(value) ? value : "";
    }

    private static String operator(Map<String, String> values, String key) {
        return "exclude".equalsIgnoreCase(text(values, key)) ? "exclude" : "include";
    }

    private static String dateOperator(Map<String, String> values, String key) {
        String value = text(values, key);
        return List.of("equals", "after", "before", "between").contains(value) ? value : "between";
    }

    private static String text(Map<String, String> values, String key) {
        return safe(values.get(key));
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }
}

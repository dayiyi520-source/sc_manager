package com.shichuang.manage.product;

import java.util.List;

public final class VersionTestReportDefinition {
    private VersionTestReportDefinition() {}

    public record SaveReport(String name, String reportType, List<String> testPlanIds, String summary, Integer revision) {}
}
